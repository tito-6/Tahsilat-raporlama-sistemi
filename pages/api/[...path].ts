import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!Array.isArray(path)) {
    return res.status(400).json({ error: 'Invalid path parameter' });
  }
  
  const route = path.join('/');
  
  try {
    // Dynamically import the appropriate handler based on the route
    let module;
    
    try {
      // Try to import the module for this route
      module = await import(`./${route}`);
    } catch (importError) {
      // Try with index if direct import fails
      try {
        module = await import(`./${route}/index`);
      } catch (indexError) {
        return res.status(404).json({ error: `API route not found: ${route}` });
      }
    }
    
    const handler = module.default;
    
    if (typeof handler === 'function') {
      return handler(req, res);
    } else {
      return res.status(500).json({ error: 'Invalid handler' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      route 
    });
  }
}