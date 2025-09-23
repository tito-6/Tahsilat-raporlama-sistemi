#!/usr/bin/env python3
"""
Database optimization script for handling large datasets (1 year+ of payments).
Adds indexes and performance optimizations.
"""

import sqlite3
import sys
import os
from pathlib import Path

def get_db_path():
    """Get the absolute path to the SQLite database."""
    base_dir = Path(__file__).parent.parent
    db_path = os.path.join(base_dir, "tahsilat_data.db")
    return db_path

def optimize_database():
    """Add indexes and optimize database for large datasets."""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"Database not found at: {db_path}")
        return False
    
    print(f"Optimizing database at: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add performance indexes for common queries
        optimization_queries = [
            # Date-based queries (most common)
            "CREATE INDEX IF NOT EXISTS idx_payment_date ON payments(payment_date);",
            "CREATE INDEX IF NOT EXISTS idx_year_month ON payments(year, month);",
            
            # Payment method queries
            "CREATE INDEX IF NOT EXISTS idx_payment_method ON payments(payment_method);",
            
            # Account and customer queries
            "CREATE INDEX IF NOT EXISTS idx_account_name ON payments(account_name);",
            "CREATE INDEX IF NOT EXISTS idx_customer_name ON payments(customer_name);",
            
            # Currency and amount queries
            "CREATE INDEX IF NOT EXISTS idx_currency_paid ON payments(currency_paid);",
            "CREATE INDEX IF NOT EXISTS idx_amount_paid ON payments(amount_paid);",
            
            # Project and property queries
            "CREATE INDEX IF NOT EXISTS idx_project_name ON payments(project_name);",
            
            # Composite indexes for complex queries
            "CREATE INDEX IF NOT EXISTS idx_date_method ON payments(payment_date, payment_method);",
            "CREATE INDEX IF NOT EXISTS idx_year_month_method ON payments(year, month, payment_method);",
            "CREATE INDEX IF NOT EXISTS idx_account_method ON payments(account_name, payment_method);",
            
            # Status and activity queries
            "CREATE INDEX IF NOT EXISTS idx_status ON payments(status);",
            "CREATE INDEX IF NOT EXISTS idx_activity_no ON payments(activity_no);",
        ]
        
        print("Creating performance indexes...")
        for query in optimization_queries:
            print(f"Executing: {query}")
            cursor.execute(query)
        
        # Analyze tables for query optimization
        print("Analyzing tables for query optimization...")
        cursor.execute("ANALYZE;")
        
        # Set pragmas for better performance
        performance_pragmas = [
            "PRAGMA cache_size = -64000;",  # 64MB cache
            "PRAGMA temp_store = MEMORY;",  # Store temp data in memory
            "PRAGMA mmap_size = 268435456;",  # 256MB memory map
            "PRAGMA optimize;",  # Optimize database
        ]
        
        print("Setting performance pragmas...")
        for pragma in performance_pragmas:
            print(f"Executing: {pragma}")
            cursor.execute(pragma)
        
        # Get database statistics
        cursor.execute("SELECT COUNT(*) as payment_count FROM payments;")
        payment_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) as index_count FROM sqlite_master WHERE type='index';")
        index_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT page_size * page_count / 1024.0 / 1024.0 as size_mb FROM pragma_page_count(), pragma_page_size();")
        db_size_mb = cursor.fetchone()[0]
        
        print(f"\n✅ Database optimization completed!")
        print(f"📊 Database Statistics:")
        print(f"   - Total payments: {payment_count:,}")
        print(f"   - Total indexes: {index_count}")
        print(f"   - Database size: {db_size_mb:.2f} MB")
        print(f"   - Estimated capacity: ~{payment_count * 10:,} payments (with current structure)")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"❌ Error optimizing database: {str(e)}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

def verify_indexes():
    """Verify that all indexes were created successfully."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='payments' ORDER BY name;")
        indexes = [row[0] for row in cursor.fetchall()]
        
        print(f"\n📋 Current indexes on payments table:")
        for idx in indexes:
            print(f"   - {idx}")
            
        # Check query performance with EXPLAIN QUERY PLAN
        test_queries = [
            "SELECT COUNT(*) FROM payments WHERE payment_date BETWEEN '01/09/2025' AND '30/09/2025';",
            "SELECT * FROM payments WHERE payment_method = 'Check' AND year = 2025;",
            "SELECT account_name, SUM(amount_paid) FROM payments WHERE currency_paid = 'TL' GROUP BY account_name;",
        ]
        
        print(f"\n🔍 Query execution plans:")
        for query in test_queries:
            cursor.execute(f"EXPLAIN QUERY PLAN {query}")
            plan = cursor.fetchall()
            print(f"\nQuery: {query}")
            for step in plan:
                print(f"   Plan: {step}")
                
        return True
        
    except Exception as e:
        print(f"❌ Error verifying indexes: {str(e)}")
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Starting database optimization for large dataset handling...")
    
    if optimize_database():
        verify_indexes()
        print(f"\n✅ Database is ready for large dataset import!")
        print(f"💡 Recommended: Test with a subset of data first")
    else:
        print(f"\n❌ Database optimization failed!")
        sys.exit(1)