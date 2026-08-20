import "server-only";
import { randomUUID } from "node:crypto";
import { ensureProductSchema, getDatabase } from "@/lib/database";
import type { Category } from "@/lib/category";

type CategoryRow = {
  id: string;
  name: string;
  createdAt: string;
};

function toCategory(row: CategoryRow): Category {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function listCategories() {
  await ensureProductSchema();
  const sql = getDatabase();
  const rows = await sql.query(
    `SELECT id, name, created_at AS "createdAt"
     FROM public.categories
     ORDER BY LOWER(name) ASC`,
  ) as CategoryRow[];
  return rows.map(toCategory);
}

export async function createCategory(name: string) {
  await ensureProductSchema();
  const sql = getDatabase();
  const rows = await sql.query(
    `INSERT INTO public.categories (id, name)
     VALUES ($1, $2)
     RETURNING id, name, created_at AS "createdAt"`,
    [randomUUID(), name],
  ) as CategoryRow[];
  return toCategory(rows[0]);
}

export async function deleteCategory(id: string) {
  await ensureProductSchema();
  const sql = getDatabase();
  const rows = await sql.query(
    `DELETE FROM public.categories AS category
     WHERE category.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM public.products
         WHERE LOWER(public.products.category) = LOWER(category.name)
       )
     RETURNING id`,
    [id],
  ) as Array<{ id: string }>;
  return rows.length > 0;
}
