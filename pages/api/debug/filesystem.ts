import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const exists = fs.existsSync(dbPath);
    const cwd = process.cwd();
    const files = fs.readdirSync(cwd);
    
    res.status(200).json({
      success: true,
      debug: {
        cwd,
        dbPath,
        dbExists: exists,
        files: files.slice(0, 20), // First 20 files
        nodeEnv: process.env.NODE_ENV,
        netlify: process.env.NETLIFY
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}