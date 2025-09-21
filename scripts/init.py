#!/usr/bin/env python
"""
Initialize the Tahsilat Raporu application environment.
This script sets up the database and creates necessary directories.
"""

import os
import sys
from pathlib import Path

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import database initialization function
from api.init_db import init_database

def main():
    """Run initialization steps for the Tahsilat Raporu application."""
    print("Initializing Tahsilat Raporu application...")
    
    # Create backups directory if it doesn't exist
    backups_dir = project_root / "backups"
    backups_dir.mkdir(exist_ok=True)
    print(f"Ensured backups directory exists at: {backups_dir}")
    
    # Initialize the SQLite database
    init_database()
    print("Database initialization complete")
    
    print("\nSetup complete! You can now run the application with 'npm run dev'")

if __name__ == "__main__":
    main()