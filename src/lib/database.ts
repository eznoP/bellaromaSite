import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;
let schemaPromise: Promise<void> | undefined;

const sampleProductIds = [
  "mesa-posta",
  "casa-macia",
  "leve-com-voce",
  "cheiro-de-casa",
  "cuidado-diario",
  "uma-peca-so-sua",
];

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
      CREATE TABLE IF NOT EXISTS public.products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        price TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
        artwork TEXT NOT NULL DEFAULT 'custom',
        size TEXT NOT NULL DEFAULT 'medium',
        tone TEXT NOT NULL DEFAULT 'ivory',
        published BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price TEXT NOT NULL DEFAULT ''`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS artwork TEXT NOT NULL DEFAULT 'custom'`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT 'medium'`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tone TEXT NOT NULL DEFAULT 'ivory'`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    transaction`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    transaction`CREATE INDEX IF NOT EXISTS products_sort_order_idx ON public.products (sort_order)`,
    transaction`
      UPDATE public.products
      SET image_urls = jsonb_build_array(image_url)
      WHERE image_url <> '' AND image_urls = '[]'::jsonb
    `,
    transaction`
      CREATE TABLE IF NOT EXISTS public.categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    transaction`CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique_idx ON public.categories (LOWER(name))`,
    transaction`DELETE FROM public.products WHERE id = ANY(${sampleProductIds})`,
  ]);
}

export async function ensureProductSchema() {
  schemaPromise ??= initializeProductSchema().catch((error) => {
    schemaPromise = undefined;
    throw error;
  });

  await schemaPromise;
}
