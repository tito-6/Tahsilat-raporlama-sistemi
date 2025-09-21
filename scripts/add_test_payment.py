#!/usr/bin/env python
"""
Add a test payment record to verify date handling in the database.
"""

import sys
import os
import sqlite3
from datetime import datetime, date
from pathlib import Path

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def add_test_payment():
    """Add a test payment to the database with today's date."""
    db_path = project_root / "tahsilat_data.db"
    
    if not db_path.exists():
        print("Database file doesn't exist. Please initialize it first.")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Get today's date
        today = date.today()
        today_str = today.isoformat()
        
        # Insert a test payment for today
        cursor.execute('''
            INSERT INTO payments (
                customer_name, payment_date, payment_method,
                amount_due, currency_due, amount_paid, currency_paid,
                year, month, project_name, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            "Test Customer",           # customer_name
            today_str,                 # payment_date
            "Bank Transfer",           # payment_method
            1000.00,                   # amount_due
            "TRY",                     # currency_due
            1000.00,                   # amount_paid
            "TRY",                     # currency_paid
            today.year,                # year
            today.month,               # month
            "Test Project",            # project_name
            "Completed"                # status
        ))
        
        # Add another test payment for a specific month (August)
        august_date = date(today.year, 8, 15)
        august_str = august_date.isoformat()
        
        cursor.execute('''
            INSERT INTO payments (
                customer_name, payment_date, payment_method,
                amount_due, currency_due, amount_paid, currency_paid,
                year, month, project_name, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            "August Customer",         # customer_name
            august_str,                # payment_date
            "Cash",                    # payment_method
            2000.00,                   # amount_due
            "TRY",                     # currency_due
            2000.00,                   # amount_paid
            "TRY",                     # currency_paid
            august_date.year,          # year
            august_date.month,         # month
            "August Project",          # project_name
            "Completed"                # status
        ))
        
        # Commit the changes and close the connection
        conn.commit()
        
        # Verify the insertion
        cursor.execute("SELECT id, customer_name, payment_date, year, month FROM payments")
        rows = cursor.fetchall()
        print("\nTest payments added to the database:")
        for row in rows:
            print(f"ID: {row[0]}, Customer: {row[1]}, Date: {row[2]}, Year: {row[3]}, Month: {row[4]}")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Error adding test payment: {e}")
        return False

if __name__ == "__main__":
    print("\n===== Adding Test Payment Records =====\n")
    if add_test_payment():
        print("\nTest payments added successfully!")
        print("You can now check if date filtering works correctly.")
    else:
        print("\nFailed to add test payments. See errors above.")