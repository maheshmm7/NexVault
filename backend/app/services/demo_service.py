from sqlalchemy.orm import Session


def cleanup_demo_data_if_needed(db: Session, user_id: str):
    """
    Checks if the user has any demo records (is_demo == True).
    If they do, deletes all of them (payment sources, transactions, coupons)
    belonging to that user.
    """
    from app.models.transaction import Transaction
    from app.models.source import PaymentSource
    from app.models.coupon import Coupon

    # Check if there is any demo payment source
    has_demo = db.query(PaymentSource).filter(
        PaymentSource.user_id == user_id,
        PaymentSource.is_demo == True
    ).first() is not None

    if not has_demo:
        # Check transaction just in case
        has_demo = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.is_demo == True
        ).first() is not None

    if not has_demo:
        # Check coupon just in case
        has_demo = db.query(Coupon).filter(
            Coupon.user_id == user_id,
            Coupon.is_demo == True
        ).first() is not None

    if has_demo:
        # Delete transactions first to avoid constraint issues
        db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.is_demo == True
        ).delete(synchronize_session=False)

        # Delete coupons
        db.query(Coupon).filter(
            Coupon.user_id == user_id,
            Coupon.is_demo == True
        ).delete(synchronize_session=False)

        # Delete payment sources
        db.query(PaymentSource).filter(
            PaymentSource.user_id == user_id,
            PaymentSource.is_demo == True
        ).delete(synchronize_session=False)

        db.commit()
