import "server-only";
import { randomUUID } from "node:crypto";
import { ensureProductSchema, getDatabase } from "@/lib/database";
import type { Product, ProductInput } from "@/lib/product";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  imageUrls: string[];
  size: Product["size"];
  published: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

function toProduct(row: ProductRow): Product {
  return {
    ...row,
    imageUrls: Array.isArray(row.imageUrls) ? row.imageUrls : [],
    order: Number(row.order),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

const productColumns = `
  id,
  name,
  category,
  description,
  price,
  image_urls AS "imageUrls",
  size,
  published,
  sort_order AS "order",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

async function findProduct(id: string) {
  await ensureProductSchema();
  const sql = getDatabase();
  const rows = await sql.query(
    `SELECT ${productColumns} FROM public.catalog_products WHERE id = $1 LIMIT 1`,
    [id],
  ) as ProductRow[];
  return rows[0] ? toProduct(rows[0]) : null;
}

export async function listProducts(options: { publishedOnly?: boolean } = {}) {
  await ensureProductSchema();
  const sql = getDatabase();
  const rows = await sql.query(
    `SELECT ${productColumns}
     FROM public.catalog_products
     WHERE ($1::boolean = FALSE OR published = TRUE)
     ORDER BY sort_order ASC, created_at ASC`,
    [Boolean(options.publishedOnly)],
  ) as ProductRow[];
  return rows.map(toProduct);
}

export async function getProduct(id: string) {
  return findProduct(id);
}

export async function getUnreferencedImageUrls(urls: string[]) {
  if (urls.length === 0) return [];
  const products = await listProducts();
  const referenced = new Set(products.flatMap((product) => product.imageUrls));
  return urls.filter((url) => !referenced.has(url));
}

export async function createProduct(input: ProductInput) {
  await ensureProductSchema();
  const sql = getDatabase();
  const id = randomUUID();
  const rows = await sql.query(
    `INSERT INTO public.catalog_products (
       id, name, category, description, price, image_urls, size, published, sort_order
     ) VALUES (
       $1, $2, $3, $4, $5, $6::jsonb, $7, $8,
       (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM public.catalog_products)
     )
     RETURNING ${productColumns}`,
    [
      id,
      input.name,
      input.category,
      input.description,
      input.price,
      JSON.stringify(input.imageUrls),
      input.size,
      input.published,
    ],
  ) as ProductRow[];

  return toProduct(rows[0]);
}

export async function updateProduct(id: string, patch: Partial<ProductInput>) {
  const current = await findProduct(id);
  if (!current) return null;

  const next: ProductInput = {
    name: patch.name ?? current.name,
    category: patch.category ?? current.category,
    description: patch.description ?? current.description,
    price: patch.price ?? current.price,
    imageUrls: patch.imageUrls ?? current.imageUrls,
    size: patch.size ?? current.size,
    published: patch.published ?? current.published,
  };

  const sql = getDatabase();
  const rows = await sql.query(
    `UPDATE public.catalog_products
     SET name = $2,
         category = $3,
         description = $4,
         price = $5,
         image_urls = $6::jsonb,
         size = $7,
         published = $8,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${productColumns}`,
    [
      id,
      next.name,
      next.category,
      next.description,
      next.price,
      JSON.stringify(next.imageUrls),
      next.size,
      next.published,
    ],
  ) as ProductRow[];

  return rows[0] ? toProduct(rows[0]) : null;
}

export async function deleteProduct(id: string) {
  await ensureProductSchema();
  const sql = getDatabase();
  const [deleted] = await sql.transaction((transaction) => [
    transaction`DELETE FROM public.catalog_products WHERE id = ${id} RETURNING id`,
    transaction`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) - 1 AS next_order
        FROM public.catalog_products
      )
      UPDATE public.catalog_products AS product
      SET sort_order = ordered.next_order, updated_at = NOW()
      FROM ordered
      WHERE product.id = ordered.id AND product.sort_order <> ordered.next_order
    `,
  ]);

  return deleted.length > 0;
}

export async function reorderProducts(ids: string[]) {
  await ensureProductSchema();
  const products = await listProducts();
  if (products.length !== ids.length) {
    throw new Error("A lista de ordenação está desatualizada.");
  }

  const knownIds = new Set(products.map((product) => product.id));
  if (ids.some((id) => !knownIds.has(id))) {
    throw new Error("A ordenação contém um produto desconhecido.");
  }

  const sql = getDatabase();
  const results = await sql.transaction((transaction) => [
    ...ids.map((id, index) => transaction`
      UPDATE public.catalog_products
      SET sort_order = ${index}, updated_at = NOW()
      WHERE id = ${id}
    `),
    transaction.query(`SELECT ${productColumns} FROM public.catalog_products ORDER BY sort_order ASC, created_at ASC`),
  ]);
  const rows = results.at(-1) as ProductRow[];
  return rows.map(toProduct);
}
