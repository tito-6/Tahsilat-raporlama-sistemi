from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import calendar
import pandas as pd

from api.utils.data_storage import get_daily_totals, get_channel_summary, get_monthly_summary, get_payments


async def generate_daily_report(db: Session, start_date: date, end_date: date) -> Dict[str, Any]:
    """
    Generates a daily USD payment report.
    
    Args:
        db: SQLAlchemy database session
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        A dictionary containing the report data
    """
    daily_totals = await get_daily_totals(db, start_date, end_date)
    
    # Calculate overall summary
    total_usd = sum(day['total_usd'] for day in daily_totals)
    total_tl = sum(day['total_tl'] for day in daily_totals)
    total_count = sum(day['payment_count'] for day in daily_totals)
    avg_usd_per_day = total_usd / len(daily_totals) if daily_totals else 0
    
    return {
        "report_name": "Daily USD Payment Report",
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": (end_date - start_date).days + 1
        },
        "data": daily_totals,
        "summary": {
            "total_usd": total_usd,
            "total_tl": total_tl,
            "total_count": total_count,
            "average_usd_per_day": avg_usd_per_day
        }
    }


async def generate_weekly_report(db: Session, start_date: date, end_date: date) -> Dict[str, Any]:
    """
    Generates a weekly summary report.
    
    Args:
        db: SQLAlchemy database session
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        A dictionary containing the report data
    """
    # Get daily data
    daily_totals = await get_daily_totals(db, start_date, end_date)
    
    # Group by ISO week
    df = pd.DataFrame(daily_totals)
    if df.empty:
        return {
            "report_name": "Weekly Summary Report",
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days + 1
            },
            "data": [],
            "summary": {
                "total_usd": 0,
                "total_tl": 0,
                "total_count": 0,
                "week_count": 0
            }
        }
    
    # Convert date string to datetime
    df['date'] = pd.to_datetime(df['date'])
    
    # Extract year and week number
    df['year'] = df['date'].dt.isocalendar().year
    df['week'] = df['date'].dt.isocalendar().week
    
    # Group by year and week
    weekly_data = df.groupby(['year', 'week']).agg({
        'total_usd': 'sum',
        'total_tl': 'sum',
        'payment_count': 'sum',
        'date': ['min', 'max']
    }).reset_index()
    
    # Format the result
    result = []
    for _, row in weekly_data.iterrows():
        result.append({
            'year': int(row['year']),
            'week': int(row['week']),
            'start_date': row[('date', 'min')].date().isoformat(),
            'end_date': row[('date', 'max')].date().isoformat(),
            'total_usd': float(row[('total_usd', 'sum')]),
            'total_tl': float(row[('total_tl', 'sum')]),
            'payment_count': int(row[('payment_count', 'sum')])
        })
    
    # Calculate overall summary
    total_usd = sum(week['total_usd'] for week in result)
    total_tl = sum(week['total_tl'] for week in result)
    total_count = sum(week['payment_count'] for week in result)
    
    return {
        "report_name": "Weekly Summary Report",
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": (end_date - start_date).days + 1
        },
        "data": result,
        "summary": {
            "total_usd": total_usd,
            "total_tl": total_tl,
            "total_count": total_count,
            "week_count": len(result)
        }
    }


