from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.transaction import Transaction
from app.models.source import PaymentSource
from app.models.category import Category
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from dateutil.relativedelta import relativedelta


def get_zone_info(tz_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return ZoneInfo("UTC")


def get_dashboard_summary(db: Session, user_id: str, tz_name: str = "UTC") -> dict:
    sources = db.query(PaymentSource).filter(PaymentSource.user_id == user_id).all()

    total_balance = 0.0
    credit_used = 0.0
    wallet_balance = 0.0
    cash_balance = 0.0

    for src in sources:
        bal = float(src.balance or 0)
        if src.type == "credit_card":
            limit = float(src.credit_limit or 0) if hasattr(src, "credit_limit") else 0
            avail = float(src.available_limit or 0) if hasattr(src, "available_limit") else 0
            credit_used += max(0.0, limit - avail) if limit else max(0.0, -bal)
        elif src.type == "wallet":
            wallet_balance += bal
            total_balance += bal
        elif src.type == "cash":
            cash_balance += bal
            total_balance += bal
        else:
            total_balance += bal

    tz = get_zone_info(tz_name)
    local_now = datetime.now(tz)
    first_day_of_month = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_day_of_month_utc = first_day_of_month.astimezone(timezone.utc)

    monthly_stats = db.query(
        Transaction.type, func.sum(Transaction.amount)
    ).filter(
        Transaction.user_id == user_id,
        Transaction.timestamp >= first_day_of_month_utc
    ).group_by(Transaction.type).all()

    stats_dict = {t: float(amount) for t, amount in monthly_stats}

    is_demo_active = any(getattr(src, "is_demo", False) for src in sources)

    return {
        "total_balance": total_balance,
        "credit_used": credit_used,
        "wallet_balance": wallet_balance,
        "cash_balance": cash_balance,
        "monthly_income": stats_dict.get("income", 0.0),
        "monthly_expense": stats_dict.get("expense", 0.0),
        "is_demo_active": is_demo_active,
    }


def get_category_distribution(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    tz = get_zone_info(tz_name)
    local_now = datetime.now(tz)
    first_day_of_month = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_day_of_month_utc = first_day_of_month.astimezone(timezone.utc)

    results = db.query(
        Category.name,
        Category.color,
        func.sum(Transaction.amount).label("total"),
    ).join(
        Transaction, Transaction.category_id == Category.id
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        Transaction.timestamp >= first_day_of_month_utc
    ).group_by(Category.name, Category.color).all()

    return [{"name": r.name, "color": r.color, "value": float(r.total)} for r in results]


def get_spending_trends(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    # Query all user transactions in UTC
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).all()

    tz = get_zone_info(tz_name)
    trends: dict = {}
    
    for tx in transactions:
        tx_time = tx.timestamp
        if tx_time.tzinfo is None:
            tx_time = tx_time.replace(tzinfo=timezone.utc)
        
        # Convert UTC timestamp to user local timezone
        local_dt = tx_time.astimezone(tz)
        day_str = local_dt.strftime("%Y-%m-%d")
        
        if day_str not in trends:
            trends[day_str] = {"date": day_str, "income": 0.0, "expense": 0.0}
        
        if tx.type in ("income", "expense"):
            trends[day_str][tx.type] += float(tx.amount)

    # Return sorted by date
    return sorted(trends.values(), key=lambda x: x["date"])


def get_bills(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    """Upcoming credit card due dates with status indicators."""
    sources = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id,
        PaymentSource.type == "credit_card"
    ).all()

    bills = []
    tz = get_zone_info(tz_name)
    today = datetime.now(tz).date()

    for src in sources:
        if not src.due_date:
            continue
        try:
            due_base = datetime.strptime(src.due_date, "%Y-%m-%d").date()
            due_day = due_base.day
            candidate = today.replace(day=min(due_day, 28))
            if candidate < today:
                candidate = (candidate + relativedelta(months=1)).replace(day=min(due_day, 28))

            diff_days = (candidate - today).days
            credit_limit = float(src.credit_limit or 0)
            available = float(src.available_limit or 0)
            used = max(0.0, credit_limit - available)
            utilization = round((used / credit_limit * 100), 1) if credit_limit else 0

            status = "upcoming"
            if diff_days < 0:
                status = "overdue"
            elif diff_days <= 3:
                status = "due_soon"

            bills.append({
                "id": src.id,
                "name": src.name,
                "type": "credit_card",
                "next_due": str(candidate),
                "days_until_due": diff_days,
                "amount_due": used,
                "status": status,
                "utilization": utilization,
                "network": src.network,
            })
        except Exception:
            continue

    bills.sort(key=lambda b: b["days_until_due"])
    return bills


def get_insights(db: Session, user_id: str, tz_name: str = "UTC") -> dict:
    """Smart financial insights: MoM change, top category, credit utilization, savings rate."""
    tz = get_zone_info(tz_name)
    local_now = datetime.now(tz)
    this_month_start = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = this_month_start - relativedelta(months=1)
    
    this_month_start_utc = this_month_start.astimezone(timezone.utc)
    last_month_start_utc = last_month_start.astimezone(timezone.utc)
    local_now_utc = local_now.astimezone(timezone.utc)

    def monthly_total(type_: str, start, end):
        result = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == type_,
            Transaction.timestamp >= start,
            Transaction.timestamp < end,
        ).scalar()
        return float(result or 0)

    this_expense = monthly_total("expense", this_month_start_utc, local_now_utc)
    last_expense  = monthly_total("expense", last_month_start_utc, this_month_start_utc)
    this_income   = monthly_total("income",  this_month_start_utc, local_now_utc)

    mom_change = round(((this_expense - last_expense) / last_expense) * 100, 1) if last_expense > 0 else 0.0

    top_cat = db.query(
        Category.name, Category.color, func.sum(Transaction.amount).label("total")
    ).join(Transaction, Transaction.category_id == Category.id).filter(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        Transaction.timestamp >= this_month_start_utc,
    ).group_by(Category.name, Category.color).order_by(func.sum(Transaction.amount).desc()).first()

    cards = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id,
        PaymentSource.type == "credit_card"
    ).all()
    utilizations = []
    for c in cards:
        limit = float(c.credit_limit or 0)
        avail = float(c.available_limit or 0)
        if limit > 0:
            utilizations.append((limit - avail) / limit * 100)
    avg_credit_utilization = round(sum(utilizations) / len(utilizations), 1) if utilizations else 0.0

    savings_rate = round(((this_income - this_expense) / this_income * 100), 1) if this_income > 0 else 0.0

    return {
        "month_over_month_change": mom_change,
        "this_month_expense": this_expense,
        "last_month_expense": last_expense,
        "this_month_income": this_income,
        "top_category": {"name": top_cat.name, "color": top_cat.color, "total": float(top_cat.total)} if top_cat else None,
        "avg_credit_utilization": avg_credit_utilization,
        "savings_rate": savings_rate,
    }


