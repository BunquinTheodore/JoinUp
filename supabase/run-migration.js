// Run: node supabase/run-migration.js
// Requires DATABASE_URL environment variable (see .env)
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function isDuplicateObjectError(err) {
  const duplicateErrorCodes = new Set([
    '42710', // duplicate_object
    '42P07', // duplicate_table
    '42701', // duplicate_column
    '42P06', // duplicate_schema
    '42723', // duplicate_function
    '42P16', // invalid_table_definition (often raised by duplicate constraints)
  ]);

  return duplicateErrorCodes.has(err?.code);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Set it from your .env file before running this script.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase Postgres.');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      try {
        await client.query(sql);
        console.log(`Applied migration: ${migrationFile}`);
      } catch (err) {
        if (isDuplicateObjectError(err)) {
          console.log(`Skipped existing objects in migration: ${migrationFile}`);
          continue;
        }

        throw err;
      }
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
