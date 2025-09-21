import sqlite3
from pathlib import Path

def init_database():
    """Initialize the SQLite database with schema."""
    # Get the base directory (project root)
    base_dir = Path(__file__).parent.parent
    db_path = base_dir / "tahsilat_data.db"
    
    # Connect to SQLite database (creates it if it doesn't exist)
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create necessary tables
    cursor.executescript("""
        -- Drop existing payments table if it exists (for update)
        DROP TABLE IF EXISTS payments;
        
        -- Customers table
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Properties table
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Payment channels table
        CREATE TABLE IF NOT EXISTS payment_channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Updated Payments table with all Excel import fields
        CREATE TABLE payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            sales_person TEXT,
            activity_no TEXT,
            payment_date DATE,
            payment_method TEXT,
            account_name TEXT,
            amount_due DECIMAL(15, 2),
            currency_due TEXT DEFAULT 'TRY',
            amount_paid DECIMAL(15, 2),
            currency_paid TEXT DEFAULT 'TRY',
            exchange_rate DECIMAL(10, 4) DEFAULT 1.0,
            is_deposit INTEGER DEFAULT 0,
            year INTEGER,
            month INTEGER,
            description TEXT,
            property_units TEXT,
            project_name TEXT,
            account_description TEXT,
            check_due_date DATE,
            agency_name TEXT,
            status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Insert default payment channels
        INSERT OR IGNORE INTO payment_channels (id, name) 
        VALUES 
            (1, 'Bank Transfer'),
            (2, 'Cash'),
            (3, 'Credit Card'),
            (4, 'Check');
    """)
    
    # Commit and close connection
    conn.commit()
    conn.close()
    
    print(f"Database initialized at: {db_path}")

if __name__ == "__main__":
    init_database()