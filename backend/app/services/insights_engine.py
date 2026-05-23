from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from app.models.source import PaymentSource
from app.models.credit_pool import CreditPool
from app.models.emi_obligation import EMIObligation
from app.models.transaction import Transaction
from app.utils.billing import calculate_billing_cycle


INSIGHT_THRESHOLDS = {
    "shared_utilization_warning": 0.70,
    "shared_utilization_critical": 0.85,
    "shared_utilization_exhaustion": 0.95,
    "card_utilization_warning": 0.70,
    "card_utilization_critical": 0.85,
    "card_utilization_exhaustion": 0.95,
    "emi_burden_warning": 0.30,  # 30% of monthly income
    "emi_burden_critical": 0.50, # 50% of monthly income
    "low_spendable_amount": 5000.00, # e.g. less than 5K absolute
    "low_spendable_ratio": 0.10 # e.g. less than 10% of total limit
}

def _get_monthly_income(db: Session, user_id: str, tz_name: str) -> float:
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    
    local_now = datetime.now(tz)
    this_month_start = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_utc = this_month_start.astimezone(timezone.utc)
    
    result = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "income",
        Transaction.timestamp >= start_utc
    ).scalar()
    
    return float(result or 0)


def generate_insights(db: Session, user_id: str, tz_name: str = "UTC") -> list:
    insights = []
    
    # Pre-fetch data
    cards = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id, 
        PaymentSource.type == "credit_card"
    ).all()
    
    pools = db.query(CreditPool).filter(
        CreditPool.user_id == user_id
    ).all()
    
    active_emis = db.query(EMIObligation).filter(
        EMIObligation.user_id == user_id,
        EMIObligation.emi_status == "active"
    ).all()
    
    monthly_income = _get_monthly_income(db, user_id, tz_name)
    
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    today = datetime.now(tz).date()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. SHARED EXPOSURE STRESS
    for pool in pools:
        total = float(pool.total_limit or 1)
        utilized = float(pool.utilized_limit or 0)
        util_ratio = utilized / total if total > 0 else 0
        
        pool_display_name = pool.name if pool.pool_type != "implicit" else "Implicit Shared Group"
        
        if util_ratio >= INSIGHT_THRESHOLDS["shared_utilization_exhaustion"]:
            insights.append({
                "type": "alert",
                "severity": "critical",
                "category": "credit_utilization",
                "title": "Critical Shared Exposure Exhaustion",
                "message": f"Your {pool_display_name} shared utilization is near exhaustion ({int(util_ratio*100)}%).",
                "related_entity_id": pool.id,
                "timestamp": now_iso,
                "actionable": True
            })
        elif util_ratio >= INSIGHT_THRESHOLDS["shared_utilization_critical"]:
            insights.append({
                "type": "alert",
                "severity": "critical",
                "category": "credit_utilization",
                "title": "Critical Shared Exposure",
                "message": f"Your {pool_display_name} shared utilization exceeded {int(INSIGHT_THRESHOLDS['shared_utilization_critical']*100)}%. Immediate action recommended.",
                "related_entity_id": pool.id,
                "timestamp": now_iso,
                "actionable": True
            })
        elif util_ratio >= INSIGHT_THRESHOLDS["shared_utilization_warning"]:
            insights.append({
                "type": "warning",
                "severity": "warning",
                "category": "credit_utilization",
                "title": "High Shared Exposure Utilization",
                "message": f"Your {pool_display_name} shared utilization exceeded {int(INSIGHT_THRESHOLDS['shared_utilization_warning']*100)}%.",
                "related_entity_id": pool.id,
                "timestamp": now_iso,
                "actionable": True
            })

    # 2. CARD STRESS & BILLING INTELLIGENCE & LOW SPENDABLE
    for card in cards:
        credit_limit = float(card.credit_limit or 0)
        ceiling = float(card.card_ceiling_limit or credit_limit or 1)
        used = float(card.card_outstanding or 0)
        avail = max(0.0, ceiling - used)
        util_ratio = used / ceiling if ceiling > 0 else 0
        
        # Card Utilization Insight
        if util_ratio >= INSIGHT_THRESHOLDS["card_utilization_exhaustion"]:
            insights.append({
                "type": "alert",
                "severity": "critical",
                "category": "card_utilization",
                "title": "Card Operational Ceiling Exhausted",
                "message": f"{card.name} operational ceiling is nearly exhausted ({int(util_ratio*100)}%).",
                "related_entity_id": card.id,
                "timestamp": now_iso,
                "actionable": True
            })
        elif util_ratio >= INSIGHT_THRESHOLDS["card_utilization_critical"]:
            insights.append({
                "type": "alert",
                "severity": "critical",
                "category": "card_utilization",
                "title": "Card Utilization Critical",
                "message": f"{card.name} utilization has exceeded {int(INSIGHT_THRESHOLDS['card_utilization_critical']*100)}%.",
                "related_entity_id": card.id,
                "timestamp": now_iso,
                "actionable": True
            })
        elif util_ratio >= INSIGHT_THRESHOLDS["card_utilization_warning"]:
            insights.append({
                "type": "warning",
                "severity": "warning",
                "category": "card_utilization",
                "title": "Card Approaching Threshold",
                "message": f"{card.name} utilization is approaching billing threshold (over {int(INSIGHT_THRESHOLDS['card_utilization_warning']*100)}%).",
                "related_entity_id": card.id,
                "timestamp": now_iso,
                "actionable": True
            })
            
        # Billing Intelligence (Overdue Warning)
        statement_day = card.statement_day or 1
        due_day = card.due_day or 20
        cycle = calculate_billing_cycle(today, statement_day, due_day, Decimal(str(used)))
        
        if cycle["is_overdue"] and used > 0:
            severity = "critical" if cycle["days_past_due"] > 30 else "warning"
            insights.append({
                "type": "alert",
                "severity": severity,
                "category": "overdue_billing",
                "title": "Overdue Payable Cycle",
                "message": f"You have an overdue active payable cycle on {card.name}. Missed payment on {cycle['active_due_date']}.",
                "related_entity_id": card.id,
                "timestamp": now_iso,
                "actionable": True
            })
            
        # Low Spendable Warning
        actual_spendable = avail
        if card.credit_pool_id or card.shared_group_id:
            pool_id = card.credit_pool_id or card.shared_group_id
            pool = next((p for p in pools if p.id == pool_id), None)
            if pool:
                pool_avail = float(pool.available_limit or 0)
                actual_spendable = min(avail, pool_avail)
                
        spendable_ratio = actual_spendable / ceiling if ceiling > 0 else 0
        if actual_spendable < INSIGHT_THRESHOLDS["low_spendable_amount"] or spendable_ratio < INSIGHT_THRESHOLDS["low_spendable_ratio"]:
            insights.append({
                "type": "warning",
                "severity": "warning",
                "category": "liquidity_warning",
                "title": "Low Spendable Credit",
                "message": f"Your remaining spendable credit on {card.name} is critically low (₹{actual_spendable:.2f}).",
                "related_entity_id": card.id,
                "timestamp": now_iso,
                "actionable": True
            })

    # 3. EMI STRESS
    if active_emis:
        total_monthly_emi = sum(float(emi.monthly_emi) for emi in active_emis)
        if monthly_income > 0:
            emi_ratio = total_monthly_emi / monthly_income
            
            if emi_ratio >= INSIGHT_THRESHOLDS["emi_burden_critical"]:
                insights.append({
                    "type": "alert",
                    "severity": "critical",
                    "category": "emi_stress",
                    "title": "Critical EMI Burden",
                    "message": f"Your monthly EMI burden ({int(emi_ratio*100)}% of income) exceeds safe financial thresholds.",
                    "related_entity_id": "emi_aggregate",
                    "timestamp": now_iso,
                    "actionable": True
                })
            elif emi_ratio >= INSIGHT_THRESHOLDS["emi_burden_warning"]:
                insights.append({
                    "type": "warning",
                    "severity": "warning",
                    "category": "emi_stress",
                    "title": "Elevated EMI Burden",
                    "message": f"Your monthly EMI obligations are consuming {int(emi_ratio*100)}% of your income.",
                    "related_entity_id": "emi_aggregate",
                    "timestamp": now_iso,
                    "actionable": True
                })

    return insights
