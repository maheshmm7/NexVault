from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.notification import Notification
from pydantic import BaseModel

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"

@router.post("")
def create_notification(
    notification_in: NotificationCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    existing = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.title == notification_in.title,
        Notification.is_read == False
    ).first()
    if existing:
        return {"message": "Notification already exists."}

    n = Notification(
        user_id=current_user.id,
        title=notification_in.title,
        message=notification_in.message,
        type=notification_in.type
    )
    db.add(n)
    db.commit()
    return {"message": "Notification created successfully."}

@router.get("")
def list_notifications(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at
        }
        for n in notifications
    ]

@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read."}

@router.put("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).all()
    
    for n in notifications:
        n.is_read = True
        
    db.commit()
    return {"message": "All notifications marked as read."}

@router.delete("")
def delete_all_notifications(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()
    return {"message": "All notifications deleted."}
