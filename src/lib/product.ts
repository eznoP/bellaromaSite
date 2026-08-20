export const PRODUCT_ARTWORKS = [
  "table",
  "pillow",
  "bottle",
  "aroma",
  "soap",
  "custom",
] as const;

export const PRODUCT_SIZES = ["wide", "tall", "compact", "medium", "long"] as const;
export const PRODUCT_TONES = ["olive", "ivory", "linen", "deep", "sage"] as const;

export type ProductArtworkKind = (typeof PRODUCT_ARTWORKS)[number];
export type ProductSize = (typeof PRODUCT_SIZES)[number];
export type ProductTone = (typeof PRODUCT_TONES)[number];

export type ProductInput = {
  name: string;
  category: string;
  description: string;
  price: string;
  imageUrl: string;
  artwork: ProductArtworkKind;
  size: ProductSize;
  tone: ProductTone;
  published: boolean;
};

export type Product = ProductInput & {
  id: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export const PRODUCT_ARTWORK_LABELS: Record<ProductArtworkKind, string> = {
  table: "Mesa posta",
  pillow: "Almofada",
  bottle: "Garrafa",
  aroma: "Aromas",
  soap: "Sabonete",
  custom: "Sob medida",
};

export const PRODUCT_SIZE_LABELS: Record<ProductSize, string> = {
  wide: "Destaque largo",
  tall: "Destaque alto",
  compact: "Compacto",
  medium: "Médio",
  long: "Faixa larga",
};

export const PRODUCT_TONE_LABELS: Record<ProductTone, string> = {
  olive: "Oliva",
  ivory: "Marfim",
  linen: "Linho",
  deep: "Verde profundo",
  sage: "Sálvia",
};

export function toProductInput(product: Product): ProductInput {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    artwork: product.artwork,
    size: product.size,
    tone: product.tone,
    published: product.published,
  };
}
