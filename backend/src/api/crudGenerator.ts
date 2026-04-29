import { Request, Response } from 'express';
import { db } from '../database/connection';
import { AppConfig } from '../config/configValidator';
import { NotFoundError, AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const log = logger.child('CRUDGenerator');

interface EndpointConfig {
  entity: string;
  entityDef: AppConfig['database']['entities'][string];
  endpointDef: AppConfig['api']['endpoints'][string];
  userScoped: boolean;
}

/**
 * Generates CRUD handler functions dynamically for any entity.
 * All queries are parameterized to prevent SQL injection.
 */
export function generateCrudHandlers(cfg: EndpointConfig) {
  const { entityDef, endpointDef, userScoped } = cfg;
  const tableName = entityDef.tableName;

  // Get column names (excluding auto-generated ones for inserts)
  const allColumns = Object.keys(entityDef.fields);
  const insertableColumns = allColumns.filter((col) => {
    const field = entityDef.fields[col];
    return !field.auto && !field.primaryKey;
  });

  return {
    /**
     * LIST — GET /
     * Supports pagination, sorting, search, and filtering.
     */
    list: async (req: Request, res: Response): Promise<void> => {
      const {
        page = '1',
        limit: rawLimit,
        sort: sortField,
        order: sortOrder,
        search,
        ...filters
      } = req.query;

      const pagination = endpointDef.pagination;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limit = Math.min(
        pagination.maxLimit,
        Math.max(1, parseInt(rawLimit as string, 10) || pagination.defaultLimit)
      );
      const offset = (pageNum - 1) * limit;

      // Build WHERE clauses
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      // User scoping
      if (userScoped && req.user) {
        conditions.push(`"${tableName}"."user_id" = $${paramIndex++}`);
        params.push(req.user.userId);
      }

      // Search
      if (search && endpointDef.search.enabled && endpointDef.search.fields.length > 0) {
        const searchConditions = endpointDef.search.fields
          .filter((f) => allColumns.includes(f))
          .map((f) => `"${f}" ILIKE $${paramIndex}`);
        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(' OR ')})`);
          params.push(`%${search}%`);
          paramIndex++;
        }
      }

      // Filters
      for (const [key, value] of Object.entries(filters)) {
        if (endpointDef.filters[key] && allColumns.includes(key) && value !== undefined && value !== '') {
          const filterDef = endpointDef.filters[key];
          switch (filterDef.operator) {
            case 'eq':
              conditions.push(`"${key}" = $${paramIndex++}`);
              params.push(value);
              break;
            case 'gte':
              conditions.push(`"${key}" >= $${paramIndex++}`);
              params.push(value);
              break;
            case 'lte':
              conditions.push(`"${key}" <= $${paramIndex++}`);
              params.push(value);
              break;
            case 'like':
              conditions.push(`"${key}" ILIKE $${paramIndex++}`);
              params.push(`%${value}%`);
              break;
            default:
              conditions.push(`"${key}" = $${paramIndex++}`);
              params.push(value);
          }
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting — validate the sort field exists
      const validSortField =
        sortField && allColumns.includes(sortField as string)
          ? sortField as string
          : endpointDef.sort.defaultField;
      const validSortOrder =
        sortOrder && ['ASC', 'DESC'].includes((sortOrder as string).toUpperCase())
          ? (sortOrder as string).toUpperCase()
          : endpointDef.sort.defaultOrder;

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM "${tableName}" ${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Fetch data
      const dataQuery = `
        SELECT * FROM "${tableName}"
        ${whereClause}
        ORDER BY "${validSortField}" ${validSortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(limit, offset);

      const dataResult = await db.query(dataQuery, params);

      res.json({
        success: true,
        data: dataResult.rows,
        pagination: {
          page: pageNum,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    },

    /**
     * GET — GET /:id
     */
    get: async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const conditions: string[] = ['id = $1'];
      const params: unknown[] = [id];

      if (userScoped && req.user) {
        conditions.push('user_id = $2');
        params.push(req.user.userId);
      }

      const result = await db.query(
        `SELECT * FROM "${tableName}" WHERE ${conditions.join(' AND ')}`,
        params
      );

      if (result.rows.length === 0) {
        throw new NotFoundError(tableName);
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    },

    /**
     * CREATE — POST /
     */
    create: async (req: Request, res: Response): Promise<void> => {
      const data = req.body;
      const columns: string[] = [];
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      // Only include columns that exist in the entity definition
      for (const col of insertableColumns) {
        if (data[col] !== undefined) {
          columns.push(`"${col}"`);
          // Handle JSON fields
          const field = entityDef.fields[col];
          if (field.type === 'json' || field.type === 'array') {
            values.push(JSON.stringify(data[col]));
          } else {
            values.push(data[col]);
          }
          placeholders.push(`$${paramIndex++}`);
        }
      }

      // Add user_id for scoped entities
      if (userScoped && req.user) {
        columns.push('"user_id"');
        values.push(req.user.userId);
        placeholders.push(`$${paramIndex++}`);
      }

      if (columns.length === 0) {
        throw new AppError('No valid fields provided', 400);
      }

      const query = `
        INSERT INTO "${tableName}" (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await db.query(query, values);

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    },

    /**
     * UPDATE — PUT /:id
     */
    update: async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const data = req.body;
      const setClauses: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      for (const col of insertableColumns) {
        if (data[col] !== undefined) {
          const field = entityDef.fields[col];
          if (field.type === 'json' || field.type === 'array') {
            setClauses.push(`"${col}" = $${paramIndex++}`);
            params.push(JSON.stringify(data[col]));
          } else {
            setClauses.push(`"${col}" = $${paramIndex++}`);
            params.push(data[col]);
          }
        }
      }

      // Add updated_at if the field exists
      if (entityDef.fields['updated_at']) {
        setClauses.push(`"updated_at" = NOW()`);
      }

      if (setClauses.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      const conditions: string[] = [`"id" = $${paramIndex++}`];
      params.push(id);

      if (userScoped && req.user) {
        conditions.push(`"user_id" = $${paramIndex++}`);
        params.push(req.user.userId);
      }

      const query = `
        UPDATE "${tableName}"
        SET ${setClauses.join(', ')}
        WHERE ${conditions.join(' AND ')}
        RETURNING *
      `;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        throw new NotFoundError(tableName);
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    },

    /**
     * DELETE — DELETE /:id
     */
    delete: async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const conditions: string[] = ['id = $1'];
      const params: unknown[] = [id];

      if (userScoped && req.user) {
        conditions.push('user_id = $2');
        params.push(req.user.userId);
      }

      const result = await db.query(
        `DELETE FROM "${tableName}" WHERE ${conditions.join(' AND ')} RETURNING id`,
        params
      );

      if (result.rows.length === 0) {
        throw new NotFoundError(tableName);
      }

      res.json({
        success: true,
        message: `${tableName} deleted successfully`,
      });
    },

    /**
     * COUNT — GET /count (for dashboard stats)
     */
    count: async (req: Request, res: Response): Promise<void> => {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (userScoped && req.user) {
        conditions.push('user_id = $1');
        params.push(req.user.userId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await db.query(
        `SELECT COUNT(*) as total FROM "${tableName}" ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: { count: parseInt(result.rows[0].total, 10) },
      });
    },
  };
}
