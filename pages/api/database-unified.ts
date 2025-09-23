import { NextApiRequest, NextApiResponse } from 'next';

// Import all your existing database handlers
import testConnection from './database/test-connection';
import updateSchema from './database/update-schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const routePath = path.join('/');
  
  try {
    // Route to the appropriate database handler
    switch (routePath) {
      case 'test-connection':
        return await testConnection(req, res);
      case 'update-schema':
        return await updateSchema(req, res);
      default:
        return res.status(404).json({ error: 'Database endpoint not found' });
    }
  } catch (error) {
    console.error('Database API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}