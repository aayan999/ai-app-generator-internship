import { db } from './connection';
import { AppConfig } from '../config/configValidator';
import { logger } from '../utils/logger';

const log = logger.child('SchemaGenerator');

/**
 * Maps config field types to PostgreSQL column types.
 */
function mapFieldType(field: {
  type: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  values?: string[];
}): string {
  switch (field.type) {
    case 'uuid':
      return 'UUID';
    case 'string':
      return `VARCHAR(${field.maxLength || 255})`;
    case 'text':
      return 'TEXT';
    case 'integer':
    case 'int':
      return 'INTEGER';
    case 'decimal':
    case 'float':
    case 'number':
      return `NUMERIC(${field.precision || 10}, ${field.scale || 2})`;
    case 'boolean':
    case 'bool':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'timestamp':
    case 'datetime':
      return 'TIMESTAMPTZ';
    case 'json':
    case 'array':
      return 'JSONB';
    case 'enum':
      // Use VARCHAR with a CHECK constraint
      return `VARCHAR(100)`;
    default:
      log.warn(`Unknown field type "${field.type}", defaulting to TEXT`);
      return 'TEXT';
  }
}

/**
 * Generates column definition SQL for a single field.
 */
function generateColumnDef(
  fieldName: string,
  field: {
    type: string;
    primaryKey?: boolean;
    auto?: boolean;
    required?: boolean;
    maxLength?: number;
    precision?: number;
    scale?: number;
    values?: string[];
    default?: unknown;
  }
): string {
  const parts: string[] = [`"${fieldName}"`];

  // Type
  if (field.primaryKey && field.type === 'uuid' && field.auto) {
    parts.push('UUID DEFAULT gen_random_uuid()');
  } else if (field.type === 'timestamp' && field.auto) {
    parts.push('TIMESTAMPTZ DEFAULT NOW()');
  } else {
    parts.push(mapFieldType(field));
  }

  // Primary key
  if (field.primaryKey) {
    parts.push('PRIMARY KEY');
  }

  // Not null
  if (field.required && !field.primaryKey) {
    parts.push('NOT NULL');
  }

  // Default value
  if (field.default !== undefined && !field.auto) {
    if (typeof field.default === 'string') {
      parts.push(`DEFAULT '${field.default}'`);
    } else if (typeof field.default === 'number' || typeof field.default === 'boolean') {
      parts.push(`DEFAULT ${field.default}`);
    }
  }

  return parts.join(' ');
}

/**
 * Generates the SQL for creating the users table (built-in for auth).
 */
function generateUsersTableSQL(): string {
  return `
    CREATE TABLE IF NOT EXISTS "users" (
      "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      "email" VARCHAR(255) UNIQUE NOT NULL,
      "password_hash" VARCHAR(255),
      "name" VARCHAR(255),
      "is_verified" BOOLEAN DEFAULT false,
      "magic_link_token" VARCHAR(255),
      "magic_link_expires" TIMESTAMPTZ,
      "created_at" TIMESTAMPTZ DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON "users" ("email");
    CREATE INDEX IF NOT EXISTS idx_users_magic_link ON "users" ("magic_link_token");
  `;
}

/**
 * Generates the SQL for creating the sessions table (for refresh tokens).
 */
function generateSessionsTableSQL(): string {
  return `
    CREATE TABLE IF NOT EXISTS "sessions" (
      "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "refresh_token" VARCHAR(500) NOT NULL,
      "expires_at" TIMESTAMPTZ NOT NULL,
      "created_at" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON "sessions" ("user_id");
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON "sessions" ("refresh_token");
  `;
}

/**
 * Generates CREATE TABLE SQL for a config entity.
 */
