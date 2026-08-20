import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_SECONDS,
  createAdminSessionToken,
  isAdminConfigured,
  isSameOrigin,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

function usesHttps(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return forwardedProtocol === "https" || request.nextUrl.protocol === "https:";
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "O acesso administrativo ainda não foi configurado." }, { status: 503 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: usesHttps(request),
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "strict",
    secure: usesHttps(request),
  });
  return response;
}
