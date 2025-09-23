import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear any cookies if you were using them
    res.setHeader('Set-Cookie', [
      'auth-token=; Path=/; HttpOnly; Max-Age=0',
      'session=; Path=/; HttpOnly; Max-Age=0'
    ]);

    // Return success response
    res.status(200).json({ 
      success: true, 
      message: 'Successfully logged out' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during logout' 
    });
  }
}