function generateEntityTableSQL(
  entityName: string,
  entity: AppConfig['database']['entities'][string],
  userScoped: boolean
): string {
  const columns: string[] = [];
  const constraints: string[] = [];

  for (const [fieldName, field] of Object.entries(entity.fields)) {
    columns.push(generateColumnDef(fieldName, field));

    // Enum check constraint
    if (field.type === 'enum' && field.values && field.values.length > 0) {
      const valuesList = field.values.map((v) => `'${v}'`).join(', ');
      constraints.push(
        `CONSTRAINT "chk_${entity.tableName}_${fieldName}" CHECK ("${fieldName}" IN (${valuesList}))`
      );
    }

    // Foreign key constraint
    if (field.foreignKey) {
      constraints.push(
        `CONSTRAINT "fk_${entity.tableName}_${fieldName}" FOREIGN KEY ("${fieldName}") ` +
        `REFERENCES "${field.foreignKey.entity}"("${field.foreignKey.field}") ` +
        `ON DELETE ${field.foreignKey.onDelete || 'CASCADE'}`
      );
    }
  }

  // Add user_id column for user-scoped entities
  if (userScoped) {
    columns.push('"user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE');
  }

  const allParts = [...columns, ...constraints];
  const indexStatements: string[] = [];

  // Create index on user_id for scoped queries
  if (userScoped) {
    indexStatements.push(
      `CREATE INDEX IF NOT EXISTS "idx_${entity.tableName}_user_id" ON "${entity.tableName}" ("user_id");`
    );
  }

  return `
    CREATE TABLE IF NOT EXISTS "${entity.tableName}" (
      ${allParts.join(',\n      ')}
    );
    ${indexStatements.join('\n    ')}
  `;
}

/**
 * Generates and executes the full database schema from config.
 */
export async function generateSchema(config: AppConfig): Promise<void> {
  if (!db.isConnected()) {
    log.warn('Database not connected — skipping schema generation');
    return;
  }

  log.info('Starting schema generation...');

  try {
    await db.transaction(async (client) => {
      // Enable UUID extension
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

      // 1. Create users table (always needed for auth)
      if (config.auth.enabled) {
        log.info('Creating users table...');
        await client.query(generateUsersTableSQL());
        log.info('Creating sessions table...');
        await client.query(generateSessionsTableSQL());
      }

      // 2. Create entity tables
      // Sort entities so that tables with foreign keys are created after their referenced tables
      const entityEntries = Object.entries(config.database.entities);
      const sorted = topologicalSort(entityEntries, config);

      for (const [entityName, entity] of sorted) {
        log.info(`Creating table for entity: ${entityName} -> ${entity.tableName}`);
        const sql = generateEntityTableSQL(
          entityName,
          entity,
          entity.userScoped && config.auth.userScoped
        );
        try {
          await client.query(sql);
          log.info(`Table "${entity.tableName}" created/verified`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log.error(`Failed to create table "${entity.tableName}": ${message}`);
          // Continue with other tables — don't break the entire migration
        }
      }
    });

    log.info('Schema generation completed successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Schema generation failed: ${message}`);
    throw err;
  }
}

/**
 * Topological sort for entity creation order (handles foreign key dependencies).
 */
function topologicalSort(
  entities: [string, AppConfig['database']['entities'][string]][],
  _config: AppConfig
): [string, AppConfig['database']['entities'][string]][] {
  const entityMap = new Map(entities);
  const visited = new Set<string>();
  const sorted: [string, AppConfig['database']['entities'][string]][] = [];

  function visit(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);

    const entity = entityMap.get(name);
    if (!entity) return;

    // Visit dependencies first
    for (const field of Object.values(entity.fields)) {
      if (field.foreignKey && entityMap.has(field.foreignKey.entity)) {
        visit(field.foreignKey.entity);
      }
    }

    sorted.push([name, entity]);
  }

  for (const [name] of entities) {
    visit(name);
  }

  return sorted;
}

/**
 * Drops all generated tables (useful for reset).
 */
export async function dropSchema(config: AppConfig): Promise<void> {
  if (!db.isConnected()) return;

  const entities = Object.values(config.database.entities);
  const tableNames = entities.map((e) => `"${e.tableName}"`);
  tableNames.push('"sessions"', '"users"');

  const sql = `DROP TABLE IF EXISTS ${tableNames.join(', ')} CASCADE;`;
  await db.query(sql);
  log.info('All tables dropped');
}
