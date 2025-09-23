import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear any cookies
  res.setHeader('Set-Cookie', [
    'auth-token=; Path=/; HttpOnly; Max-Age=0',
    'session=; Path=/; HttpOnly; Max-Age=0'
  ]);

  // Return a 401 with basic auth challenge to force re-authentication
  res.status(401);
  res.setHeader('WWW-Authenticate', 'Basic realm="Innogy Tahsilat - Please login again"');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.end('Authentication required - You have been logged out. Please refresh the page to login again.');
}