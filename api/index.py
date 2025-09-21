from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
import json

from api.models.database import get_db, create_tables
from api.models.schemas import (
    PaymentCreate, PaymentResponse, ImportResponse, DateRangeParams,
    ReportResponse, ExchangeRateResponse
)
from api.utils.data_import import process_import_file
from api.utils.data_storage import (
    save_payment, save_bulk_payments, get_payments, get_payment_by_id,
    update_payment, delete_payment
)
from api.utils.report_generator import (
    generate_daily_report, generate_weekly_report, generate_monthly_channel_report,
    generate_yearly_summary, generate_property_report, generate_customer_report
)
from api.utils.currency_conversion import get_exchange_rate_with_fallback
from api.settings import router as settings_router
from api.database import router as database_router

app = FastAPI(
    title="Tahsilat Raporu API",
    description="API for the Tahsilat Raporu payment reporting application",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the settings and database routers
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
app.include_router(database_router, prefix="/api/database", tags=["database"])

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# File import endpoint
@app.post("/api/import", response_model=ImportResponse)
async def import_payments(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import payment data from a CSV, XLSX, or JSON file."""
    try:
        # Process the file
        payment_data, errors = await process_import_file(file)
        
        if not payment_data and errors:
            return ImportResponse(
                success=False,
                message="Import failed due to validation errors",
                records_imported=0,
                errors=errors
            )
        
        # Save the validated data to the database
        saved_count, save_errors = await save_bulk_payments(db, payment_data)
        
        # Combine any errors from saving with validation errors
        all_errors = errors + save_errors
        
        return ImportResponse(
            success=len(all_errors) == 0,
            message=f"Successfully imported {saved_count} payment records" if not all_errors else "Import completed with some errors",
            records_imported=saved_count,
            errors=all_errors if all_errors else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# Payment CRUD endpoints
@app.post("/api/payments", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db)
):
    """Create a new payment record."""
    try:
        payment_data = payment.dict()
        db_payment = await save_payment(db, payment_data)
        return db_payment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create payment: {str(e)}")


@app.get("/api/payments", response_model=List[PaymentResponse])
async def list_payments(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    customer_name: Optional[str] = None,
    property_id: Optional[str] = None,
    payment_channel: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List payment records with optional filtering."""
    payments = await get_payments(
        db, skip, limit, start_date, end_date, 
        customer_name, property_id, payment_channel
    )
    return payments


@app.get("/api/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific payment record by ID."""
    payment = await get_payment_by_id(db, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@app.put("/api/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment_endpoint(
    payment_id: int,
    payment: PaymentCreate,
    db: Session = Depends(get_db)
):
    """Update an existing payment record."""
    payment_data = payment.dict()
    updated_payment = await update_payment(db, payment_id, payment_data)
    if updated_payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return updated_payment


@app.delete("/api/payments/{payment_id}")
async def delete_payment_endpoint(
    payment_id: int,
    db: Session = Depends(get_db)
):
    """Delete a payment record."""
    success = await delete_payment(db, payment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"success": True, "message": "Payment deleted"}


# Report endpoints
@app.get("/api/reports/daily", response_model=ReportResponse)
async def daily_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Generate a daily USD payment report for a date range."""
    report = await generate_daily_report(db, start_date, end_date)
    return report


@app.get("/api/reports/weekly", response_model=ReportResponse)
async def weekly_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Generate a weekly summary report for a date range."""
    report = await generate_weekly_report(db, start_date, end_date)
    return report


@app.get("/api/reports/monthly-channel", response_model=ReportResponse)
async def monthly_channel_report(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db)
):
    """Generate a monthly payment channel report."""
    report = await generate_monthly_channel_report(db, year, month)
    return report


@app.get("/api/reports/yearly", response_model=ReportResponse)
async def yearly_report(
    year: int = Query(...),
    db: Session = Depends(get_db)
):
    """Generate a yearly summary report."""
    report = await generate_yearly_summary(db, year)
    return report


@app.get("/api/reports/property", response_model=ReportResponse)
async def property_report(
    property_id: str = Query(...),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Generate a report for a specific property."""
    report = await generate_property_report(db, property_id, start_date, end_date)
    return report


@app.get("/api/reports/customer", response_model=ReportResponse)
async def customer_report(
    customer_name: str = Query(...),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Generate a report for a specific customer."""
    report = await generate_customer_report(db, customer_name, start_date, end_date)
    return report


# Exchange rate endpoint
@app.get("/api/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate(
    target_date: date = Query(default=None),
    db: Session = Depends(get_db)
):
    """Get the USD to TL exchange rate for a specific date."""
    if target_date is None:
        target_date = date.today()
        
    rate, actual_date = get_exchange_rate_with_fallback(target_date, db)
    
    return {
        "id": 0,  # Placeholder, not stored in DB
        "date": actual_date,
        "usd_to_tl": rate,
        "created_at": datetime.utcnow()
    }