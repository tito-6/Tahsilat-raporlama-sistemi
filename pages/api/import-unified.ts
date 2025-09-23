import { NextApiRequest, NextApiResponse } from 'next';

// Import all your existing import handlers
import checkDuplicates from './import/check-duplicates';
import confirmImport from './import/confirm-import';
import excel from './import/excel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const routePath = path.join('/');
  
  try {
    // Route to the appropriate import handler
    switch (routePath) {
      case 'check-duplicates':
        return await checkDuplicates(req, res);
      case 'confirm-import':
        return await confirmImport(req, res);
      case 'excel':
        return await excel(req, res);
      default:
        return res.status(404).json({ error: 'Import endpoint not found' });
    }
  } catch (error) {
    console.error('Import API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}