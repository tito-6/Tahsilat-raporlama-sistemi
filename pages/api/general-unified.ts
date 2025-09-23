import { NextApiRequest, NextApiResponse } from 'next';

// Import all other handlers
import payments from './payments/index';
import middlewareStatus from './debug/middleware-status';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const routePath = path.join('/');
  
  try {
    // Route to the appropriate handler
    switch (routePath) {
      case 'payments':
      case 'payments/index':
        return await payments(req, res);
      case 'debug/middleware-status':
        return await middlewareStatus(req, res);
      default:
        return res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('General API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}