import path from 'path';
import fs from 'fs';

let dbInitialized = false;

export function getDatabasePath(): string {
  // In production (Netlify), copy database to /tmp for write operations
  if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
    const tempDbPath = '/tmp/tahsilat_data.db';
    const sourceDbPath = path.join(process.cwd(), 'tahsilat_data.db');
    
    // Only copy if not already initialized in this function instance
    if (!dbInitialized && !fs.existsSync(tempDbPath)) {
      try {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, tempDbPath);
          console.log('Database copied to /tmp for write operations');
        } else {
          console.log('Source database not found, creating empty database in /tmp');
          // Create empty database file
          fs.writeFileSync(tempDbPath, '');
        }
        dbInitialized = true;
      } catch (error) {
        console.error('Error copying database to /tmp:', error);
        // Fall back to source path for read-only operations
        return sourceDbPath;
      }
    }
    
    return tempDbPath;
  }
  
  // In development, use the local database file
  return path.join(process.cwd(), 'tahsilat_data.db');
}

export function resetDbInitialization() {
  dbInitialized = false;
}