import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';
import { AppConfig } from '../config/configValidator';
import { ValidationError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const log = logger.child('Validation');

/**
 * Builds a Zod validation schema dynamically from entity field definitions.
 * Handles all field types defined in the config.
 */
export function buildValidationSchema(
  entity: AppConfig['database']['entities'][string],
  isUpdate: boolean = false
): ZodType {
  const shape: Record<string, ZodType> = {};

  for (const [fieldName, field] of Object.entries(entity.fields)) {
    // Skip auto-generated fields
    if (field.auto || field.primaryKey) continue;

    let fieldSchema: ZodType;

    switch (field.type) {
      case 'uuid':
        fieldSchema = z.string().uuid();
        break;
      case 'string':
        fieldSchema = z.string().max(field.maxLength || 255);
        break;
      case 'text':
        fieldSchema = z.string();
        break;
      case 'integer':
      case 'int':
        fieldSchema = z.number().int();
        break;
      case 'decimal':
      case 'float':
      case 'number':
        fieldSchema = z.number();
        break;
      case 'boolean':
      case 'bool':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.string().refine(
          (val) => !isNaN(Date.parse(val)),
          { message: `${fieldName} must be a valid date` }
        );
        break;
      case 'timestamp':
      case 'datetime':
        fieldSchema = z.string().refine(
          (val) => !isNaN(Date.parse(val)),
          { message: `${fieldName} must be a valid datetime` }
        );
        break;
      case 'enum':
        if (field.values && field.values.length > 0) {
          fieldSchema = z.enum(field.values as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
      case 'json':
      case 'array':
        fieldSchema = z.unknown();
        break;
      default:
        fieldSchema = z.string();
    }

    // Make optional if not required or if it's an update
    if (!field.required || isUpdate) {
      fieldSchema = fieldSchema.optional().nullable();
    }

    shape[fieldName] = fieldSchema;
  }

  return z.object(shape).passthrough();
}

/**
 * Express middleware factory — validates request body against an entity schema.
 */
export function createValidationMiddleware(
  entity: AppConfig['database']['entities'][string],
  isUpdate: boolean = false
) {
  const schema = buildValidationSchema(entity, isUpdate);

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = (schema as z.ZodObject<any>).safeParse(req.body);
      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        throw new ValidationError('Validation failed', errors);
      }
      req.body = result.data;
      next();
    } catch (err) {
      if (err instanceof ValidationError) {
        next(err);
      } else {
        log.warn('Validation error', { error: err });
        next(new ValidationError('Invalid request data'));
      }
    }
  };
}
