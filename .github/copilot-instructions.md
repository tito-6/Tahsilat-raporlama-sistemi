<!-- Use this file to provide workspace-specific custom instructions to Copilot. -->
# Tahsilat Raporu - Payment Reporting Automation Web Application

This project is a Vercel-hosted web application with an AI-powered agent to automate payment reporting for real estate companies. It replicates the core functionality of the "Tahsilat" desktop system.

## Technology Stack
- **Frontend:** Next.js with modern UI library
- **Backend:** Python FastAPI deployed as Vercel Serverless Functions
- **AI Agent:** LangChain for conversational interface and tool usage
- **Database:** PostgreSQL for persistent data storage

## Project Structure
- `/api` - Python serverless functions for backend logic
- `/src` - Next.js frontend application
- `/lib` - Shared utility functions
- `/components` - React components for the UI
- `/pages` - Next.js pages and routing

## Development Guidelines
- Follow modular design patterns
- Implement comprehensive error handling
- Ensure all API endpoints are documented
- Maintain type safety throughout the application
- Follow best practices for Vercel deployment