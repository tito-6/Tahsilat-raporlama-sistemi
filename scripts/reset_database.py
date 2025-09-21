#!/usr/bin/env python
"""
Reset the Tahsilat Raporu database.
This script deletes all data while preserving the schema structure,
then re-initializes the database with default values.

Usage:
    python scripts/reset_database.py

Features:
    - Creates a backup of the database before deletion
    - Preserves the database schema structure
    - Deletes all data from all tables
    - Re-initializes with default values for lookup tables
    - Requires confirmation to prevent accidental data loss
    - Verifies the reset was successful

IMPORTANT: This script will delete ALL data in the database!
           Always make sure you have a backup before running.
"""

import os
import sys
import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import database initialization function
from api.init_db import init_database

def backup_database():
    """Create a backup of the current database before resetting."""
    db_path = project_root / "tahsilat_data.db"
    
    if not db_path.exists():
        print("Database file doesn't exist yet. No backup needed.")
        return
    
    # Create backup directory if it doesn't exist
    backups_dir = project_root / "backups"
    backups_dir.mkdir(exist_ok=True)
    
    # Generate timestamp for the backup file
    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H-%M-%S-%fZ')
    backup_file = backups_dir / f"tahsilat_data_backup_{timestamp}.db"
    
    # Copy the database file to the backup location
    shutil.copy2(db_path, backup_file)
    print(f"Database backup created: {backup_file}")
    return str(backup_file)

def delete_all_data():
    """Delete all data from tables while preserving the schema."""
    db_path = project_root / "tahsilat_data.db"
    
    if not db_path.exists():
        print("Database file doesn't exist. Nothing to delete.")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Known tables in our schema
        known_tables = [
            "payments",         # All payment records
            "customers",        # Customer information
            "properties",       # Property information
            "payment_channels"  # Payment channel types
        ]
        
        # Get a list of all tables in the database to handle any that might be added later
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [table[0] for table in cursor.fetchall() if not table[0].startswith('sqlite_')]
        
        # Make sure we've accounted for all tables
        for table in tables:
            if table not in known_tables:
                print(f"Note: Found unknown table in database: {table}")
                known_tables.append(table)
        
        # Delete all data from each table
        for table_name in known_tables:
            if table_name in tables:
                print(f"Deleting all data from table: {table_name}")
                cursor.execute(f"DELETE FROM {table_name};")
            else:
                print(f"Table {table_name} doesn't exist in the database, skipping.")
        
        # Reset the auto-increment counters for all tables
        for table_name in known_tables:
            if table_name in tables:
                try:
                    cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table_name}';")
                except:
                    print(f"Note: Could not reset auto-increment for {table_name}, continuing...")
        
        # Commit the changes and close the connection
        conn.commit()
        conn.close()
        print("All data deleted from the database.")
        return True
    except Exception as e:
        print(f"Error deleting data: {e}")
        return False

def main():
    """Reset the database by backing up, deleting all data, and reinitializing."""
    print("\n===== Tahsilat Raporu Database Reset =====\n")
    
    # Confirm reset action
    confirmation = input("WARNING: This will delete ALL data from the database. Are you sure? (yes/no): ")
    if confirmation.lower() not in ["yes", "y"]:
        print("Database reset cancelled.")
        return
    
    # Additional confirmation for safety
    confirmation = input("This action will delete all payments, customers, and properties. Type 'RESET' to confirm: ")
    if confirmation != "RESET":
        print("Database reset cancelled.")
        return
    
    # Backup the current database
    backup_path = backup_database()
    print(f"Backup created at: {backup_path}" if backup_path else "No backup created.")
    
    # Delete all data
    print("\nDeleting all data from the database...")
    if delete_all_data():
        print("Data deletion complete.")
    else:
        print("Data deletion failed. Check errors above.")
        return
    
    # Re-initialize the database with schema and default data
    print("\nRe-initializing database...")
    init_database()
    
    # Verify database was reset properly
    try:
        db_path = project_root / "tahsilat_data.db"
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check that payment_channels has the default values
        cursor.execute("SELECT COUNT(*) FROM payment_channels;")
        channel_count = cursor.fetchone()[0]
        
        # Check that payments table is empty
        cursor.execute("SELECT COUNT(*) FROM payments;")
        payment_count = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"\nVerification: Found {channel_count} payment channels and {payment_count} payments in the reset database.")
        if channel_count >= 4 and payment_count == 0:
            print("Database reset was successful!")
        else:
            print("Warning: Database may not have been reset properly. Please check the database.")
    except Exception as e:
        print(f"Error verifying database reset: {e}")
    
    print("\nDatabase reset complete! The database schema has been preserved, but all data has been deleted.")
    if backup_path:
        print(f"A backup of your previous data was saved at: {backup_path}")
    print("\nYou can now start with a clean database.")

if __name__ == "__main__":
    main()