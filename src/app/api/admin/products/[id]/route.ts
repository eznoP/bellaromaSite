import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequestAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { deleteProductImages } from "@/lib/blob-store";
import {
  deleteProduct,
  getProduct,
  getUnreferencedImageUrls,
  updateProduct,
} from "@/lib/product-repository";
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
    const current = await getProduct(id);
    if (!current) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    const product = await updateProduct(id, parsed.data);
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    revalidatePath("/");
    if (parsed.data.imageUrls) {
      const retained = new Set(product.imageUrls);
      const removed = current.imageUrls.filter((url) => !retained.has(url));
      await deleteProductImages(await getUnreferencedImageUrls(removed)).catch(() => undefined);
    }
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Falha ao atualizar produto:", error);
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
    const product = await getProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    if (!(await deleteProduct(id))) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    revalidatePath("/");
    await deleteProductImages(await getUnreferencedImageUrls(product.imageUrls)).catch(() => undefined);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o produto." }, { status: 500 });
  }
}
