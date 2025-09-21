
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api')))
from init_db import init_database

# Initialize the SQLite database
if __name__ == "__main__":
    init_database()