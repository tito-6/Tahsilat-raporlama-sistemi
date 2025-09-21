#!/usr/bin/env python
"""
Validate the SQLite database setup for Tahsilat Raporu.
"""

import os
import sys
from pathlib import Path

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from api.utils.database import get_db_connection, get_db_path, execute_query

def validate_database():
    """Validate that the database exists and has the expected tables."""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"ERROR: Database file not found at {db_path}")
        print("Run 'npm run setup' to initialize the database.")
        return False
    
    try:
        # Check tables
        tables = execute_query("SELECT name FROM sqlite_master WHERE type='table'")
        table_names = [table["name"] for table in tables]
        
        expected_tables = ["customers", "properties", "payment_channels", "payments"]
        missing_tables = [table for table in expected_tables if table not in table_names]
        
        if missing_tables:
            print(f"ERROR: Missing expected tables: {', '.join(missing_tables)}")
            print("Run 'npm run setup' to initialize the database.")
            return False
        
        # Check payment channels (should have default entries)
        channels = execute_query("SELECT COUNT(*) as count FROM payment_channels")
        if channels[0]["count"] == 0:
            print("WARNING: No payment channels found in the database.")
            print("Default channels may not have been initialized.")
        
        print("Database validation successful!")
        print(f"Database location: {db_path}")
        print(f"Tables found: {', '.join(table_names)}")
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to validate database: {e}")
        return False

if __name__ == "__main__":
    success = validate_database()
    sys.exit(0 if success else 1)