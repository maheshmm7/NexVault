from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.services import analytics_service

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_dashboard_summary(db=db, user_id=current_user.id, tz_name=timezone)


@router.get("/category-distribution")
def get_category_distribution(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_category_distribution(db=db, user_id=current_user.id, tz_name=timezone)


@router.get("/trends")
def get_spending_trends(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_spending_trends(db=db, user_id=current_user.id, tz_name=timezone)


# ─── Phase 2 Routes ───────────────────────────────────────────────────────────

@router.get("/bills")
def get_bills(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_bills(db=db, user_id=current_user.id, tz_name=timezone)


@router.get("/insights")
def get_insights(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_insights(db=db, user_id=current_user.id, tz_name=timezone)


@router.get("/monthly-comparison")
def get_monthly_comparison(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_monthly_comparison(db=db, user_id=current_user.id, tz_name=timezone)


@router.get("/category-trends")
def get_category_trends(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_category_trends(db=db, user_id=current_user.id, tz_name=timezone)


@router.get("/credit-utilization")
def get_credit_utilization(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_credit_utilization(db=db, user_id=current_user.id, tz_name=timezone)

@router.get("/emi-analytics")
def get_emi_analytics(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    timezone: str = Depends(deps.get_user_timezone)
):
    return analytics_service.get_emi_analytics(db=db, user_id=current_user.id, tz_name=timezone)
