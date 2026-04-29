import { Router } from 'express';
import { AppConfig } from '../config/configValidator';
import { configLoader } from '../config/configLoader';
import { generateCrudHandlers } from './crudGenerator';
import { createValidationMiddleware } from './validationMiddleware';
import { authMiddleware, optionalAuthMiddleware } from '../auth/authMiddleware';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const log = logger.child('DynamicRouter');

/**
 * Generates all REST API routes dynamically from the JSON config.
 * Each endpoint maps to an entity with CRUD operations.
 */
export function createDynamicRouter(): Router {
  const router = Router();
  const config = configLoader.getConfig();
  const entities = config.database.entities;
  const endpoints = config.api.endpoints;

  for (const [endpointName, endpointDef] of Object.entries(endpoints)) {
    const entityDef = entities[endpointDef.entity];

    if (!entityDef) {
      log.warn(`Skipping endpoint "${endpointName}": entity "${endpointDef.entity}" not found`);
      continue;
    }

    const userScoped = entityDef.userScoped && config.auth.userScoped;
    const endpointRouter = Router();

    // Apply auth middleware
    const authMw = endpointDef.auth ? authMiddleware : optionalAuthMiddleware;

    // Generate CRUD handlers
    const handlers = generateCrudHandlers({
      entity: endpointDef.entity,
      entityDef,
      endpointDef,
      userScoped,
    });

    // Create validation middleware
    const createValidation = createValidationMiddleware(entityDef, false);
    const updateValidation = createValidationMiddleware(entityDef, true);

    // Register routes based on allowed operations
    const ops = new Set(endpointDef.operations);

    if (ops.has('list')) {
      endpointRouter.get('/', authMw, asyncHandler(handlers.list));
      log.debug(`  GET /${endpointName}`);
    }

    // Count endpoint (always available if list is available)
    if (ops.has('list')) {
      endpointRouter.get('/count', authMw, asyncHandler(handlers.count));
      log.debug(`  GET /${endpointName}/count`);
    }

    if (ops.has('get')) {
      endpointRouter.get('/:id', authMw, asyncHandler(handlers.get));
      log.debug(`  GET /${endpointName}/:id`);
    }

    if (ops.has('create')) {
      endpointRouter.post('/', authMw, createValidation, asyncHandler(handlers.create));
      log.debug(`  POST /${endpointName}`);
    }

    if (ops.has('update')) {
      endpointRouter.put('/:id', authMw, updateValidation, asyncHandler(handlers.update));
      log.debug(`  PUT /${endpointName}/:id`);
    }

    if (ops.has('delete')) {
      endpointRouter.delete('/:id', authMw, asyncHandler(handlers.delete));
      log.debug(`  DELETE /${endpointName}/:id`);
    }

    router.use(`/${endpointName}`, endpointRouter);
    log.info(`Routes generated for: /${endpointName} (${ops.size} operations)`);
  }

  return router;
}

/**
 * Creates the config endpoint — serves the config to the frontend.
 * Strips sensitive data before sending.
 */
export function createConfigRouter(): Router {
  const router = Router();

  router.get('/config', (_req, res) => {
    const config = configLoader.getConfig();

    // Strip sensitive data
    const safeConfig = {
      app: config.app,
      i18n: config.i18n,
      auth: {
        enabled: config.auth.enabled,
        methods: config.auth.methods.map((m) => ({
          type: m.type,
          enabled: m.enabled,
        })),
        userScoped: config.auth.userScoped,
      },
      database: {
        entities: Object.fromEntries(
          Object.entries(config.database.entities).map(([name, entity]) => [
            name,
            {
              tableName: entity.tableName,
              fields: entity.fields,
              userScoped: entity.userScoped,
            },
          ])
        ),
      },
      ui: config.ui,
      export: config.export,
    };

    res.json({ success: true, data: safeConfig });
  });

  return router;
}
