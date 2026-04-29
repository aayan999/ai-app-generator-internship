import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, validateConfig, crossValidateConfig } from './configValidator';
import { logger } from '../utils/logger';

const log = logger.child('ConfigLoader');

/**
 * Singleton config loader.
 * Reads the JSON config file, validates it, and provides type-safe access.
 */
class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig | null = null;
  private warnings: string[] = [];
  private configPath: string;

  private constructor() {
    this.configPath = process.env.CONFIG_PATH || path.resolve(__dirname, '../../../config/app-config.json');
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Loads and validates the config from disk.
   * Handles: missing file, invalid JSON, incomplete config, and invalid relationships.
   */
  load(): AppConfig {
    if (this.config) return this.config;

    let rawData: string;
    let rawConfig: unknown;

    // Step 1: Read file
    try {
      const resolvedPath = path.resolve(this.configPath);
      log.info(`Loading config from: ${resolvedPath}`);

      if (!fs.existsSync(resolvedPath)) {
        log.warn(`Config file not found at ${resolvedPath}, using defaults`);
        this.config = validateConfig({});
        return this.config;
      }

      rawData = fs.readFileSync(resolvedPath, 'utf-8');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Failed to read config file: ${message}`);
      this.config = validateConfig({});
      return this.config;
    }

    // Step 2: Parse JSON
    try {
      rawConfig = JSON.parse(rawData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Invalid JSON in config file: ${message}`);
      this.config = validateConfig({});
      return this.config;
    }

    // Step 3: Validate structure
    this.config = validateConfig(rawConfig);

    // Step 4: Cross-validate relationships
    this.warnings = crossValidateConfig(this.config);

    log.info('Config loaded successfully', {
      app: this.config.app.name,
      entities: Object.keys(this.config.database.entities).length,
      endpoints: Object.keys(this.config.api.endpoints).length,
      pages: Object.keys(this.config.ui.pages).length,
      languages: this.config.i18n.supportedLanguages.length,
    });

    return this.config;
  }

  /**
   * Returns the loaded config. Throws if not yet loaded.
   */
  getConfig(): AppConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Returns any cross-validation warnings.
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Force a reload of the config (useful for development hot-reloading).
   */
  reload(): AppConfig {
    this.config = null;
    this.warnings = [];
    return this.load();
  }

  /**
   * Returns the raw config as JSON (for the frontend to consume).
   */
  toJSON(): AppConfig {
    return this.getConfig();
  }
}

export const configLoader = ConfigLoader.getInstance();
export type { AppConfig };
