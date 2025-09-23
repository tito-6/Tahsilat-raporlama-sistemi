import { Pool, Client } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function getDbConnection() {
  const pool = getPool();
  return pool.connect();
}

export function getDatabaseUrl(): string {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '';
}

// Utility function to execute a query
export async function executeQuery(text: string, params?: any[]) {
  const client = await getDbConnection();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  const createPaymentsTable = `
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255),
      payment_date VARCHAR(20),
      amount_paid DECIMAL(15,2),
      currency_paid VARCHAR(10),
      exchange_rate DECIMAL(10,4),
      exchange_rate_date VARCHAR(20),
      payment_method VARCHAR(100),
      account_type VARCHAR(100),
      project_name VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await executeQuery(createPaymentsTable);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}