def get_monthly_comparison(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    """Income vs expense totals for the last 6 calendar months."""
    tz = get_zone_info(tz_name)
    local_now = datetime.now(tz)
    results = []

    for i in range(5, -1, -1):
        local_month_start = (local_now.replace(day=1) - relativedelta(months=i)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        local_month_end = local_month_start + relativedelta(months=1)
        
        start_utc = local_month_start.astimezone(timezone.utc)
        end_utc = local_month_end.astimezone(timezone.utc)

        rows = db.query(
            Transaction.type, func.sum(Transaction.amount)
        ).filter(
            Transaction.user_id == user_id,
            Transaction.timestamp >= start_utc,
            Transaction.timestamp < end_utc,
        ).group_by(Transaction.type).all()

        stats = {t: float(a) for t, a in rows}
        results.append({
            "month": local_month_start.strftime("%b %Y"),
            "income": stats.get("income", 0.0),
            "expense": stats.get("expense", 0.0),
        })

    return results


def get_category_trends(db: Session, user_id: str, tz_name: str = "UTC") -> dict:
    """Top-5 expense categories with monthly totals for the last 3 months."""
    tz = get_zone_info(tz_name)
    local_now = datetime.now(tz)
    
    local_three_months_ago = (local_now.replace(day=1) - relativedelta(months=3)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    three_months_ago_utc = local_three_months_ago.astimezone(timezone.utc)

    top_cats = db.query(
        Category.name, Category.color, func.sum(Transaction.amount).label("total")
    ).join(Transaction, Transaction.category_id == Category.id).filter(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        Transaction.timestamp >= three_months_ago_utc,
    ).group_by(Category.name, Category.color).order_by(
        func.sum(Transaction.amount).desc()
    ).limit(5).all()

    cat_names = [c.name for c in top_cats]

    monthly_data = []
    for i in range(2, -1, -1):
        local_month_start = (local_now.replace(day=1) - relativedelta(months=i)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        local_month_end = local_month_start + relativedelta(months=1)
        
        start_utc = local_month_start.astimezone(timezone.utc)
        end_utc = local_month_end.astimezone(timezone.utc)

        rows = db.query(
            Category.name, func.sum(Transaction.amount).label("total")
        ).join(Transaction, Transaction.category_id == Category.id).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.timestamp >= start_utc,
            Transaction.timestamp < end_utc,
            Category.name.in_(cat_names),
        ).group_by(Category.name).all()

        row_dict = {r.name: float(r.total) for r in rows}
        entry = {"month": local_month_start.strftime("%b %Y")}
        for name in cat_names:
            entry[name] = row_dict.get(name, 0.0)
        monthly_data.append(entry)

    return {
        "months": monthly_data,
        "categories": [{"name": c.name, "color": c.color} for c in top_cats],
    }


def get_credit_utilization(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    """Per-card credit utilization breakdown."""
    cards = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id,
        PaymentSource.type == "credit_card"
    ).all()

    result = []
    for card in cards:
        limit = float(card.credit_limit or 0)
        avail = float(card.available_limit or 0)
        used = max(0.0, limit - avail)
        utilization = round((used / limit * 100), 1) if limit > 0 else 0.0
        result.append({
            "id": card.id,
            "name": card.name,
            "network": card.network,
            "credit_limit": limit,
            "used": used,
            "available": avail,
            "utilization": utilization,
        })

    return sorted(result, key=lambda x: x["utilization"], reverse=True)
