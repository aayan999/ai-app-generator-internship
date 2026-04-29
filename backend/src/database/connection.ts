import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger';

const log = logger.child('Database');

/**
 * PostgreSQL connection pool manager.
 * Handles connection lifecycle with automatic retry and health checks.
 */
class Database {
  private static instance: Database;
  private pool: Pool | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize the connection pool.
   */
  async connect(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      log.error('DATABASE_URL not set. Database features will be disabled.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      log.info('Database connected successfully');

      // Handle pool errors
      this.pool.on('error', (err) => {
        log.error('Unexpected database pool error', { message: err.message });
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Database connection failed: ${message}`);
      log.warn('Application will continue without database. API calls will return errors.');
      this.pool = null;
    }
  }

  /**
   * Execute a parameterized query.
   */
  async query(text: string, params?: unknown[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;
    log.debug('Query executed', { text: text.substring(0, 80), duration, rows: result.rowCount });
    return result;
  }

  /**
   * Get a client from the pool for transactions.
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }

  /**
   * Execute a function within a transaction.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is connected.
   */
  isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Close the pool.
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      log.info('Database disconnected');
      this.pool = null;
    }
  }
}

export const db = Database.getInstance();
