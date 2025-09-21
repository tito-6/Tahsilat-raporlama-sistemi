/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure rewrites for API routes to point to our Python backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  serverRuntimeConfig: {
    // Will only be available on the server side
    DATABASE_PATH: require('path').join(process.cwd(), 'tahsilat_data.db')
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    API_URL: process.env.API_URL
  }
};

module.exports = nextConfig;