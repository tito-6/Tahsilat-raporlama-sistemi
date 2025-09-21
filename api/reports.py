from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import date, datetime

from api.models.database import get_db
from api.utils.report_generator import (
    generate_daily_report, generate_weekly_report, generate_monthly_channel_report,
    generate_yearly_summary, generate_property_report, generate_customer_report
)

router = APIRouter()

@router.get("/reports/daily")
async def get_daily_report(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Get daily USD payment report for a date range."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        report = await generate_daily_report(db, start, end)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating daily report: {str(e)}")

@router.get("/reports/weekly")
async def get_weekly_report(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Get weekly summary report for a date range."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        report = await generate_weekly_report(db, start, end)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating weekly report: {str(e)}")

@router.get("/reports/monthly")
async def get_monthly_report(
    year: int = Query(..., description="Year"),
    month: int = Query(..., description="Month (1-12)"),
    db: Session = Depends(get_db)
):
    """Get monthly payment channel report for a specific month."""
    try:
        report = await generate_monthly_channel_report(db, year, month)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating monthly report: {str(e)}")

@router.get("/reports/yearly")
async def get_yearly_report(
    year: int = Query(..., description="Year"),
    db: Session = Depends(get_db)
):
    """Get yearly summary report."""
    try:
        report = await generate_yearly_summary(db, year)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating yearly report: {str(e)}")

@router.get("/reports/property")
async def get_property_report(
    property_id: str = Query(..., description="Property ID"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Get report for a specific property."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
        end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None
        report = await generate_property_report(db, property_id, start, end)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating property report: {str(e)}")

@router.get("/reports/customer")
async def get_customer_report(
    customer_name: str = Query(..., description="Customer name"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Get report for a specific customer."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
        end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None
        report = await generate_customer_report(db, customer_name, start, end)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating customer report: {str(e)}")