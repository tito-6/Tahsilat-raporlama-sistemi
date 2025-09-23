import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';



export default async function middleware(req: NextRequest) {

  // Skip API routes and static files

  if (req.nextUrl.pathname.startsWith('/api/') || export default async function middleware(req: NextRequest) {// Force Node.js runtime instead of Edge runtime

      req.nextUrl.pathname.startsWith('/_next/') ||

      req.nextUrl.pathname.includes('favicon.ico')) {  // Skip API routes and static filesexport const runtime = 'nodejs';

    return NextResponse.next();

  }  if (req.nextUrl.pathname.startsWith('/api/') || 

  

  // Simple authentication check      req.nextUrl.pathname.startsWith('/_next/') ||// Authentication function

  const basicAuth = req.headers.get('authorization');

        req.nextUrl.pathname.includes('favicon.ico')) {function checkAuth(request: NextRequest): boolean {

  if (basicAuth) {

    const authValue = basicAuth.split(' ')[1];    return NextResponse.next();  const basicAuth = request.headers.get('authorization');

    if (authValue) {

      try {  }  

        const [user, pwd] = atob(authValue).split(':');

        if (user === 'innogy' && pwd === 'tahsilat2025') {    if (basicAuth) {

          return NextResponse.next();

        }  // Simple authentication check    const authValue = basicAuth.split(' ')[1];

      } catch (error) {

        // Invalid base64  const basicAuth = req.headers.get('authorization');    if (authValue) {

      }

    }        try {

  }

    if (basicAuth) {        const [user, pwd] = atob(authValue).split(':');

  // Return 401 with basic auth challenge

  return new NextResponse('Authentication required', {    const authValue = basicAuth.split(' ')[1];        

    status: 401,

    headers: {    if (authValue) {        // Credentials for Innogy Tahsilat access

      'WWW-Authenticate': 'Basic realm="Innogy Tahsilat"'

    }      try {        const validUsername = process.env.AUTH_USERNAME || 'innogy';

  });

}        const [user, pwd] = atob(authValue).split(':');        const validPassword = process.env.AUTH_PASSWORD || 'tahsilat2025';



export const config = {        if (user === 'innogy' && pwd === 'tahsilat2025') {        

  matcher: [

    '/((?!_next/static|_next/image|favicon.ico).*)',          return NextResponse.next();        if (user === validUsername && pwd === validPassword) {

  ],

};        }          return true;

      } catch (error) {        }

        // Invalid base64      } catch (error) {

      }        // Invalid base64

    }      }

  }    }

    }

  // Return 401 with basic auth challenge  

  return new NextResponse('Authentication required', {  return false;

    status: 401,}

    headers: {

      'WWW-Authenticate': 'Basic realm="Innogy Tahsilat"'// This middleware will run on all routes

    }export const config = {

  });  matcher: [

}    /*

     * Match all request paths except for the ones starting with:

export const config = {     * - _next/static (static files)

  matcher: [     * - _next/image (image optimization files)

    '/((?!_next/static|_next/image|favicon.ico).*)',     * - favicon.ico (favicon file)

  ],     */

};    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export default async function middleware(req: NextRequest) {
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

  return NextResponse.next();
}