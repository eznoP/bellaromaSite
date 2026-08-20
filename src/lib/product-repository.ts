import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Product, ProductInput } from "@/lib/product";
import { storedProductsSchema } from "@/lib/product-schema";

const productsFile = join(process.cwd(), "data", "products.json");

let mutationQueue: Promise<unknown> = Promise.resolve();

async function readProductsFile(): Promise<Product[]> {
  const contents = await readFile(productsFile, "utf8");
  const parsed = storedProductsSchema.safeParse(JSON.parse(contents));

  if (!parsed.success) {
    throw new Error("O arquivo de produtos contém dados inválidos.");
  }

  return parsed.data.sort((left, right) => left.order - right.order);
}

async function writeProductsFile(products: Product[]) {
  await mkdir(dirname(productsFile), { recursive: true });
  const temporaryFile = `${productsFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  await rename(temporaryFile, productsFile);
}

function serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
  const next = mutationQueue.then(operation, operation);
  mutationQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function listProducts(options: { publishedOnly?: boolean } = {}) {
  const products = await readProductsFile();
  return options.publishedOnly ? products.filter((product) => product.published) : products;
}

export async function createProduct(input: ProductInput) {
  return serializeMutation(async () => {
    const products = await readProductsFile();
    const now = new Date().toISOString();
    const product: Product = {
      ...input,
      id: randomUUID(),
      order: products.length,
      createdAt: now,
      updatedAt: now,
    };

    products.push(product);
    await writeProductsFile(products);
    return product;
  });
}

export async function updateProduct(id: string, patch: Partial<ProductInput>) {
  return serializeMutation(async () => {
    const products = await readProductsFile();
    const index = products.findIndex((product) => product.id === id);
    if (index < 0) return null;

    const product: Product = {
      ...products[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    products[index] = product;
    await writeProductsFile(products);
    return product;
  });
}

export async function deleteProduct(id: string) {
  return serializeMutation(async () => {
    const products = await readProductsFile();
    const nextProducts = products.filter((product) => product.id !== id);
    if (nextProducts.length === products.length) return false;

    nextProducts.forEach((product, index) => {
      product.order = index;
    });
    await writeProductsFile(nextProducts);
    return true;
  });
}

export async function reorderProducts(ids: string[]) {
  return serializeMutation(async () => {
    const products = await readProductsFile();
    if (products.length !== ids.length) {
      throw new Error("A lista de ordenação está desatualizada.");
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const reordered = ids.map((id) => productsById.get(id));
    if (reordered.some((product) => !product)) {
      throw new Error("A ordenação contém um produto desconhecido.");
    }

    const now = new Date().toISOString();
    const normalized = reordered.map((product, index) => ({
      ...product!,
      order: index,
      updatedAt: now,
    }));
    await writeProductsFile(normalized);
    return normalized;
  });
}
