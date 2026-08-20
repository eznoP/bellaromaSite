import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequestAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { deleteCategory } from "@/lib/category-repository";

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  const { id } = await params;
  if (!(await deleteCategory(id))) {
    return NextResponse.json(
      { error: "A categoria não existe ou está sendo usada por um produto." },
      { status: 409 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
