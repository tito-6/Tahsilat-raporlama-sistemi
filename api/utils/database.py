import sqlite3
from contextlib import contextmanager
import os
from pathlib import Path

def get_db_path():
    """Get the absolute path to the SQLite database."""
    # Get the base directory (project root)
    base_dir = Path(__file__).parent.parent.parent
    db_path = os.path.join(base_dir, "tahsilat_data.db")
    return db_path

@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    try:
        yield conn
    finally:
        conn.close()

def execute_query(query, params=(), fetch_one=False):
    """Execute a query and return results."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        
        if query.strip().upper().startswith(('SELECT', 'PRAGMA')):
            if fetch_one:
                return dict(cursor.fetchone()) if cursor.fetchone() else None
            return [dict(row) for row in cursor.fetchall()]
        else:
            conn.commit()
            return cursor.lastrowid