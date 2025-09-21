import requests
from datetime import date, datetime, timedelta
import os
from typing import Dict, Optional, Union, Tuple
import xml.etree.ElementTree as ET
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TCMB API URLs
TCMB_TODAY_URL = "https://www.tcmb.gov.tr/kurlar/today.xml"
TCMB_ARCHIVE_URL_TEMPLATE = "https://www.tcmb.gov.tr/kurlar/{year}{month}/{day}{month}{year}.xml"

# Cache for exchange rates to reduce API calls
exchange_rate_cache: Dict[str, float] = {}


def get_exchange_rate_from_tcmb(target_date: date) -> Optional[float]:
    """
    Fetches the USD to TL exchange rate from TCMB (Turkish Central Bank) for a given date.
    
    Args:
        target_date: The date for which to fetch the exchange rate
        
    Returns:
        The USD to TL exchange rate as a float, or None if not available
    """
    # Format date for cache key
    date_str = target_date.strftime("%Y-%m-%d")
    
    # Check if the rate is already in cache
    if date_str in exchange_rate_cache:
        return exchange_rate_cache[date_str]
    
    # Determine which URL to use based on whether we're requesting today's rate or historical
    today = date.today()
    url = TCMB_TODAY_URL if target_date == today else _get_tcmb_archive_url(target_date)
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Parse the XML response
        root = ET.fromstring(response.content)
        
        # Find the USD rate
        for currency in root.findall(".//Currency"):
            if currency.get("Kod") == "USD":
                # The buying rate is in the "ForexBuying" element
                forex_buying = currency.find("ForexBuying")
                if forex_buying is not None and forex_buying.text:
                    rate = float(forex_buying.text.replace(',', '.'))
                    
                    # Cache the result
                    exchange_rate_cache[date_str] = rate
                    return rate
        
        logger.warning(f"USD rate not found in TCMB data for {date_str}")
        return None
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching exchange rate from TCMB for {date_str}: {str(e)}")
        return None
    except (ET.ParseError, ValueError) as e:
        logger.error(f"Error parsing TCMB data for {date_str}: {str(e)}")
        return None


def _get_tcmb_archive_url(target_date: date) -> str:
    """
    Generates the TCMB archive URL for a specific date.
    
    Args:
        target_date: The date for which to generate the URL
        
    Returns:
        The URL string for the TCMB archive
    """
    # Format the date components for the URL
    day = target_date.strftime("%d")
    month = target_date.strftime("%m")
    year = target_date.strftime("%Y")
    
    return TCMB_ARCHIVE_URL_TEMPLATE.format(day=day, month=month, year=year)


def get_previous_business_day(from_date: date) -> date:
    """
    Gets the previous business day (excluding weekends) from a given date.
    
    Args:
        from_date: The starting date
        
    Returns:
        The previous business day
    """
    # Start with the day before
    prev_day = from_date - timedelta(days=1)
    
    # Skip weekends (6=Saturday, 0=Sunday)
    while prev_day.weekday() >= 5:
        prev_day -= timedelta(days=1)
        
    return prev_day


def get_exchange_rate_with_fallback(target_date: date, db_session=None) -> Tuple[float, date]:
    """
    Gets the exchange rate for a target date with fallback to previous days if not available.
    Also checks the database if a db_session is provided.
    
    Args:
        target_date: The date for which to get the exchange rate
        db_session: Optional SQLAlchemy session for database lookup
        
    Returns:
        Tuple of (exchange rate, actual date used)
    """
    # Try to get from the database first if session provided
    if db_session:
        from api.models.database import ExchangeRate
        
        db_rate = db_session.query(ExchangeRate).filter(
            ExchangeRate.date == target_date
        ).first()
        
        if db_rate:
            return db_rate.usd_to_tl, target_date
    
    # Try to get the rate for the target date
    rate = get_exchange_rate_from_tcmb(target_date)
    
    # If not available, try previous business days (up to 5 attempts)
    current_date = target_date
    attempts = 0
    
    while rate is None and attempts < 5:
        current_date = get_previous_business_day(current_date)
        rate = get_exchange_rate_from_tcmb(current_date)
        attempts += 1
    
    # If still not available, use a reasonable fallback value
    if rate is None:
        logger.warning(f"Could not find exchange rate for {target_date} or previous days, using default")
        rate = 30.0  # Default fallback value (adjust based on recent rates)
        current_date = target_date
    
    # If we have a database session, store this rate for future use
    if db_session and target_date == current_date:  # Only store actual day rates, not fallbacks
        from api.models.database import ExchangeRate
        
        db_session.add(ExchangeRate(
            date=target_date,
            usd_to_tl=rate
        ))
        db_session.commit()
    
    return rate, current_date


def convert_tl_to_usd(amount_tl: float, rate_date: date, db_session=None) -> Tuple[float, float]:
    """
    Converts TL amount to USD based on the exchange rate for a specific date.
    
    Args:
        amount_tl: The amount in Turkish Lira
        rate_date: The date to use for the exchange rate
        db_session: Optional SQLAlchemy session for database lookup
        
    Returns:
        Tuple of (USD amount, exchange rate used)
    """
    rate, _ = get_exchange_rate_with_fallback(rate_date, db_session)
    
    # Convert TL to USD (TL ÷ rate = USD)
    amount_usd = amount_tl / rate
    
    return amount_usd, rate