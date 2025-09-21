#!/usr/bin/env python
"""
Show status of the Tahsilat Raporu database.
This script displays table counts and basic statistics about the database.

Usage:
    python scripts/database_status.py
"""

import sqlite3
import sys
from pathlib import Path

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def format_count(count):
    """Format a number with thousands separator."""
    return f"{count:,}"

def get_table_stats():
    """Get statistics about each table in the database."""
    db_path = project_root / "tahsilat_data.db"
    
    if not db_path.exists():
        return None
    
    try:
        # Connect to the database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Get a list of all tables in the database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [table[0] for table in cursor.fetchall()]
        
        stats = {}
        total_rows = 0
        
        # Get count of rows in each table
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            stats[table] = count
            total_rows += count
        
        # Additional stats for payments if they exist
        if "payments" in tables and stats["payments"] > 0:
            # Get payment statistics
            cursor.execute("SELECT COUNT(DISTINCT project_name) FROM payments WHERE project_name IS NOT NULL;")
            project_count = cursor.fetchone()[0]
            stats["unique_projects"] = project_count
            
            cursor.execute("SELECT COUNT(DISTINCT customer_name) FROM payments WHERE customer_name IS NOT NULL;")
            customer_count = cursor.fetchone()[0]
            stats["unique_customers"] = customer_count
            
            cursor.execute("SELECT MIN(payment_date) FROM payments WHERE payment_date IS NOT NULL;")
            min_date = cursor.fetchone()[0]
            
            cursor.execute("SELECT MAX(payment_date) FROM payments WHERE payment_date IS NOT NULL;")
            max_date = cursor.fetchone()[0]
            
            stats["date_range"] = (min_date, max_date)
        
        conn.close()
        return stats, total_rows
        
    except Exception as e:
        print(f"Error getting database statistics: {e}")
        return None

def main():
    """Display database statistics."""
    print("\n===== Tahsilat Raporu Database Status =====\n")
    
    result = get_table_stats()
    if result is None:
        print("Database file not found or could not be read.")
        return
    
    stats, total_rows = result
    
    print(f"Database Location: {project_root / 'tahsilat_data.db'}\n")
    
    # Display table counts
    print("Table Row Counts:")
    print("-" * 40)
    for table, count in stats.items():
        if not table.startswith("unique_") and not table == "date_range":
            print(f"{table.ljust(20)}: {format_count(count)}")
    print("-" * 40)
    print(f"Total Rows:          {format_count(total_rows)}\n")
    
    # Display additional statistics if available
    if "unique_projects" in stats:
        print("Additional Statistics:")
        print("-" * 40)
        print(f"Unique Projects:     {format_count(stats['unique_projects'])}")
        print(f"Unique Customers:    {format_count(stats['unique_customers'])}")
        
        if stats["date_range"][0] and stats["date_range"][1]:
            print(f"Date Range:          {stats['date_range'][0]} to {stats['date_range'][1]}")
        print("-" * 40)
    
    print("\nUse 'python scripts/reset_database.py' to reset the database if needed.")

if __name__ == "__main__":
    main()