# Tahsilat Raporu - Payment Reporting Automation

A simplified web application that automates payment reporting for real estate companies, replicating the core functionality of the "Tahsilat" desktop system with modern web technologies and a lightweight database.

## Features

- **Direct API Reporting**: Generate reports directly using a clean, intuitive UI
- **Payment Data Import**: Upload payment data from various file formats (CSV, XLSX, JSON)
- **Currency Conversion**: Automatic TL to USD conversion based on TCMB exchange rates
- **Interactive Reports**: Generate and visualize daily, weekly, and monthly payment reports
- **Local Data Storage**: Store and retrieve payment data using SQLite for simple deployment

## Technology Stack

- **Frontend**: Next.js with Chakra UI for modern, responsive interfaces
- **Backend**: Python FastAPI deployed as Vercel Serverless Functions
- **Database**: SQLite for lightweight, file-based data storage
- **Deployment**: Vercel for continuous deployment

## Project Structure

```
tahsilatraporu/
├── api/                # Python FastAPI backend
│   ├── init_db.py      # Database initialization
│   ├── utils/          # Utility functions including database.py
│   ├── database.py     # Database connection test endpoints
│   └── settings.py     # Database settings endpoints
├── components/         # React UI components
├── lib/                # Shared utility functions
├── pages/              # Next.js pages and API routes
│   ├── reports.tsx     # Direct report generation page
│   ├── settings.tsx    # Application settings page
│   └── ...             # Other page components
├── public/             # Static assets
└── scripts/            # Setup and utility scripts
    └── setup_database.py  # Database initialization script
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/tahsilatraporu.git
   cd tahsilatraporu
   ```

2. Install frontend dependencies
   ```
   npm install
   ```

3. Install backend dependencies
   ```
   pip install -r requirements.txt
   ```

4. Initialize the SQLite database
   ```
   python scripts/setup_database.py
   ```

5. Run the development server
   ```
   npm run dev
   ```

## Deployment

This project is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. No external database configuration needed - SQLite is packaged with the application
3. Deploy from main branch

## Database Management

- The application uses a local SQLite database (`tahsilat_data.db`)
- Backups can be created from the Settings page
- Backup files are stored in the `/backups` directory
- Database info and connection can be tested from the Settings page

## Report Types

- **Daily USD Report**: Daily payment summaries with USD conversion
- **Weekly Summary Report**: Week-by-week payment analysis
- **Monthly Channel Report**: Payment channel distribution by month
- **Yearly Report**: Annual payment summaries
- **Property Report**: Payment analysis by property
- **Customer Report**: Payment analysis by customer

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Central Bank of Turkey (TCMB) for exchange rate data
- Vercel for hosting and serverless functions