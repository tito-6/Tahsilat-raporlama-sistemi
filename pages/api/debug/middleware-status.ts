import { NextApiRequest, NextApiResponse } from 'next';

// Declare global variable for TypeScript
declare global {
  var middlewareLastSchemaCheck: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return middleware timestamp from global module scope
  const timestamp = global.middlewareLastSchemaCheck || 0;
  
  res.status(200).json({
    success: true,
    lastSchemaCheck: timestamp ? new Date(timestamp).toISOString() : 'Never',
    timeAgo: timestamp ? `${Math.round((Date.now() - timestamp) / 1000)} seconds ago` : 'N/A',
    now: new Date().toISOString()
  });
}