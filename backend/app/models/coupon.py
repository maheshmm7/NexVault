import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String, nullable=False)
    _code = Column("code", String, nullable=False)
    _pin = Column("pin", String, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="active")  # 'active', 'used', 'expired'
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)

    @property
    def code(self) -> str:
        from app.services.crypto_service import decrypt_vault_value
        return decrypt_vault_value(self._code)

    @code.setter
    def code(self, value: str):
        from app.services.crypto_service import encrypt_vault_value
        self._code = encrypt_vault_value(value)

    @property
    def pin(self) -> str:
        from app.services.crypto_service import decrypt_vault_value
        if self._pin is None:
            return None
        return decrypt_vault_value(self._pin)

    @pin.setter
    def pin(self, value: str):
        from app.services.crypto_service import encrypt_vault_value
        if value is None:
            self._pin = None
        else:
            self._pin = encrypt_vault_value(value)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
