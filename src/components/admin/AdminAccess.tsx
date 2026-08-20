"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import styles from "./admin.module.css";

export function AdminAccess({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main id="conteudo" className={styles.accessPage}>
      <Link className={styles.accessBrand} href="/" aria-label="Voltar ao site Bellaroma">
        <BrandMark />
      </Link>

      <section className={styles.accessCard} aria-labelledby="admin-access-title">
        <div className={styles.accessIndex} aria-hidden="true">
          {configured ? "Acesso 01" : "Configuração 01"}
        </div>
        <p className={styles.kicker}>Ateliê digital</p>
        <h1 id="admin-access-title">
          {configured ? (
            <>
              Organize o que<br />
              <em>vai para a vitrine.</em>
            </>
          ) : (
            <>
              Proteja o painel<br />
              <em>antes de começar.</em>
            </>
          )}
        </h1>

        {configured ? (
          <form className={styles.loginForm} onSubmit={handleSubmit}>
            <label htmlFor="admin-password">Senha administrativa</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
            />
            {error && <p className={styles.formError} role="alert">{error}</p>}
            <button type="submit" disabled={pending}>
              {pending ? "Verificando..." : "Entrar no painel"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        ) : (
          <div className={styles.setupGuide}>
            <p>No projeto da Vercel, abra <code>Environment Variables</code> e configure:</p>
            <pre><code>DATABASE_URL=conexão-do-neon{"\n"}ADMIN_PASSWORD=sua-senha-forte{"\n"}ADMIN_SESSION_SECRET=uma-chave-com-pelo-menos-32-caracteres</code></pre>
            <p>Marque Production e Preview, salve e faça um novo deployment.</p>
            <p>O catálogo continua público, mas nenhuma alteração é aceita sem uma sessão válida.</p>
          </div>
        )}

        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> Voltar ao site
        </Link>
      </section>
    </main>
  );
}
