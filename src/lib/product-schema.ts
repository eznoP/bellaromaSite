import "server-only";
import { z } from "zod";
import { PRODUCT_SIZES } from "@/lib/product";

const imageUrlSchema = z
  .string()
  .trim()
  .max(2048, "A URL da imagem deve ter no máximo 2048 caracteres.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }, "A imagem enviada não possui uma URL HTTPS válida.");

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, "Informe um nome.").max(80),
    category: z.string().trim().max(60),
    description: z.string().trim().max(240),
    price: z.string().trim().max(40),
    imageUrls: z
      .array(imageUrlSchema)
      .min(1, "Adicione pelo menos uma imagem do produto.")
      .max(5, "Adicione no máximo 5 imagens."),
    size: z.enum(PRODUCT_SIZES),
    published: z.boolean(),
  })
  .strict();

export const productPatchSchema = productInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Informe ao menos um campo para atualizar.",
);

export const storedProductSchema = productInputSchema.extend({
  id: z.string().min(1).max(100),
  order: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const storedProductsSchema = z.array(storedProductSchema);

export const reorderProductsSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .refine((value) => new Set(value.ids).size === value.ids.length, "A ordem contém itens repetidos.");

export function getValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
