from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import pathlib

# Set up SQLite database path
BASE_DIR = pathlib.Path(__file__).parent.parent.parent
DATABASE_PATH = os.path.join(BASE_DIR, "tahsilat_data.db")
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Create SQLAlchemy engine and session
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base model class
Base = declarative_base()


class Payment(Base):
    """
    Payment model represents a payment record in the system.
    Contains details about the payment, customer, property, and converted currency values.
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_date = Column(Date, nullable=False)
    payment_time = Column(String, nullable=True)  # Optional time of payment
    customer_name = Column(String, nullable=False)
    property_id = Column(String, nullable=False, index=True)
    property_name = Column(String, nullable=True)
    payment_channel = Column(String, nullable=False)  # e.g., Bank Transfer, Cash, Credit Card
    amount_tl = Column(Float, nullable=False)
    amount_usd = Column(Float, nullable=False)  # Converted amount based on exchange rate
    exchange_rate = Column(Float, nullable=False)  # TL to USD exchange rate at payment date
    invoice_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(String, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "payment_time": self.payment_time,
            "customer_name": self.customer_name,
            "property_id": self.property_id,
            "property_name": self.property_name,
            "payment_channel": self.payment_channel,
            "amount_tl": self.amount_tl,
            "amount_usd": self.amount_usd,
            "exchange_rate": self.exchange_rate,
            "invoice_number": self.invoice_number,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "notes": self.notes
        }


class ExchangeRate(Base):
    """
    ExchangeRate model stores historical currency exchange rates from TCMB.
    Used for currency conversion and reporting.
    """
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    usd_to_tl = Column(Float, nullable=False)  # USD to TL exchange rate
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "usd_to_tl": self.usd_to_tl,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# Create the tables in the database
def create_tables():
    Base.metadata.create_all(bind=engine)


# Get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()