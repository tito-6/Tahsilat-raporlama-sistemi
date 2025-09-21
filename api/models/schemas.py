from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class PaymentBase(BaseModel):
    """Base model for payment data"""
    payment_date: date
    payment_time: Optional[str] = None
    customer_name: str
    property_id: str
    property_name: Optional[str] = None
    payment_channel: str
    amount_tl: float
    invoice_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    """Model for creating a new payment (no ID required)"""
    pass


class PaymentResponse(PaymentBase):
    """Model for payment response data (includes ID and calculated fields)"""
    id: int
    amount_usd: float
    exchange_rate: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class ExchangeRateBase(BaseModel):
    """Base model for exchange rate data"""
    date: date
    usd_to_tl: float


class ExchangeRateCreate(ExchangeRateBase):
    """Model for creating a new exchange rate (no ID required)"""
    pass


class ExchangeRateResponse(ExchangeRateBase):
    """Model for exchange rate response data (includes ID)"""
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class ImportResponse(BaseModel):
    """Response model for file import results"""
    success: bool
    message: str
    records_imported: Optional[int] = None
    errors: Optional[List[str]] = None


class DateRangeParams(BaseModel):
    """Parameters for date range based queries"""
    start_date: date
    end_date: date = Field(default_factory=lambda: date.today())


class ReportResponse(BaseModel):
    """Base model for report responses"""
    report_name: str
    date_range: dict
    data: List[dict]
    summary: dict