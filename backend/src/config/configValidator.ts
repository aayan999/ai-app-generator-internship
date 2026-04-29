import { z } from 'zod';
import { logger } from '../utils/logger';

const log = logger.child('ConfigValidator');

/**
 * Zod schema for comprehensive config validation.
 * Every section is optional with sensible defaults — the config is resilient to missing data.
 */

const ThemeSchema = z.object({
  primaryColor: z.string().default('#6366f1'),
  secondaryColor: z.string().default('#8b5cf6'),
  mode: z.enum(['light', 'dark']).default('dark'),
}).default({});

const AppSchema = z.object({
  name: z.string().default('Generated App'),
  version: z.string().default('1.0.0'),
  description: z.string().default('A config-generated application'),
  defaultLanguage: z.string().default('en'),
  theme: ThemeSchema,
}).default({});

const TranslationsSchema = z.record(z.string(), z.record(z.string(), z.string())).default({
  en: { 'app.title': 'Generated App' },
});

const I18nSchema = z.object({
  supportedLanguages: z.array(z.string()).default(['en']),
  translations: TranslationsSchema,
}).default({});

const AuthMethodSchema = z.object({
  type: z.string(),
  enabled: z.boolean().default(true),
  passwordMinLength: z.number().optional(),
  requireUppercase: z.boolean().optional(),
  requireNumber: z.boolean().optional(),
  expiresInMinutes: z.number().optional(),
});

const JwtSchema = z.object({
  expiresIn: z.string().default('7d'),
  refreshEnabled: z.boolean().default(true),
}).default({});

const AuthSchema = z.object({
  enabled: z.boolean().default(true),
  methods: z.array(AuthMethodSchema).default([
    { type: 'email_password', enabled: true, passwordMinLength: 8 },
  ]),
  jwt: JwtSchema,
  userScoped: z.boolean().default(true),
}).default({});

const ForeignKeySchema = z.object({
  entity: z.string(),
  field: z.string(),
  onDelete: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).default('CASCADE'),
});

const FieldSchema = z.object({
  type: z.string().default('string'),
  primaryKey: z.boolean().optional(),
  auto: z.boolean().optional(),
  required: z.boolean().optional(),
  maxLength: z.number().optional(),
  values: z.array(z.string()).optional(),
  default: z.unknown().optional(),
  precision: z.number().optional(),
  scale: z.number().optional(),
  foreignKey: ForeignKeySchema.optional(),
});

const EntitySchema = z.object({
  tableName: z.string(),
  userScoped: z.boolean().default(true),
  fields: z.record(z.string(), FieldSchema),
});

const DatabaseSchema = z.object({
  entities: z.record(z.string(), EntitySchema).default({}),
}).default({});

const PaginationSchema = z.object({
  enabled: z.boolean().default(true),
  defaultLimit: z.number().default(20),
  maxLimit: z.number().default(100),
}).default({});

const SortSchema = z.object({
  enabled: z.boolean().default(true),
  defaultField: z.string().default('created_at'),
  defaultOrder: z.enum(['ASC', 'DESC']).default('DESC'),
}).default({});

const FilterSchema = z.object({
  type: z.string(),
  operator: z.string().default('eq'),
});

const SearchSchema = z.object({
  enabled: z.boolean().default(false),
  fields: z.array(z.string()).default([]),
}).default({});

const EndpointSchema = z.object({
  entity: z.string(),
  auth: z.boolean().default(true),
  operations: z.array(z.string()).default(['list', 'get', 'create', 'update', 'delete']),
  pagination: PaginationSchema,
  search: SearchSchema,
  sort: SortSchema,
  filters: z.record(z.string(), FilterSchema).default({}),
});

const ApiSchema = z.object({
  prefix: z.string().default('/api/v1'),
  endpoints: z.record(z.string(), EndpointSchema).default({}),
}).default({});

const ComponentSchema = z.object({
  type: z.string(),
  entity: z.string().optional(),
  label: z.string().optional(),
  aggregation: z.string().optional(),
  limit: z.number().optional(),
  columns: z.array(z.string()).optional(),
  sort: z.object({
    field: z.string(),
    order: z.enum(['ASC', 'DESC']).default('DESC'),
  }).optional(),
});

