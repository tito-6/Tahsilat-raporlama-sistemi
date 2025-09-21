from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple, Union

from api.models.database import Payment, ExchangeRate
from api.utils.currency_conversion import convert_tl_to_usd


async def save_payment(db: Session, payment_data: Dict[str, Any]) -> Payment:
    """
    Saves a payment record to the database.
    
    Args:
        db: SQLAlchemy database session
        payment_data: Dictionary containing payment data
        
    Returns:
        The created Payment object
    """
    # Convert TL to USD
    amount_tl = payment_data['amount_tl']
    payment_date = payment_data['payment_date']
    
    amount_usd, exchange_rate = convert_tl_to_usd(amount_tl, payment_date, db)
    
    # Create new payment object
    payment = Payment(
        payment_date=payment_date,
        payment_time=payment_data.get('payment_time'),
        customer_name=payment_data['customer_name'],
        property_id=payment_data['property_id'],
        property_name=payment_data.get('property_name'),
        payment_channel=payment_data['payment_channel'],
        amount_tl=amount_tl,
        amount_usd=amount_usd,
        exchange_rate=exchange_rate,
        invoice_number=payment_data.get('invoice_number'),
        notes=payment_data.get('notes')
    )
    
    # Save to database
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return payment


async def save_bulk_payments(db: Session, payment_data_list: List[Dict[str, Any]]) -> Tuple[int, List[str]]:
    """
    Saves multiple payment records to the database.
    
    Args:
        db: SQLAlchemy database session
        payment_data_list: List of dictionaries containing payment data
        
    Returns:
        Tuple of (number of records saved, list of error messages)
    """
    saved_count = 0
    errors = []
    
    for idx, payment_data in enumerate(payment_data_list):
        try:
            await save_payment(db, payment_data)
            saved_count += 1
        except Exception as e:
            errors.append(f"Error saving record {idx+1}: {str(e)}")
    
    return saved_count, errors


async def get_payments(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None,
    customer_name: Optional[str] = None,
    property_id: Optional[str] = None,
    payment_channel: Optional[str] = None
) -> List[Payment]:
    """
    Retrieves payment records with optional filtering.
    
    Args:
        db: SQLAlchemy database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        customer_name: Optional customer name for filtering
        property_id: Optional property ID for filtering
        payment_channel: Optional payment channel for filtering
        
    Returns:
        List of Payment objects
    """
    query = db.query(Payment)
    
    # Apply filters if provided
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)
    if customer_name:
        query = query.filter(Payment.customer_name.ilike(f"%{customer_name}%"))
    if property_id:
        query = query.filter(Payment.property_id == property_id)
    if payment_channel:
        query = query.filter(Payment.payment_channel == payment_channel)
    
    # Apply pagination and order by payment date (newest first)
    return query.order_by(Payment.payment_date.desc(), Payment.id.desc()).offset(skip).limit(limit).all()


async def get_payment_by_id(db: Session, payment_id: int) -> Optional[Payment]:
    """
    Retrieves a payment record by its ID.
    
    Args:
        db: SQLAlchemy database session
        payment_id: The ID of the payment to retrieve
        
    Returns:
        Payment object or None if not found
    """
    return db.query(Payment).filter(Payment.id == payment_id).first()


async def update_payment(db: Session, payment_id: int, payment_data: Dict[str, Any]) -> Optional[Payment]:
    """
    Updates an existing payment record.
    
    Args:
        db: SQLAlchemy database session
        payment_id: The ID of the payment to update
        payment_data: Dictionary containing the updated payment data
        
    Returns:
        Updated Payment object or None if not found
    """
    payment = await get_payment_by_id(db, payment_id)
    if not payment:
        return None
    
    # Update fields if provided in the payload
    for field, value in payment_data.items():
        if hasattr(payment, field) and field != 'id':
            setattr(payment, field, value)
    
    # Recalculate USD amount if TL amount or date changed
    if 'amount_tl' in payment_data or 'payment_date' in payment_data:
        amount_usd, exchange_rate = convert_tl_to_usd(payment.amount_tl, payment.payment_date, db)
        payment.amount_usd = amount_usd
        payment.exchange_rate = exchange_rate
    
    payment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(payment)
    
    return payment


async def delete_payment(db: Session, payment_id: int) -> bool:
    """
    Deletes a payment record.
    
    Args:
        db: SQLAlchemy database session
        payment_id: The ID of the payment to delete
        
    Returns:
        True if payment was deleted, False if not found
    """
    payment = await get_payment_by_id(db, payment_id)
    if not payment:
        return False
    
    db.delete(payment)
    db.commit()
    
    return True


async def get_daily_totals(db: Session, start_date: date, end_date: date) -> List[Dict[str, Any]]:
    """
    Gets daily payment totals in USD.
    
    Args:
        db: SQLAlchemy database session
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        List of daily total dictionaries
    """
    daily_totals = db.query(
        Payment.payment_date,
        func.sum(Payment.amount_tl).label('total_tl'),
        func.sum(Payment.amount_usd).label('total_usd'),
        func.count(Payment.id).label('payment_count')
    ).filter(
        and_(
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        )
    ).group_by(
        Payment.payment_date
    ).order_by(
        Payment.payment_date
    ).all()
    
    result = []
    for row in daily_totals:
        result.append({
            'date': row.payment_date.isoformat(),
            'total_tl': float(row.total_tl),
            'total_usd': float(row.total_usd),
            'payment_count': row.payment_count
        })
    
    return result


async def get_channel_summary(db: Session, start_date: date, end_date: date) -> List[Dict[str, Any]]:
    """
    Gets payment channel summary.
    
    Args:
        db: SQLAlchemy database session
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        List of channel summary dictionaries
    """
    channel_summary = db.query(
        Payment.payment_channel,
        func.sum(Payment.amount_tl).label('total_tl'),
        func.sum(Payment.amount_usd).label('total_usd'),
        func.count(Payment.id).label('payment_count')
    ).filter(
        and_(
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        )
    ).group_by(
        Payment.payment_channel
    ).order_by(
        func.sum(Payment.amount_usd).desc()
    ).all()
    
    result = []
    for row in channel_summary:
        result.append({
            'payment_channel': row.payment_channel,
            'total_tl': float(row.total_tl),
            'total_usd': float(row.total_usd),
            'payment_count': row.payment_count
        })
    
    return result


async def get_monthly_summary(db: Session, year: int) -> List[Dict[str, Any]]:
    """
    Gets monthly payment summary for a specific year.
    
    Args:
        db: SQLAlchemy database session
        year: The year for the report
        
    Returns:
        List of monthly summary dictionaries
    """
    monthly_summary = db.query(
        extract('month', Payment.payment_date).label('month'),
        func.sum(Payment.amount_tl).label('total_tl'),
        func.sum(Payment.amount_usd).label('total_usd'),
        func.count(Payment.id).label('payment_count')
    ).filter(
        extract('year', Payment.payment_date) == year
    ).group_by(
        extract('month', Payment.payment_date)
    ).order_by(
        extract('month', Payment.payment_date)
    ).all()
    
    result = []
    for row in monthly_summary:
        month_date = date(year, int(row.month), 1)
        result.append({
            'month': month_date.strftime('%B'),  # Month name
            'month_num': int(row.month),
            'total_tl': float(row.total_tl),
            'total_usd': float(row.total_usd),
            'payment_count': row.payment_count
        })
    
    return result