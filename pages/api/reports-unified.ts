import { NextApiRequest, NextApiResponse } from 'next';

// Import all your existing report handlers
import annual from './reports/annual';
import autoGenerate from './reports/auto-generate';
import customerDetail from './reports/customer-detail';
import daily from './reports/daily';
import exportReport from './reports/export';
import monthlyChannel from './reports/monthly-channel';
import overview from './reports/overview';
import projectDetail from './reports/project-detail';
import turkishWeekly from './reports/turkish-weekly';
import turkishWeeklyFixed from './reports/turkish-weekly-fixed';
import weeklyList from './reports/weekly-list';
import weeklyListEnhanced from './reports/weekly-list-enhanced';
import weekly from './reports/weekly';
import weeklyClean from './reports/weekly_clean';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const routePath = path.join('/');
  
  try {
    // Route to the appropriate report handler
    switch (routePath) {
      case 'annual':
        return await annual(req, res);
      case 'auto-generate':
        return await autoGenerate(req, res);
      case 'customer-detail':
        return await customerDetail(req, res);
      case 'daily':
        return await daily(req, res);
      case 'export':
        return await exportReport(req, res);
      case 'monthly-channel':
        return await monthlyChannel(req, res);
      case 'overview':
        return await overview(req, res);
      case 'project-detail':
        return await projectDetail(req, res);
      case 'turkish-weekly':
        return await turkishWeekly(req, res);
      case 'turkish-weekly-fixed':
        return await turkishWeeklyFixed(req, res);
      case 'weekly-list':
        return await weeklyList(req, res);
      case 'weekly-list-enhanced':
        return await weeklyListEnhanced(req, res);
      case 'weekly':
        return await weekly(req, res);
      case 'weekly_clean':
        return await weeklyClean(req, res);
      default:
        return res.status(404).json({ error: 'Report endpoint not found' });
    }
  } catch (error) {
    console.error('Reports API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}