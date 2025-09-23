import { NextApiRequest, NextApiResponse } from 'next';

// Import all your existing auth handlers
import logout from './auth/logout';
import logoutRedirect from './auth/logout-redirect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const routePath = path.join('/');
  
  try {
    // Route to the appropriate auth handler
    switch (routePath) {
      case 'logout':
        return await logout(req, res);
      case 'logout-redirect':
        return await logoutRedirect(req, res);
      default:
        return res.status(404).json({ error: 'Auth endpoint not found' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}