from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.transaction import Transaction
from app.models.source import PaymentSource
from app.models.category import Category
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from dateutil.relativedelta import relativedelta
from decimal import Decimal


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
            credit_used += float(src.card_outstanding or src.balance or 0)
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
    ).outerjoin(
        Category, Transaction.category_id == Category.id
    ).filter(
        Transaction.user_id == user_id,
        Transaction.timestamp >= first_day_of_month_utc,
        Transaction.type.in_(["income", "expense"]),
        func.coalesce(Category.name, "") != "Repayment"  # Exclude repayment funding
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
        Transaction.timestamp >= first_day_of_month_utc,
        Category.name != "Repayment"  # Exclude repayment funding
    ).group_by(Category.name, Category.color).all()

    return [{"name": r.name, "color": r.color, "value": float(r.total)} for r in results]


def get_spending_trends(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    # Query all user transactions in UTC
    transactions = db.query(Transaction).outerjoin(
        Category, Transaction.category_id == Category.id
    ).filter(
        Transaction.user_id == user_id,
        func.coalesce(Category.name, "") != "Repayment"
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
        
        if tx.type in ("income", "expense"):  # Repayments excluded from spending trends
            trends[day_str][tx.type] += float(tx.amount)

    # Return sorted by date
    return sorted(trends.values(), key=lambda x: x["date"])


def get_bills(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    """Upcoming credit card due dates with billing cycle severity states."""
    from app.utils.billing import calculate_billing_cycle

    sources = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id,
        PaymentSource.type == "credit_card"
    ).all()

    bills = []
    tz = get_zone_info(tz_name)
    today = datetime.now(tz).date()

    for src in sources:
        statement_day = src.statement_day
        due_day_val = src.due_day

        # Fallback: try to extract from legacy string fields
        if not statement_day and src.billing_date:
            try:
                statement_day = datetime.strptime(src.billing_date, "%Y-%m-%d").day
            except Exception:
                pass
        if not due_day_val and src.due_date:
            try:
                due_day_val = datetime.strptime(src.due_date, "%Y-%m-%d").day
            except Exception:
                pass

        if not statement_day and not due_day_val:
            continue

        try:
            # Phase E: Pass outstanding amount to resolve is_settled automatically
            credit_limit = float(src.card_ceiling_limit or src.credit_limit or 0)
            used = float(src.card_outstanding or src.balance or 0)
            utilization = round((used / credit_limit * 100), 1) if credit_limit else 0

            cycle = calculate_billing_cycle(today, statement_day or 1, due_day_val or 20, Decimal(str(used)))

            bills.append({
                "id": src.id,
                "name": src.name,
                "type": "credit_card",
                "next_due": str(cycle["active_due_date"]),
                "days_until_due": cycle["days_until_due"],
                "amount_due": used,
                "status": cycle["billing_state"],
                "utilization": utilization,
                "network": src.network,
                "statement_cycle": f"{cycle['active_statement_date']} to {cycle['next_statement_date']}",
                "next_statement_date": str(cycle["next_statement_date"]),
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
        result = db.query(func.sum(Transaction.amount)).outerjoin(
            Category, Transaction.category_id == Category.id
        ).filter(
            Transaction.user_id == user_id,
            Transaction.type == type_,
            Transaction.timestamp >= start,
            Transaction.timestamp < end,
            func.coalesce(Category.name, "") != "Repayment"
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
        Category.name != "Repayment"
    ).group_by(Category.name, Category.color).order_by(func.sum(Transaction.amount).desc()).first()

    cards = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id,
        PaymentSource.type == "credit_card"
    ).all()
    utilizations = []
    for c in cards:
        limit = float(c.card_ceiling_limit or c.credit_limit or 0)
        outstanding = float(c.card_outstanding or c.balance or 0)
        if limit > 0:
            utilizations.append(outstanding / limit * 100)
    avg_credit_utilization = round(sum(utilizations) / len(utilizations), 1) if utilizations else 0.0

    savings_rate = round(((this_income - this_expense) / this_income * 100), 1) if this_income > 0 else 0.0

    from app.services.insights_engine import generate_insights
    alerts = generate_insights(db, user_id, tz_name)

    return {
        "month_over_month_change": mom_change,
        "this_month_expense": this_expense,
        "last_month_expense": last_expense,
        "this_month_income": this_income,
        "top_category": {"name": top_cat.name, "color": top_cat.color, "total": float(top_cat.total)} if top_cat else None,
        "avg_credit_utilization": avg_credit_utilization,
        "savings_rate": savings_rate,
        "alerts": alerts,
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
        ).outerjoin(
            Category, Transaction.category_id == Category.id
        ).filter(
            Transaction.user_id == user_id,
            Transaction.timestamp >= start_utc,
            Transaction.timestamp < end_utc,
            Transaction.type.in_(["income", "expense"]),
            func.coalesce(Category.name, "") != "Repayment"
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


def get_credit_utilization(db: Session, user_id: str, tz_name: str = "UTC") -> dict:
    """Per-card and shared exposure credit utilization breakdown."""
    from app.models.credit_pool import CreditPool
    
    cards = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id,
        PaymentSource.type == "credit_card"
    ).all()
    
    pools = db.query(CreditPool).filter(
        CreditPool.user_id == user_id
    ).all()

    card_level = []
    for card in cards:
        credit_limit = float(card.credit_limit or 0)
        ceiling = float(card.card_ceiling_limit or credit_limit)
        used = float(card.card_outstanding or 0)
        avail = max(0.0, ceiling - used)
        utilization = round((used / ceiling * 100), 1) if ceiling > 0 else 0.0
        
        actual_spendable = avail
        pool_id = card.credit_pool_id or card.shared_group_id
        if pool_id:
            pool = next((p for p in pools if p.id == pool_id), None)
            if pool:
                pool_avail = float(pool.available_limit or 0)
                actual_spendable = min(avail, pool_avail)
                
        card_level.append({
            "card_name": card.name,
            "card_limit": ceiling,
            "card_outstanding": used,
            "card_remaining": avail,
            "actual_spendable": actual_spendable,
            "utilization_percent": utilization,
            "network": card.network
        })

    shared_exposure_level = []
    for pool in pools:
        total = float(pool.total_limit or 0)
        avail = float(pool.available_limit or 0)
        used = float(pool.utilized_limit or 0)
        utilization = round((used / total * 100), 1) if total > 0 else 0.0
        
        name = pool.name if pool.pool_type != "implicit" else "Implicit Shared Group"
        
        shared_exposure_level.append({
            "shared_group": name,
            "shared_total_limit": total,
            "shared_available_limit": avail,
            "shared_utilized_limit": used,
            "shared_utilization_percent": utilization
        })

    card_level.sort(key=lambda x: x["utilization_percent"], reverse=True)
    shared_exposure_level.sort(key=lambda x: x["shared_utilization_percent"], reverse=True)

    return {
        "card_level": card_level,
        "shared_exposure_level": shared_exposure_level
    }

def get_emi_analytics(db: Session, user_id: str, tz_name: str = "UTC") -> dict:
    from app.models.emi_obligation import EMIObligation
    from app.utils.billing import calculate_billing_cycle
    from decimal import Decimal
    
    tz = get_zone_info(tz_name)
    today = datetime.now(tz).date()
    
    emis = db.query(EMIObligation).filter(
        EMIObligation.user_id == user_id
    ).all()
    
    active_emis = [emi for emi in emis if emi.emi_status == "active"]
    completed_emis = [emi for emi in emis if emi.emi_status == "completed"]
    
    total_outstanding_debt = sum(float(emi.principal_remaining) for emi in active_emis)
    monthly_emi_burden = sum(float(emi.monthly_emi) for emi in active_emis)
    highest_emi_val = max([float(emi.monthly_emi) for emi in active_emis], default=0.0)
    highest_emi_obligation = next(({"name": emi.name, "amount": float(emi.monthly_emi)} for emi in active_emis if float(emi.monthly_emi) == highest_emi_val), None)
    
    from app.services.insights_engine import _get_monthly_income
    monthly_income = _get_monthly_income(db, user_id, tz_name)
    emi_utilization_ratio = (monthly_emi_burden / monthly_income) if monthly_income > 0 else 0.0
    
    # Sort upcoming EMIs by active payable due date
    # In NexVault, EMI doesn't have its own billing cycle directly, it hits the linked card's billing cycle.
    # Wait, EMIObligation might have next_due_date, but the instruction said:
    # "Upcoming EMIs MUST sort using: active payable due, NOT: naive next_due_date string ordering"
    # So we need to look at the linked card's billing cycle.
    
    cards = {c.id: c for c in db.query(PaymentSource).filter(PaymentSource.user_id == user_id, PaymentSource.type == "credit_card").all()}
    
    upcoming_emis = []
    for emi in active_emis:
        card = cards.get(emi.linked_card_id)
        active_due_date = today # fallback
        if card:
            statement_day = card.statement_day or 1
            due_day = card.due_day or 20
            limit = float(card.credit_limit or 1)
            avail = float(card.available_limit or 0)
            used = max(0.0, limit - avail)
            cycle = calculate_billing_cycle(today, statement_day, due_day, Decimal(str(used)))
            active_due_date = cycle["active_due_date"]
        
        upcoming_emis.append({
            "id": emi.id,
            "name": emi.name,
            "principal_remaining": float(emi.principal_remaining),
            "monthly_emi": float(emi.monthly_emi),
            "remaining_months": emi.tenure_months - emi.paid_installments,
            "active_due_date": str(active_due_date),
            "linked_card_name": card.name if card else "Unknown"
        })
        
    upcoming_emis.sort(key=lambda x: x["active_due_date"])
    
    return {
        "total_outstanding_debt": total_outstanding_debt,
        "monthly_emi_burden": monthly_emi_burden,
        "upcoming_emis": upcoming_emis,
        "active_emi_count": len(active_emis),
        "completed_emi_count": len(completed_emis),
        "highest_emi_obligation": highest_emi_obligation,
        "emi_utilization_ratio": emi_utilization_ratio
    }
