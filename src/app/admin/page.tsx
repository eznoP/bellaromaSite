import type { Metadata } from "next";
import { AdminAccess } from "@/components/admin/AdminAccess";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/database";
import { listProducts } from "@/lib/product-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel do ateliê | Bellaroma",
  description: "Gestão privada do catálogo Bellaroma.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const configured = isAdminConfigured() && isDatabaseConfigured();
  const authenticated = configured && await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminAccess configured={configured} />;
  }

  return <AdminDashboard initialProducts={await listProducts()} />;
}
