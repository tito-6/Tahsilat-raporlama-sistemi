#!/usr/bin/env python
"""
Simple script to import and process payment data from Excel files.
This demonstrates the core data import and processing functionality.

Usage:
    python scripts/import_data_example.py path/to/excel_file.xlsx
"""

import sys
import os
import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime
import json

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def parse_turkish_date(date_value):
    """Parse Turkish date formats and Excel serial dates."""
    if pd.isna(date_value) or not date_value:
        return None
    
    try:
        # If it's already a datetime object
        if isinstance(date_value, pd.Timestamp):
            return date_value.strftime('%Y-%m-%d')
        
        # If it's a number (Excel serial date)
        if isinstance(date_value, (int, float)):
            # Excel epoch starts from 1900-01-01 but has a leap year bug
            excel_epoch = pd.Timestamp('1900-01-01')
            days_offset = int(date_value) - 2  # Adjust for Excel leap year bug
            date_obj = excel_epoch + pd.Timedelta(days=days_offset)
            return date_obj.strftime('%Y-%m-%d')
        
        # If it's a string, try to parse DD/MM/YYYY format
        date_str = str(date_value).strip()
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                day, month, year = parts
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        # Try pandas parsing as fallback
        parsed = pd.to_datetime(date_value, dayfirst=True)
        return parsed.strftime('%Y-%m-%d')
        
    except Exception as e:
        print(f"Warning: Could not parse date '{date_value}': {e}")
        return None

def parse_turkish_amount(amount_value):
    """Parse Turkish number format (1.234,56) to decimal."""
    if pd.isna(amount_value) or not amount_value:
        return 0.0
    
    try:
        if isinstance(amount_value, (int, float)):
            return float(amount_value)
        
        # Remove currency symbols and spaces
        amount_str = str(amount_value).strip()
        amount_str = ''.join(c for c in amount_str if c.isdigit() or c in '.,')
        
        # Handle Turkish format: 1.234,56 -> 1234.56
        if ',' in amount_str and '.' in amount_str:
            amount_str = amount_str.replace('.', '').replace(',', '.')
        elif ',' in amount_str:
            amount_str = amount_str.replace(',', '.')
        
        return float(amount_str) if amount_str else 0.0
        
    except Exception as e:
        print(f"Warning: Could not parse amount '{amount_value}': {e}")
        return 0.0

def process_excel_file(excel_path):
    """Process an Excel file and extract payment data."""
    print(f"Processing Excel file: {excel_path}")
    
    try:
        # Read Excel file with Turkish date handling
        df = pd.read_excel(excel_path, parse_dates=['Tarih'] if 'Tarih' in pd.read_excel(excel_path, nrows=0).columns else None)
        
        print(f"Found {len(df)} rows in Excel file")
        print(f"Columns: {list(df.columns)}")
        
        # Check for required column
        if 'Tarih' not in df.columns:
            raise ValueError("Required 'Tarih' column not found in Excel file")
        
        processed_data = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Parse payment date
                payment_date = parse_turkish_date(row.get('Tarih'))
                if not payment_date:
                    errors.append(f"Row {index + 1}: Invalid date")
                    continue
                
                # Extract year and month
                date_obj = datetime.strptime(payment_date, '%Y-%m-%d')
                year = date_obj.year
                month = date_obj.month
                
                # Parse amount
                amount_paid = parse_turkish_amount(row.get('Ödenen Tutar(Σ:12,438,088.23)', 0))
                
                # Create processed record
                record = {
                    'customer_name': str(row.get('Müşteri Adı Soyadı', '')).strip(),
                    'payment_date': payment_date,
                    'year': year,
                    'month': month,
                    'amount_paid': amount_paid,
                    'currency_paid': str(row.get('Ödenen Döviz', 'TRY')).strip().upper(),
                    'project_name': str(row.get('Proje Adı', '')).strip(),
                    'payment_method': str(row.get('Tahsilat Şekli', '')).strip(),
                    'sales_person': str(row.get('Satış Personeli', '')).strip(),
                    'activity_no': str(row.get('Aktivite No(87)', '')).strip(),
                    'status': 'Completed'
                }
                
                processed_data.append(record)
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
        
        print(f"Successfully processed {len(processed_data)} records")
        if errors:
            print(f"Encountered {len(errors)} errors:")
            for error in errors[:5]:  # Show first 5 errors
                print(f"  - {error}")
            if len(errors) > 5:
                print(f"  ... and {len(errors) - 5} more errors")
        
        return processed_data, errors
        
    except Exception as e:
        print(f"Error processing Excel file: {e}")
        return [], [str(e)]

def insert_into_database(processed_data):
    """Insert processed data into the SQLite database."""
    db_path = project_root / "tahsilat_data.db"
    
    if not db_path.exists():
        print("Database not found. Please initialize it first with: python api/init_db.py")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        inserted_count = 0
        
        for record in processed_data:
            try:
                cursor.execute('''
                    INSERT INTO payments (
                        customer_name, payment_date, year, month, amount_paid,
                        currency_paid, project_name, payment_method, sales_person,
                        activity_no, status, amount_due, currency_due, exchange_rate,
                        is_deposit, description, property_units, account_name,
                        account_description, check_due_date, agency_name
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    record['customer_name'], record['payment_date'], record['year'], 
                    record['month'], record['amount_paid'], record['currency_paid'],
                    record['project_name'], record['payment_method'], record['sales_person'],
                    record['activity_no'], record['status'], 0, 'TRY', 1.0, 0,
                    '', '', '', '', None, ''
                ))
                inserted_count += 1
                
            except Exception as e:
                print(f"Error inserting record: {e}")
        
        conn.commit()
        conn.close()
        
        print(f"Successfully inserted {inserted_count} records into database")
        return True
        
    except Exception as e:
        print(f"Database error: {e}")
        return False

def main():
    """Main function to process command line arguments and run import."""
    if len(sys.argv) != 2:
        print("Usage: python scripts/import_data_example.py <excel_file_path>")
        print("Example: python scripts/import_data_example.py data/payments.xlsx")
        return
    
    excel_file = sys.argv[1]
    
    if not os.path.exists(excel_file):
        print(f"Error: File '{excel_file}' not found")
        return
    
    print("=" * 50)
    print("Tahsilat Raporu - Data Import Script")
    print("=" * 50)
    
    # Process the Excel file
    processed_data, errors = process_excel_file(excel_file)
    
    if not processed_data:
        print("No data to import. Check errors above.")
        return
    
    # Show sample of processed data
    print(f"\nSample of processed data (first 3 records):")
    for i, record in enumerate(processed_data[:3]):
        print(f"Record {i + 1}:")
        print(f"  Customer: {record['customer_name']}")
        print(f"  Date: {record['payment_date']}")
        print(f"  Amount: {record['amount_paid']} {record['currency_paid']}")
        print(f"  Project: {record['project_name']}")
    
    # Ask for confirmation
    response = input(f"\nProceed to insert {len(processed_data)} records into database? (y/n): ")
    if response.lower() != 'y':
        print("Import cancelled.")
        return
    
    # Insert into database
    if insert_into_database(processed_data):
        print("\n✅ Import completed successfully!")
    else:
        print("\n❌ Import failed. Check errors above.")

if __name__ == "__main__":
    main()