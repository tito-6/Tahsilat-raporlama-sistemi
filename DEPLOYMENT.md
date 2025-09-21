# Tahsilat Raporu - Deployment Guide

This guide explains how to deploy the Tahsilat Raporu application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A [GitHub account](https://github.com/join) to host the repository
3. A [PostgreSQL database](#setting-up-postgresql)
4. An [OpenAI API key](#setting-up-openai-api-key)

## Setting up PostgreSQL

You need a PostgreSQL database to store the payment data. You can use any of the following options:

1. **Vercel Postgres**: Vercel offers PostgreSQL as a service, integrated with your Vercel project.
   - Go to your Vercel project dashboard
   - Click on "Storage"
   - Choose "Connect Database" and follow the setup wizard

2. **Supabase**: A fully managed PostgreSQL service with a generous free tier.
   - Create an account at [supabase.com](https://supabase.com)
   - Create a new project and get the connection string

3. **Railway.app**: Another easy-to-use PostgreSQL hosting option.
   - Create an account at [railway.app](https://railway.app)
   - Start a new PostgreSQL instance and get the connection string

4. **Any other PostgreSQL hosting**: Use any provider that offers a PostgreSQL database with a connection string.

## Setting up OpenAI API Key

The AI assistant feature requires an OpenAI API key:

1. Sign up at [OpenAI Platform](https://platform.openai.com/signup)
2. Navigate to [API Keys](https://platform.openai.com/api-keys)
3. Create a new secret key and save it securely

## Deployment Steps

### 1. Push to GitHub

1. Create a new repository on GitHub
2. Push your local code to the repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/tahsilatraporu.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Log in to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import the GitHub repository you created
4. Configure the project:
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

5. Set up environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NODE_ENV`: Set to `production`

6. Click "Deploy"

### 3. Verify Deployment

1. Once deployment is complete, click on the generated URL
2. Verify that the application is working correctly
3. Check that both frontend and API routes are working

## Automating Database Migrations

For automatic database table creation on deployment:

1. Add a deployment script to your `package.json`:

```json
"scripts": {
  "vercel-build": "python -c \"from api.models.database import create_tables; create_tables()\" && npm run build"
}
```

2. Update the environment variables to include `PYTHONPATH=.` 

## Troubleshooting

If you encounter issues with the deployment:

1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Ensure your database connection string is valid and accessible from Vercel
4. Test API endpoints using Vercel Function logs

## Continuous Deployment

Once set up, Vercel will automatically deploy new versions whenever you push changes to your GitHub repository. The workflow is:

1. Make changes to your code locally
2. Commit and push to GitHub
3. Vercel automatically detects changes and deploys a new version