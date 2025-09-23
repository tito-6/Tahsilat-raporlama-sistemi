import { NextRequest, NextResponse } from 'next/server';

// Declare global variable for TypeScript
declare global {
  var middlewareLastSchemaCheck: number;
}

// Initialize global variable if needed
if (typeof global.middlewareLastSchemaCheck === 'undefined') {
  global.middlewareLastSchemaCheck = 0;
}

// Use a timestamp to rate limit schema checks - once per 5 minutes max
const SCHEMA_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Authentication function
function checkAuth(request: NextRequest): boolean {
  const basicAuth = request.headers.get('authorization');
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    if (authValue) {
      try {
        const [user, pwd] = atob(authValue).split(':');
        
        // Credentials for Innogy Tahsilat access
        const validUsername = process.env.AUTH_USERNAME || 'innogy';
        const validPassword = process.env.AUTH_PASSWORD || 'tahsilat2025';
        
        if (user === validUsername && pwd === validPassword) {
          return true;
        }
      } catch (error) {
        // Invalid base64
      }
    }
  }
  
  return false;
}

// This middleware will run on all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const now = Date.now();
  
  // Skip favicon.ico and other static assets
  if (req.nextUrl.pathname.includes('favicon.ico')) {
    return NextResponse.next();
  }
  
  // Authentication check for all non-API routes
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    if (!checkAuth(req)) {
      // Return 401 with basic auth challenge
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Innogy Tahsilat - Restricted Access"'
        }
      });
    }
  }
  
  // Database schema check for API routes only
  if (req.nextUrl.pathname.startsWith('/api/')) {
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
  }

  return NextResponse.next();
}