const TableConfigSchema = z.object({
  columns: z.array(z.string()).default([]),
  searchable: z.boolean().default(false),
  actions: z.array(z.string()).default(['edit', 'delete']),
}).default({});

const FormConfigSchema = z.object({
  fields: z.array(z.string()).default([]),
}).default({});

const PageSchema = z.object({
  title: z.string().default('Page'),
  layout: z.string().default('default'),
  entity: z.string().optional(),
  components: z.array(ComponentSchema).optional(),
  table: TableConfigSchema.optional(),
  form: FormConfigSchema.optional(),
});

const NavItemSchema = z.object({
  label: z.string(),
  path: z.string(),
  icon: z.string().optional(),
});

const UiSchema = z.object({
  pages: z.record(z.string(), PageSchema).default({}),
  navigation: z.array(NavItemSchema).default([]),
}).default({});

const ExportSchema = z.object({
  github: z.object({
    enabled: z.boolean().default(false),
    includeReadme: z.boolean().default(true),
    includeDockerfile: z.boolean().default(false),
    includeEnvExample: z.boolean().default(true),
  }).default({}),
}).default({});

/**
 * Root config schema — every top-level key is optional with defaults.
 */
export const AppConfigSchema = z.object({
  app: AppSchema,
  i18n: I18nSchema,
  auth: AuthSchema,
  database: DatabaseSchema,
  api: ApiSchema,
  ui: UiSchema,
  export: ExportSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Validates and normalizes a raw config object.
 * Returns a fully populated config with defaults filled in for any missing sections.
 */
export function validateConfig(rawConfig: unknown): AppConfig {
  const result = AppConfigSchema.safeParse(rawConfig);

  if (result.success) {
    log.info('Config validated successfully');
    return result.data;
  }

  // Log all validation issues as warnings — we still try to produce a usable config
  log.warn('Config has validation issues, applying defaults', {
    issues: result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  });

  // Attempt to parse with partial data — strip invalid fields
  try {
    const lenientSchema = AppConfigSchema.deepPartial();
    const lenientResult = lenientSchema.safeParse(rawConfig);
    if (lenientResult.success) {
      // Re-parse with the full schema to apply defaults
      const normalized = AppConfigSchema.parse({
        ...lenientResult.data,
      });
      return normalized;
    }
  } catch {
    log.warn('Lenient parsing also failed, using full defaults');
  }

  // Worst case: return a completely default config
  return AppConfigSchema.parse({});
}

/**
 * Cross-validates relationships between config sections.
 * For example, ensures API endpoints reference existing entities.
 */
export function crossValidateConfig(config: AppConfig): string[] {
  const warnings: string[] = [];
  const entityNames = new Set(Object.keys(config.database.entities));

  // Validate API endpoints reference existing entities
  for (const [name, endpoint] of Object.entries(config.api.endpoints)) {
    if (!entityNames.has(endpoint.entity)) {
      warnings.push(
        `API endpoint "${name}" references unknown entity "${endpoint.entity}". ` +
        `It will be skipped during route generation.`
      );
    }
  }

  // Validate UI pages reference existing entities
  for (const [name, page] of Object.entries(config.ui.pages)) {
    if (page.entity && !entityNames.has(page.entity)) {
      warnings.push(
        `UI page "${name}" references unknown entity "${page.entity}". ` +
        `Some features may not work.`
      );
    }
    if (page.components) {
      for (const comp of page.components) {
        if (comp.entity && !entityNames.has(comp.entity)) {
          warnings.push(
            `UI component in page "${name}" references unknown entity "${comp.entity}".`
          );
        }
      }
    }
  }

  // Validate foreign keys reference existing entities
  for (const [entityName, entity] of Object.entries(config.database.entities)) {
    for (const [fieldName, field] of Object.entries(entity.fields)) {
      if (field.foreignKey && !entityNames.has(field.foreignKey.entity)) {
        warnings.push(
          `Entity "${entityName}" field "${fieldName}" has a foreign key to unknown entity "${field.foreignKey.entity}".`
        );
      }
    }
  }

  if (warnings.length > 0) {
    log.warn('Cross-validation warnings found', { count: warnings.length });
    warnings.forEach((w) => log.warn(w));
  }

  return warnings;
}
