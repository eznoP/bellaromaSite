import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequestAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { createProduct, listProducts } from "@/lib/product-repository";
import { getValidationErrors, productInputSchema } from "@/lib/product-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: NextRequest, mutation = false) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "O painel não está configurado." }, { status: 503 });
  }
  if (mutation && !isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    return NextResponse.json({ products: await listProducts() });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os produtos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authorizationError = authorize(request, true);
  if (authorizationError) return authorizationError;

  try {
    const parsed = productInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Revise os campos do produto.", issues: getValidationErrors(parsed.error) },
        { status: 422 },
      );
    }

    const product = await createProduct(parsed.data);
    revalidatePath("/");
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível adicionar o produto." }, { status: 500 });
  }
}
