import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequestAuthenticated, isSameOrigin } from "@/lib/admin-auth";
import { isBlobConfigured } from "@/lib/blob-store";

export const runtime = "nodejs";

function authorize(request: NextRequest) {
  if (!isAdminConfigured() || !isBlobConfigured()) {
    return NextResponse.json({ error: "O upload de imagens não está configurado." }, { status: 503 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HandleUploadBody;
    if (body.type === "blob.generate-client-token") {
      const authorizationError = authorize(request);
      if (authorizationError) return authorizationError;
    } else if (!isBlobConfigured()) {
      return NextResponse.json({ error: "O upload de imagens não está configurado." }, { status: 503 });
    }
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
        maximumSizeInBytes: 8 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    const body = await request.json() as { url?: string };
    if (!body.url || !new URL(body.url).hostname.endsWith(".public.blob.vercel-storage.com")) {
      return NextResponse.json({ error: "Imagem inválida." }, { status: 422 });
    }
    await del(body.url);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover a imagem." }, { status: 400 });
  }
}
