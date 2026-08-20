import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminConfigured, isAdminRequestAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { createCategory, listCategories } from "@/lib/category-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(60),
}).strict();

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
  return NextResponse.json({ categories: await listCategories() });
}

export async function POST(request: NextRequest) {
  const authorizationError = authorize(request, true);
  if (authorizationError) return authorizationError;

  const parsed = categorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise a categoria." }, { status: 422 });
  }

  try {
    return NextResponse.json({ category: await createCategory(parsed.data.name) }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Essa categoria já existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível adicionar a categoria." }, { status: 500 });
  }
}