async def generate_monthly_channel_report(db: Session, year: int, month: int) -> Dict[str, Any]:
    """
    Generates a monthly payment channel report.
    
    Args:
        db: SQLAlchemy database session
        year: The year for the report
        month: The month for the report
        
    Returns:
        A dictionary containing the report data
    """
    # Calculate start and end dates for the month
    _, last_day = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    
    # Get channel summary
    channel_data = await get_channel_summary(db, start_date, end_date)
    
    # Calculate overall summary
    total_usd = sum(channel['total_usd'] for channel in channel_data)
    total_tl = sum(channel['total_tl'] for channel in channel_data)
    total_count = sum(channel['payment_count'] for channel in channel_data)
    
    # Calculate percentage of each channel
    for channel in channel_data:
        channel['percentage'] = round((channel['total_usd'] / total_usd * 100) if total_usd else 0, 2)
    
    return {
        "report_name": "Monthly Payment Channel Report",
        "date_range": {
            "year": year,
            "month": month,
            "month_name": start_date.strftime("%B"),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "data": channel_data,
        "summary": {
            "total_usd": total_usd,
            "total_tl": total_tl,
            "total_count": total_count,
            "channel_count": len(channel_data)
        }
    }


async def generate_yearly_summary(db: Session, year: int) -> Dict[str, Any]:
    """
    Generates a yearly summary report.
    
    Args:
        db: SQLAlchemy database session
        year: The year for the report
        
    Returns:
        A dictionary containing the report data
    """
    # Get monthly summary
    monthly_data = await get_monthly_summary(db, year)
    
    # Calculate overall summary
    total_usd = sum(month['total_usd'] for month in monthly_data)
    total_tl = sum(month['total_tl'] for month in monthly_data)
    total_count = sum(month['payment_count'] for month in monthly_data)
    avg_usd_per_month = total_usd / 12 if monthly_data else 0
    
    return {
        "report_name": "Yearly Summary Report",
        "date_range": {
            "year": year,
            "start_date": date(year, 1, 1).isoformat(),
            "end_date": date(year, 12, 31).isoformat()
        },
        "data": monthly_data,
        "summary": {
            "total_usd": total_usd,
            "total_tl": total_tl,
            "total_count": total_count,
            "average_usd_per_month": avg_usd_per_month
        }
    }


async def generate_property_report(db: Session, property_id: str, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
    """
    Generates a report for a specific property.
    
    Args:
        db: SQLAlchemy database session
        property_id: The property ID to report on
        start_date: Optional start date for the report
        end_date: Optional end date for the report
        
    Returns:
        A dictionary containing the report data
    """
    # Default to all-time if dates not provided
    if not start_date:
        start_date = date(2000, 1, 1)  # A date far in the past
    if not end_date:
        end_date = date.today()
    
    # Get payments for the property
    payments = await get_payments(
        db, 
        skip=0, 
        limit=1000, 
        start_date=start_date, 
        end_date=end_date,
        property_id=property_id
    )
    
    payment_data = [payment.to_dict() for payment in payments]
    
    # Calculate summary
    total_usd = sum(payment['amount_usd'] for payment in payment_data)
    total_tl = sum(payment['amount_tl'] for payment in payment_data)
    payment_count = len(payment_data)
    
    # Get property name from first payment (if available)
    property_name = payments[0].property_name if payments else "Unknown Property"
    
    return {
        "report_name": "Property Payment Report",
        "property_info": {
            "property_id": property_id,
            "property_name": property_name
        },
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": (end_date - start_date).days + 1
        },
        "data": payment_data,
        "summary": {
            "total_usd": total_usd,
            "total_tl": total_tl,
            "payment_count": payment_count
        }
    }


async def generate_customer_report(db: Session, customer_name: str, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
    """
    Generates a report for a specific customer.
    
    Args:
        db: SQLAlchemy database session
        customer_name: The customer name to search for
        start_date: Optional start date for the report
        end_date: Optional end date for the report
        
    Returns:
        A dictionary containing the report data
    """
    # Default to all-time if dates not provided
    if not start_date:
        start_date = date(2000, 1, 1)  # A date far in the past
    if not end_date:
        end_date = date.today()
    
    # Get payments for the customer
    payments = await get_payments(
        db, 
        skip=0, 
        limit=1000, 
        start_date=start_date, 
        end_date=end_date,
        customer_name=customer_name
    )
    
    payment_data = [payment.to_dict() for payment in payments]
    
    # Calculate summary
    total_usd = sum(payment['amount_usd'] for payment in payment_data)
    total_tl = sum(payment['amount_tl'] for payment in payment_data)
    payment_count = len(payment_data)
    
    return {
        "report_name": "Customer Payment Report",
        "customer_info": {
            "customer_name": customer_name
        },
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": (end_date - start_date).days + 1
        },
        "data": payment_data,
        "summary": {
            "total_usd": total_usd,
            "total_tl": total_tl,
            "payment_count": payment_count
        }
    }