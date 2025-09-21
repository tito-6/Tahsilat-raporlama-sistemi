import { NextRequest, NextResponse } from 'next/server';

// Declare global variable for TypeScript
declare global {
  var middlewareLastSchemaCheck: number;
}

// Initialize global variable if needed
if (typeof global.middlewareLastSchemaCheck === 'undefined') {
  global.middlewareLastSchemaCheck = 0;
}

// This middleware will only run on API routes
export const config = {
  matcher: '/api/:path*',
};

// Use a timestamp to rate limit schema checks - once per 5 minutes max
const SCHEMA_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export default async function middleware(req: NextRequest) {
  const now = Date.now();
  
  // Skip favicon.ico and other static assets
  if (req.nextUrl.pathname.includes('favicon.ico')) {
    return NextResponse.next();
  }
  
  // Skip the schema update endpoint itself to avoid infinite recursion
  if (req.nextUrl.pathname === '/api/database/update-schema') {
    return NextResponse.next();
  }
  
  // Skip debug endpoints
  if (req.nextUrl.pathname.startsWith('/api/debug/')) {
    return NextResponse.next();
  }
  
  // Only check schema if enough time has passed since last check
  if (now - global.middlewareLastSchemaCheck > SCHEMA_CHECK_INTERVAL) {
    try {
      // Get base URL
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      
      // Update database schema
      const response = await fetch(`${baseUrl}/api/database/update-schema`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add a short timeout to prevent hanging
        signal: AbortSignal.timeout(3000) 
      });
      
      if (!response.ok) {
        throw new Error(`Schema update failed with status ${response.status}`);
      }
      
      global.middlewareLastSchemaCheck = now;
      console.log(`Database schema check completed at ${new Date(now).toISOString()}`);
    } catch (error) {
      console.error('Failed to update database schema:', error);
      // Still update the timestamp to avoid repeated failures, but use a shorter interval
      // so we'll try again sooner but not immediately
      global.middlewareLastSchemaCheck = now - (SCHEMA_CHECK_INTERVAL - 60000); // Try again in 1 minute
    }
  }

  return NextResponse.next();
}