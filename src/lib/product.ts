export const PRODUCT_SIZES = ["wide", "tall", "compact", "medium", "long"] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

export type ProductInput = {
  name: string;
  category: string;
  description: string;
  price: string;
  imageUrls: string[];
  size: ProductSize;
  published: boolean;
};

export type Product = ProductInput & {
  id: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export const PRODUCT_SIZE_LABELS: Record<ProductSize, string> = {
  wide: "Destaque grande",
  tall: "Vertical",
  compact: "Compacto",
  medium: "Horizontal",
  long: "Panorâmico",
};

export const PRODUCT_SIZE_DESCRIPTIONS: Record<ProductSize, string> = {
  wide: "Ocupa uma área grande e quadrada. Ideal para produtos com várias peças.",
  tall: "Valoriza fotografias feitas em pé e produtos mais altos.",
  compact: "Card menor para uma peça única ou fotografia aproximada.",
  medium: "Card deitado para fotografias horizontais, como jogos americanos.",
  long: "Faixa ampla para conjuntos completos ou composições panorâmicas.",
};

export function toProductInput(product: Product): ProductInput {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    imageUrls: product.imageUrls,
    size: product.size,
    published: product.published,
  };
}
