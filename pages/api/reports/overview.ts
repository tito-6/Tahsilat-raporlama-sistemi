import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Overall summary statistics
    const overallSummary = await db.get(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_amount_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT project_name) as unique_projects,
        COUNT(DISTINCT payment_method) as payment_methods_used,
        COUNT(DISTINCT year) as years_active,
        MIN(payment_date) as first_payment_date,
        MAX(payment_date) as last_payment_date,
        AVG(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as avg_payment_usd
      FROM payments
    `);

    // Yearly overview
    const yearlyOverview = await db.all(`
      SELECT 
        year,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT project_name) as unique_projects
      FROM payments 
      GROUP BY year
      ORDER BY year DESC
    `);

    // Top customers of all time
    const topCustomersAllTime = await db.all(`
      SELECT 
        customer_name,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(DISTINCT project_name) as projects_involved,
        MIN(payment_date) as first_payment,
        MAX(payment_date) as last_payment
      FROM payments 
      GROUP BY customer_name
      ORDER BY total_usd DESC
      LIMIT 20
    `);

    // Top projects of all time
    const topProjectsAllTime = await db.all(`
      SELECT 
        project_name,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        MIN(payment_date) as first_payment,
        MAX(payment_date) as last_payment
      FROM payments 
      GROUP BY project_name
      ORDER BY total_usd DESC
      LIMIT 20
    `);

    // Payment method overview
    const paymentMethodOverview = await db.all(`
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        ROUND(
          100.0 * COUNT(*) / (SELECT COUNT(*) FROM payments), 
          2
        ) as percentage,
        AVG(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as avg_payment_usd
      FROM payments 
      GROUP BY payment_method
      ORDER BY total_usd DESC
    `);

    // Recent activity (last 30 days)
    const recentActivity = await db.all(`
      SELECT 
        payment_date,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd
      FROM payments 
      WHERE payment_date >= date('now', '-30 days')
      GROUP BY payment_date
      ORDER BY payment_date DESC
    `);

    // Currency distribution
    const currencyDistribution = await db.all(`
      SELECT 
        currency_paid,
        COUNT(*) as transaction_count,
        SUM(amount_paid) as total_original_currency,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        ROUND(
          100.0 * COUNT(*) / (SELECT COUNT(*) FROM payments), 
          2
        ) as percentage
      FROM payments 
      GROUP BY currency_paid
      ORDER BY total_usd DESC
    `);

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        overall_summary: overallSummary,
        yearly_overview: yearlyOverview,
        top_customers_all_time: topCustomersAllTime,
        top_projects_all_time: topProjectsAllTime,
        payment_method_overview: paymentMethodOverview,
        recent_activity: recentActivity,
        currency_distribution: currencyDistribution
      }
    });

  } catch (error) {
    console.error('Overview report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate overview report',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}