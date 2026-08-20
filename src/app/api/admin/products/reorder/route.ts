import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequestAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { reorderProducts } from "@/lib/product-repository";
import { getValidationErrors, reorderProductsSchema } from "@/lib/product-schema";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "O painel não está configurado." }, { status: 503 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  try {
    const parsed = reorderProductsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A nova ordem é inválida.", issues: getValidationErrors(parsed.error) },
        { status: 422 },
      );
    }

    const products = await reorderProducts(parsed.data.ids);
    revalidatePath("/");
    return NextResponse.json({ products });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Não foi possível reordenar os produtos.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
