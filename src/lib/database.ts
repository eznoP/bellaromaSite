import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;
let schemaPromise: Promise<void> | undefined;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL não foi configurada.");
  }

  client ??= neon(connectionString);
  return client;
}

async function initializeProductSchema() {
  const sql = getDatabase();

  await sql.transaction((transaction) => [
    transaction`
      CREATE TABLE IF NOT EXISTS public.categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    transaction`CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique_idx ON public.categories (LOWER(name))`,
    transaction`
      CREATE TABLE IF NOT EXISTS public.catalog_products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        price TEXT NOT NULL DEFAULT '',
        image_urls JSONB NOT NULL,
        size TEXT NOT NULL DEFAULT 'medium',
        published BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT catalog_products_has_images CHECK (
          jsonb_typeof(image_urls) = 'array' AND jsonb_array_length(image_urls) BETWEEN 1 AND 5
        )
      )
    `,
    transaction`CREATE INDEX IF NOT EXISTS catalog_products_sort_order_idx ON public.catalog_products (sort_order)`,
  ]);
}

export async function ensureProductSchema() {
  schemaPromise ??= initializeProductSchema().catch((error) => {
    schemaPromise = undefined;
    throw error;
  });

  await schemaPromise;
}
