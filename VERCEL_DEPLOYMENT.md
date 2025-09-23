# Innogy Tahsilat - Vercel Deployment Guide

## Project Information
- **Project Name**: innogy-tahsilat
- **Vercel Account**: ahmadalkhalid533@gmail.com
- **Vercel Dashboard**: https://vercel.com/tito-6s-projects/

## Authentication
- **Username**: innogy
- **Password**: tahsilat2025

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
# Use your email: ahmadalkhalid533@gmail.com
```

### 3. Deploy to Vercel
```bash
# From the project root directory
vercel --prod
```

### 4. Project Configuration
When prompted:
- Project name: `innogy-tahsilat`
- Framework: `Next.js`
- Output directory: Leave default (`.next`)
- Build command: Leave default (`npm run build`)
- Development command: Leave default (`npm run dev`)

### 5. Environment Variables (Set in Vercel Dashboard)
Go to your project settings and add:
- `AUTH_USERNAME`: innogy
- `AUTH_PASSWORD`: tahsilat2025

## Security Features
✅ **Basic Authentication**: Protected with username/password
✅ **No Search Engine Indexing**: robots.txt prevents crawling
✅ **X-Robots-Tag**: HTTP headers prevent indexing
✅ **Private Access Only**: Only accessible with credentials

## Access Information
Once deployed, the app will be accessible at:
- URL: `https://innogy-tahsilat.vercel.app` (or similar)
- Username: `innogy`
- Password: `tahsilat2025`

## Manual Deployment Commands
```bash
# Clone/navigate to project
cd /path/to/tahsilatraporu

# Install dependencies
npm install

# Build the project
npm run build

# Deploy to Vercel
vercel --prod

# Set project name when prompted
# Project name: innogy-tahsilat
```

## Post-Deployment Checklist
- [ ] Verify authentication works
- [ ] Test all app functionality
- [ ] Confirm robots.txt is accessible
- [ ] Check that search engines can't index
- [ ] Test on different browsers
- [ ] Verify database operations work
- [ ] Test import/export functionality

## Troubleshooting
If deployment fails:
1. Check build logs in Vercel dashboard
2. Verify all dependencies are in package.json
3. Check for TypeScript errors
4. Ensure all environment variables are set

## Domain (Optional)
If you want a custom domain:
1. Go to Vercel project settings
2. Add custom domain
3. Configure DNS records as instructed