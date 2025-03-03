/**
 * Command-line script that manages database migrations for the Engagerr platform using Prisma ORM
 * Provides utilities for creating, applying, rolling back, and tracking migrations
 * with proper logging and error handling
 */

import { PrismaClient } from '@prisma/client'; // ^4.14.0
import { ENVIRONMENT, IS_PRODUCTION } from '../src/config/constants';
import { logger } from '../src/utils/logger';
import * as fs from 'fs'; // built-in
import * as path from 'path'; // built-in
import { execSync } from 'child_process'; // built-in
import yargs from 'yargs'; // ^17.7.2
import chalk from 'chalk'; // ^4.1.2
import * as readline from 'readline'; // built-in

// Global constants for file paths
const MIGRATIONS_DIR = path.resolve(__dirname, '../prisma/migrations');
const SCHEMA_PATH = path.resolve(__dirname, '../prisma/schema.prisma');
const MIGRATION_HISTORY_FILE = path.resolve(__dirname, '../prisma/migration_history.json');

/**
 * Creates a new migration based on schema changes with a descriptive name
 * @param name The descriptive name for the migration
 * @returns Path to the created migration directory
 */
async function createMigration(name: string): Promise<string> {
  // Validate migration name format
  if (!name) {
    throw new Error('Migration name is required');
  }
  
  // Make sure name only contains alphanumeric characters and underscores
  const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  
  // Format the migration name with timestamp prefix
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const migrationName = `${timestamp}_${sanitizedName}`;
  
  logger.info(`Creating migration: ${migrationName}`);
  
  try {
    // Execute Prisma migrate dev command
    const command = `npx prisma migrate dev --name ${migrationName} --create-only`;
    execSync(command, { stdio: 'inherit' });
    
    const migrationPath = path.join(MIGRATIONS_DIR, migrationName);
    
    // Verify migration directory was created
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Failed to create migration: ${migrationName}`);
    }
    
    // Update migration history file with the new migration
    await updateMigrationHistory({
      id: migrationName,
      name: sanitizedName,
      timestamp: new Date().toISOString(),
      status: 'pending',
      createdBy: process.env.USER || 'unknown'
    });
    
    logger.info(`Successfully created migration: ${migrationName}`);
    return migrationPath;
  } catch (err) {
    logger.error({ err }, `Failed to create migration: ${name}`);
    throw err;
  }
}

/**
 * Applies pending migrations to the database
 * @param deployMode Whether to run in deploy mode (production) or dev mode
 */
async function applyMigrations(deployMode: boolean): Promise<void> {
  logger.info(`Applying migrations in ${deployMode ? 'deploy' : 'dev'} mode`);
  
  try {
    // Determine migration command based on environment
    const command = deployMode 
      ? 'npx prisma migrate deploy' // For production deployments
      : 'npx prisma migrate dev'; // For development environment
    
    execSync(command, { stdio: 'inherit' });
    
    // Get the current migration status after applying migrations
    const status = await getMigrationStatus();
    logger.info(`Successfully applied migrations. Applied: ${(status as any).applied.length}, Pending: ${(status as any).pending.length}`);
    
    // Generate updated client if necessary
    await generateClient();
  } catch (err) {
    logger.error({ err }, 'Failed to apply migrations');
    throw err;
  }
}

/**
 * Rolls back the most recent migration or to a specified migration
 * @param migrationId Optional ID of migration to roll back to
 */
async function rollbackMigration(migrationId?: string): Promise<void> {
  if (IS_PRODUCTION) {
    logger.warn('Rollback in production environment detected. Proceed with caution!');
  }
  
  try {
    // Verify current migration state
    const status = await getMigrationStatus();
    const appliedMigrations = (status as any).applied;
    
    if (appliedMigrations.length === 0) {
      logger.info('No migrations to roll back');
      return;
    }
    
    let targetMigration;
    let migrationIndex;
    
    if (migrationId) {
      // If migrationId provided, roll back to that specific migration
      migrationIndex = appliedMigrations.findIndex((m: any) => m.id === migrationId);
      
      if (migrationIndex === -1) {
        throw new Error(`Migration ${migrationId} not found in applied migrations`);
      }
      
      // The target is the migration before the one we want to roll back to
      targetMigration = migrationIndex > 0 ? appliedMigrations[migrationIndex - 1].id : null;
      
      logger.info(`Rolling back to migration: ${migrationId}`);
    } else {
      // Otherwise, roll back just the most recent migration
      targetMigration = appliedMigrations.length > 1 ? appliedMigrations[appliedMigrations.length - 2].id : null;
      
      logger.info('Rolling back most recent migration');
    }
    
    if (targetMigration) {
      // Mark the migration as rolled back
      const command = `npx prisma migrate resolve --rolled-back ${appliedMigrations[appliedMigrations.length - 1].id}`;
      execSync(command, { stdio: 'inherit' });
      
      // Execute database commands to revert schema changes
      logger.info('Applying schema changes to match the rollback state');
      execSync(`npx prisma db execute --file ./prisma/migrations/${targetMigration}/migration.sql`, { stdio: 'inherit' });
    } else {
      // Rolling back to initial state (no migrations)
      logger.info('Rolling back to initial state (no migrations)');
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    }
    
    // Update migration history file to reflect the rollback
    const history = JSON.parse(fs.readFileSync(MIGRATION_HISTORY_FILE, 'utf8'));
    history.migrations = history.migrations.filter((m: any) => 
      !appliedMigrations.slice(migrationId ? migrationIndex : -1).some((am: any) => am.id === m.id)
    );
    history.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MIGRATION_HISTORY_FILE, JSON.stringify(history, null, 2));
    
    // Generate updated client to match new schema state
    await generateClient();
    
    logger.info('Successfully rolled back migration(s)');
  } catch (err) {
    logger.error({ err }, 'Failed to roll back migration');
    throw err;
  }
}

/**
 * Lists all migrations and their status (applied or pending)
 */
async function listMigrations(): Promise<void> {
  try {
    // Read migration history from file
    const status = await getMigrationStatus();
    const applied = (status as any).applied;
    const pending = (status as any).pending;
    
    console.log('\n');
    console.log(chalk.bold('MIGRATION STATUS'));
    console.log('===============================');
    
    // Display applied migrations
    console.log(chalk.green.bold('\nAPPLIED MIGRATIONS:'));
    if (applied.length === 0) {
      console.log(chalk.gray('  No migrations applied yet'));
    } else {
      applied.forEach((migration: any, index: number) => {
        const timestamp = new Date(migration.timestamp).toLocaleString();
        console.log(chalk.green(`  ${index + 1}. ${migration.id}`));
        console.log(chalk.gray(`     Applied: ${timestamp}`));
      });
    }
    
    // Display pending migrations
    console.log(chalk.yellow.bold('\nPENDING MIGRATIONS:'));
    if (pending.length === 0) {
      console.log(chalk.gray('  No pending migrations'));
    } else {
      pending.forEach((migration: any, index: number) => {
        console.log(chalk.yellow(`  ${index + 1}. ${migration.id}`));
        console.log(chalk.gray(`     Created: ${new Date(migration.timestamp).toLocaleString()}`));
      });
    }
    
    // Show summary information of migration state
    console.log('\n' + chalk.bold('SUMMARY:'));
    console.log(`  Total migrations: ${applied.length + pending.length}`);
    console.log(`  Applied: ${applied.length}`);
    console.log(`  Pending: ${pending.length}`);
    console.log('\n');
  } catch (err) {
    logger.error({ err }, 'Failed to list migrations');
    throw err;
  }
}

/**
 * Retrieves the status of migrations compared to the database
 * @returns Object containing applied and pending migrations
 */
async function getMigrationStatus(): Promise<object> {
  try {
    // Create connection to the database
    const prisma = new PrismaClient();
    
    // Query the database for applied migrations
    let appliedMigrations: any[] = [];
    try {
      // This query might fail if the _prisma_migrations table doesn't exist yet
      appliedMigrations = await prisma.$queryRaw`
        SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at
        FROM _prisma_migrations
        ORDER BY started_at ASC
      `;
    } catch (e) {
      logger.debug('Could not query _prisma_migrations table, it may not exist yet');
    }
    
    // Format applied migrations
    const applied = appliedMigrations.map(m => ({
      id: m.migration_name,
      timestamp: m.finished_at,
      status: 'applied'
    }));
    
    // Read migration history file
    let history = { migrations: [] };
    if (fs.existsSync(MIGRATION_HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(MIGRATION_HISTORY_FILE, 'utf8'));
    }
    
    // Read local migration files
    const migrationDirs = fs.existsSync(MIGRATIONS_DIR) 
      ? fs.readdirSync(MIGRATIONS_DIR).filter(dir => 
          fs.statSync(path.join(MIGRATIONS_DIR, dir)).isDirectory()
        )
      : [];
    
    // Compare to determine which migrations are pending
    const pending = migrationDirs
      .filter(dir => !applied.some(m => m.id === dir))
      .map(dir => {
        const migInfo = history.migrations.find((m: any) => m.id === dir) || {};
        return {
          id: dir,
          timestamp: migInfo.timestamp || new Date().toISOString(),
          status: 'pending'
        };
      });
    
    // Close database connection
    await prisma.$disconnect();
    
    // Return object with lists of applied and pending migrations
    return { applied, pending };
  } catch (err) {
    logger.error({ err }, 'Failed to get migration status');
    throw err;
  }
}

/**
 * Resets the database by dropping all tables and reapplying migrations (development only)
 */
async function resetDatabase(): Promise<void> {
  // Verify environment is not production to prevent accidental data loss
  if (IS_PRODUCTION) {
    throw new Error('Cannot reset database in production environment');
  }
  
  logger.warn('This will reset the entire database and apply all migrations from scratch');
  console.log(chalk.red.bold('\nWARNING: All data will be lost. This action cannot be undone.\n'));
  
  // Prompt for confirmation before proceeding
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const response = await new Promise<string>(resolve => {
    rl.question(chalk.yellow('Type "CONFIRM" to proceed: '), (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
  
  if (response !== 'CONFIRM') {
    console.log(chalk.blue('Reset cancelled'));
    return;
  }
  
  try {
    logger.info('Resetting database...');
    
    // Execute Prisma migrate reset command
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    
    // Clear migration history file
    const emptyHistory = { 
      migrations: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(MIGRATION_HISTORY_FILE, JSON.stringify(emptyHistory, null, 2));
    
    // Reapply all migrations from scratch
    await applyMigrations(false);
    
    logger.info('Successfully reset database and reapplied migrations');
  } catch (err) {
    logger.error({ err }, 'Failed to reset database');
    throw err;
  }
}

/**
 * Generates an updated Prisma client based on the current schema
 */
async function generateClient(): Promise<void> {
  logger.info('Generating Prisma client...');
  
  try {
    // Execute Prisma generate command
    execSync('npx prisma generate', { stdio: 'inherit' });
    logger.info('Successfully generated Prisma client');
  } catch (err) {
    logger.error({ err }, 'Failed to generate Prisma client');
    throw err;
  }
}

/**
 * Validates the Prisma schema for errors before migration
 * @returns True if schema is valid, false otherwise
 */
async function validateSchema(): Promise<boolean> {
  logger.info('Validating Prisma schema...');
  
  try {
    // Execute Prisma validate command
    execSync('npx prisma validate', { stdio: 'pipe' });
    logger.info('Schema validation successful');
    return true;
  } catch (err) {
    // Parse output for validation errors
    logger.error({ err }, 'Schema validation failed');
    const output = (err as any).output?.toString() || (err as any).message || '';
    
    // Log any issues found in the schema
    console.log(chalk.red('\nSchema Validation Errors:'));
    console.log(chalk.red(output));
    
    return false;
  }
}

/**
 * Updates the migration history file with information about applied migrations
 * @param migrationInfo Information about the migration to add or update
 */
async function updateMigrationHistory(migrationInfo: object): Promise<void> {
  try {
    // Read existing migration history file
    if (!fs.existsSync(MIGRATION_HISTORY_FILE)) {
      fs.writeFileSync(MIGRATION_HISTORY_FILE, JSON.stringify({ migrations: [], lastUpdated: new Date().toISOString() }, null, 2));
    }
    
    const history = JSON.parse(fs.readFileSync(MIGRATION_HISTORY_FILE, 'utf8'));
    
    // Merge new migration information
    const existingIndex = history.migrations.findIndex((m: any) => m.id === (migrationInfo as any).id);
    
    if (existingIndex >= 0) {
      history.migrations[existingIndex] = {
        ...history.migrations[existingIndex],
        ...migrationInfo
      };
    } else {
      history.migrations.push(migrationInfo);
    }
    
    // Write updated history back to file
    history.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MIGRATION_HISTORY_FILE, JSON.stringify(history, null, 2));
    
    // Log the update to migration history
    logger.debug(`Updated migration history for: ${(migrationInfo as any).id}`);
  } catch (err) {
    logger.error({ err }, 'Failed to update migration history');
    throw err;
  }
}

/**
 * Main function that parses command-line arguments and executes appropriate migration commands
 */
async function main(): Promise<void> {
  // Set up command-line interface with yargs
  yargs(process.argv.slice(2))
    .usage('Usage: $0 <command> [options]')
    .command('create <name>', 'Create a new migration', (yargs) => {
      return yargs.positional('name', {
        describe: 'The name of the migration',
        type: 'string',
        demandOption: true
      });
    }, async (argv) => {
      try {
        // Validate schema before creating migration
        const isValid = await validateSchema();
        if (!isValid) {
          console.error(chalk.red('Cannot create migration: Schema has validation errors'));
          process.exit(1);
        }
        
        await createMigration(argv.name as string);
      } catch (err) {
        logger.error({ err }, 'Failed to create migration');
        process.exit(1);
      }
    })
    .command('apply', 'Apply pending migrations', (yargs) => {
      return yargs.option('deploy', {
        alias: 'd',
        type: 'boolean',
        description: 'Run in deployment mode (for production environments)',
        default: IS_PRODUCTION
      });
    }, async (argv) => {
      try {
        await applyMigrations(argv.deploy as boolean);
      } catch (err) {
        logger.error({ err }, 'Failed to apply migrations');
        process.exit(1);
      }
    })
    .command('rollback [migrationId]', 'Roll back the most recent migration or to a specified migration', (yargs) => {
      return yargs.positional('migrationId', {
        describe: 'The ID of the migration to roll back to',
        type: 'string'
      });
    }, async (argv) => {
      try {
        await rollbackMigration(argv.migrationId as string | undefined);
      } catch (err) {
        logger.error({ err }, 'Failed to roll back migration');
        process.exit(1);
      }
    })
    .command('list', 'List all migrations and their status', {}, async () => {
      try {
        await listMigrations();
      } catch (err) {
        logger.error({ err }, 'Failed to list migrations');
        process.exit(1);
      }
    })
    .command('status', 'Show migration status', {}, async () => {
      try {
        const status = await getMigrationStatus();
        console.log(JSON.stringify(status, null, 2));
      } catch (err) {
        logger.error({ err }, 'Failed to get migration status');
        process.exit(1);
      }
    })
    .command('reset', 'Reset the database (Development only)', {}, async () => {
      try {
        await resetDatabase();
      } catch (err) {
        logger.error({ err }, 'Failed to reset database');
        process.exit(1);
      }
    })
    .command('generate', 'Generate Prisma client', {}, async () => {
      try {
        await generateClient();
      } catch (err) {
        logger.error({ err }, 'Failed to generate client');
        process.exit(1);
      }
    })
    .command('validate', 'Validate Prisma schema', {}, async () => {
      try {
        const isValid = await validateSchema();
        process.exit(isValid ? 0 : 1);
      } catch (err) {
        logger.error({ err }, 'Failed to validate schema');
        process.exit(1);
      }
    })
    .demandCommand(1, 'You must specify a command')
    .strict()
    .help()
    .argv;
}

// Execute main function
main().catch(err => {
  logger.error({ err }, 'Migration command failed');
  process.exit(1);
});