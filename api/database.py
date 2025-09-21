from fastapi import APIRouter, HTTPException
from api.utils.database import get_db_connection, execute_query

router = APIRouter()

@router.get("/test-connection")
async def test_connection():
    """Test the database connection."""
    try:
        # Try to connect and get SQLite version
        result = execute_query("SELECT sqlite_version() as version")
        return {
            "status": "success",
            "message": "Database connection successful",
            "sqlite_version": result[0]["version"] if result else "Unknown"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

@router.get("/tables")
async def get_tables():
    """Get list of all tables in the database."""
    try:
        tables = execute_query("SELECT name FROM sqlite_master WHERE type='table'")
        return {
            "tables": [table["name"] for table in tables]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tables: {str(e)}")