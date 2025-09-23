import { NextApiRequest, NextApiResponse } from 'next';

// Import all your existing settings handlers
import backupDatabase from './settings/backup-database';
import databaseInfo from './settings/database-info';
import deleteAllData from './settings/delete-all-data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const routePath = path.join('/');
  
  try {
    // Route to the appropriate settings handler
    switch (routePath) {
      case 'backup-database':
        return await backupDatabase(req, res);
      case 'database-info':
        return await databaseInfo(req, res);
      case 'delete-all-data':
        return await deleteAllData(req, res);
      default:
        return res.status(404).json({ error: 'Settings endpoint not found' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}