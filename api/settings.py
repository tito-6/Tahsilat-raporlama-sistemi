from fastapi import APIRouter, HTTPException
import os
import shutil
from datetime import datetime
from pathlib import Path

router = APIRouter()

@router.get("/database-info")
async def get_database_info():
    """Get information about the SQLite database."""
    try:
        # Get the current working directory
        base_dir = Path(__file__).parent.parent.parent
        db_path = os.path.join(base_dir, "tahsilat_data.db")
        
        # Check if database exists
        exists = os.path.exists(db_path)
        
        # Get database size if it exists
        size_bytes = os.path.getsize(db_path) if exists else 0
        size_mb = round(size_bytes / (1024 * 1024), 2)
        
        # Get last modified time if it exists
        last_modified = None
        if exists:
            last_modified = datetime.fromtimestamp(os.path.getmtime(db_path)).isoformat()
        
        return {
            "databasePath": db_path,
            "exists": exists,
            "sizeBytes": size_bytes,
            "sizeMb": size_mb,
            "lastModified": last_modified
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting database info: {str(e)}")

@router.post("/backup-database")
async def backup_database():
    """Create a backup of the SQLite database."""
    try:
        # Get the current working directory
        base_dir = Path(__file__).parent.parent.parent
        db_path = os.path.join(base_dir, "tahsilat_data.db")
        
        # Check if database exists
        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Database file not found")
        
        # Create backups directory if it doesn't exist
        backups_dir = os.path.join(base_dir, "backups")
        os.makedirs(backups_dir, exist_ok=True)
        
        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"tahsilat_data_backup_{timestamp}.db"
        backup_path = os.path.join(backups_dir, backup_filename)
        
        # Copy the database file
        shutil.copy2(db_path, backup_path)
        
        return {
            "success": True,
            "backupPath": backup_path,
            "timestamp": timestamp
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating database backup: {str(e)}")