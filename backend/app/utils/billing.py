from datetime import date, datetime, timedelta
from decimal import Decimal

def get_days_in_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - date(year, month, 1)).days

def clamp_day_to_month(year: int, month: int, day: int) -> date:
    max_days = get_days_in_month(year, month)
    return date(year, month, min(day, max_days))

def add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    return clamp_day_to_month(year, month, d.day)

def calculate_billing_cycle(current_date_or_dt, statement_day: int, due_day: int, outstanding: Decimal = Decimal("0.00")):
    """
    Computes active billing statement details, due dates, and rollover metrics.
    Returns explicit banking lifecycle states.
    """
    if isinstance(current_date_or_dt, datetime):
        current_date = current_date_or_dt.date()
    else:
        current_date = current_date_or_dt

    if not statement_day:
        statement_day = 1
    if not due_day:
        due_day = 20

    current_year = current_date.year
    current_month = current_date.month

    # Candidate statement dates
    s_curr = clamp_day_to_month(current_year, current_month, statement_day)
    
    # Previous month statement date
    prev_year = current_year if current_month > 1 else current_year - 1
    prev_month = current_month - 1 if current_month > 1 else 12
    s_prev = clamp_day_to_month(prev_year, prev_month, statement_day)

    # Next month statement date
    next_year = current_year if current_month < 12 else current_year + 1
    next_month = current_month + 1 if current_month < 12 else 1
    s_next = clamp_day_to_month(next_year, next_month, statement_day)

    # Resolve active cycle statement date
    if current_date >= s_curr:
        s_active = s_curr
        s_next_cycle = s_next
    else:
        s_active = s_prev
        s_next_cycle = s_curr

    # Function to calculate due date for a given statement date
    def calculate_due_date(s_date: date) -> date:
        if due_day < statement_day:
            due_yr = s_date.year if s_date.month < 12 else s_date.year + 1
            due_mth = s_date.month + 1 if s_date.month < 12 else 1
            return clamp_day_to_month(due_yr, due_mth, due_day)
        else:
            return clamp_day_to_month(s_date.year, s_date.month, due_day)

    d_active = calculate_due_date(s_active)
    d_next = calculate_due_date(s_next_cycle)

    # Calculate days remaining
    days_until_due = (d_active - current_date).days

    # Determine status/severity
    is_overdue = current_date > d_active
    days_past_due = (current_date - d_active).days if is_overdue else 0
    is_settled = outstanding <= 0

    # Determine billing state
    if is_settled:
        billing_state = "settled"
    elif is_overdue:
        billing_state = "critical_overdue" if days_past_due >= 30 else "overdue"
    elif days_until_due <= 5:
        billing_state = "due_soon"
    else:
        billing_state = "upcoming"

    return {
        "statement_day": statement_day,
        "due_day": due_day,
        "active_statement_date": s_active,
        "active_due_date": d_active,
        "next_statement_date": s_next_cycle,
        "next_future_due_date": d_next,
        "days_until_due": days_until_due,
        "days_past_due": days_past_due,
        "billing_state": billing_state,
        "is_overdue": is_overdue,
        "is_settled": is_settled
    }
