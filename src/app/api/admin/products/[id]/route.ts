import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequestAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { deleteProduct, updateProduct } from "@/lib/product-repository";
import { getValidationErrors, productPatchSchema } from "@/lib/product-schema";

export const runtime = "nodejs";

function authorize(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "O painel não está configurado." }, { status: 503 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    const parsed = productPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Revise os campos do produto.", issues: getValidationErrors(parsed.error) },
        { status: 422 },
      );
    }

    const { id } = await params;
    const product = await updateProduct(id, parsed.data);
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    revalidatePath("/");
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o produto." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    const { id } = await params;
    if (!(await deleteProduct(id))) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    revalidatePath("/");
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o produto." }, { status: 500 });
  }
}
