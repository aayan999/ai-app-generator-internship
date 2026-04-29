/**
 * Config parser — fetches and normalizes the app config from the backend.
 * Provides typed access to all config sections with safe fallbacks.
 */

export interface AppTheme {
  primaryColor: string;
  secondaryColor: string;
  mode: 'light' | 'dark';
}

export interface AppInfo {
  name: string;
  version: string;
  description: string;
  defaultLanguage: string;
  theme: AppTheme;
}

export interface I18nConfig {
  supportedLanguages: string[];
  translations: Record<string, Record<string, string>>;
}

export interface AuthMethodConfig {
  type: string;
  enabled: boolean;
}

export interface AuthConfig {
  enabled: boolean;
  methods: AuthMethodConfig[];
  userScoped: boolean;
}

export interface FieldDef {
  type: string;
  primaryKey?: boolean;
  auto?: boolean;
  required?: boolean;
  maxLength?: number;
  values?: string[];
  default?: unknown;
  precision?: number;
  scale?: number;
  foreignKey?: {
    entity: string;
    field: string;
    onDelete: string;
  };
}

export interface EntityDef {
  tableName: string;
  fields: Record<string, FieldDef>;
  userScoped: boolean;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

export interface PageComponent {
  type: string;
  entity?: string;
  label?: string;
  aggregation?: string;
  limit?: number;
  columns?: string[];
  sort?: { field: string; order: string };
}

export interface TableConfig {
  columns: string[];
  searchable: boolean;
  actions: string[];
}

export interface FormConfig {
  fields: string[];
}

export interface PageDef {
  title: string;
  layout: string;
  entity?: string;
  components?: PageComponent[];
  table?: TableConfig;
  form?: FormConfig;
}

export interface UiConfig {
  pages: Record<string, PageDef>;
  navigation: NavItem[];
}

export interface ExportConfig {
  github: {
    enabled: boolean;
    includeReadme: boolean;
    includeDockerfile: boolean;
    includeEnvExample: boolean;
  };
}

export interface FullConfig {
  app: AppInfo;
  i18n: I18nConfig;
  auth: AuthConfig;
  database: { entities: Record<string, EntityDef> };
  ui: UiConfig;
  export: ExportConfig;
}

/**
 * Default config — used when the backend is unreachable.
 */
export const DEFAULT_CONFIG: FullConfig = {
  app: {
    name: 'AI App Generator',
    version: '1.0.0',
    description: 'A config-driven application',
    defaultLanguage: 'en',
    theme: {
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      mode: 'dark',
    },
  },
  i18n: {
    supportedLanguages: ['en'],
    translations: {
      en: {
        'app.title': 'AI App Generator',
        'nav.dashboard': 'Dashboard',
        'auth.login': 'Log In',
        'auth.signup': 'Sign Up',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.name': 'Name',
        'form.submit': 'Submit',
        'form.cancel': 'Cancel',
        'common.error': 'Something went wrong',
      },
    },
  },
  auth: {
    enabled: true,
    methods: [{ type: 'email_password', enabled: true }],
    userScoped: true,
  },
  database: { entities: {} },
  ui: { pages: {}, navigation: [] },
  export: {
    github: {
      enabled: false,
      includeReadme: true,
      includeDockerfile: false,
      includeEnvExample: true,
    },
  },
};

/**
 * Normalizes config data — fills in any missing sections from defaults.
 */
export function normalizeConfig(raw: Partial<FullConfig> | null | undefined): FullConfig {
  if (!raw) return DEFAULT_CONFIG;

  return {
    app: { ...DEFAULT_CONFIG.app, ...(raw.app || {}) },
    i18n: {
      supportedLanguages: raw.i18n?.supportedLanguages || DEFAULT_CONFIG.i18n.supportedLanguages,
      translations: { ...DEFAULT_CONFIG.i18n.translations, ...(raw.i18n?.translations || {}) },
    },
    auth: { ...DEFAULT_CONFIG.auth, ...(raw.auth || {}) },
    database: {
      entities: raw.database?.entities || DEFAULT_CONFIG.database.entities,
    },
    ui: {
      pages: raw.ui?.pages || DEFAULT_CONFIG.ui.pages,
      navigation: raw.ui?.navigation || DEFAULT_CONFIG.ui.navigation,
    },
    export: {
      github: { ...DEFAULT_CONFIG.export.github, ...(raw.export?.github || {}) },
    },
  };
}
