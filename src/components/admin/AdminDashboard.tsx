"use client";

import { useDeferredValue, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProductArtwork } from "@/components/catalog/ProductArtwork";
import { toProductInput, type Product, type ProductInput } from "@/lib/product";
import { ProductEditor } from "./ProductEditor";
import styles from "./admin.module.css";

type Filter = "all" | "published" | "draft";

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}

export function AdminDashboard({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("pt-BR"));
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  const editingProduct = editingId && editingId !== "new"
    ? products.find((product) => product.id === editingId) || null
    : null;
  const publishedCount = products.filter((product) => product.published).length;
  const filteredProducts = products.filter((product) => {
    const matchesFilter = filter === "all"
      || (filter === "published" && product.published)
      || (filter === "draft" && !product.published);
    const haystack = `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("pt-BR");
    return matchesFilter && (!deferredQuery || haystack.includes(deferredQuery));
  });

  function openEditor(id: string | "new") {
    setEditingId(id);
    setNotice("");
    requestAnimationFrame(() => document.getElementById("editor-produto")?.scrollIntoView({ behavior: "smooth" }));
  }

  async function saveProduct(input: ProductInput) {
    const creating = editingId === "new";
    const endpoint = creating ? "/api/admin/products" : `/api/admin/products/${editingId}`;
    setBusy("save");
    setNotice("");

    try {
      const response = await fetch(endpoint, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await readResponse<{ product: Product }>(response);
      startTransition(() => {
        setProducts((current) => creating
          ? [...current, data.product]
          : current.map((product) => product.id === data.product.id ? data.product : product));
        setEditingId(null);
      });
      setNotice(creating ? "Produto adicionado ao acervo." : "Alterações salvas.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Não foi possível salvar.");
    } finally {
      setBusy("");
    }
  }

  async function patchProduct(product: Product, patch: Partial<ProductInput>, successMessage: string) {
    setBusy(product.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await readResponse<{ product: Product }>(response);
      startTransition(() => {
        setProducts((current) => current.map((item) => item.id === data.product.id ? data.product : item));
      });
      setNotice(successMessage);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Não foi possível atualizar.");
    } finally {
      setBusy("");
    }
  }

  async function duplicateProduct(product: Product) {
    setBusy(product.id);
    setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...toProductInput(product),
          name: `${product.name} (cópia)`,
          published: false,
        }),
      });
      const data = await readResponse<{ product: Product }>(response);
      startTransition(() => setProducts((current) => [...current, data.product]));
      setNotice("Cópia criada como rascunho.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Não foi possível duplicar.");
    } finally {
      setBusy("");
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Excluir “${product.name}”? Essa ação não pode ser desfeita.`)) return;
    setBusy(product.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      await readResponse(response);
      startTransition(() => {
        setProducts((current) => current
          .filter((item) => item.id !== product.id)
          .map((item, index) => ({ ...item, order: index })));
        if (editingId === product.id) setEditingId(null);
      });
      setNotice("Produto excluído.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Não foi possível excluir.");
    } finally {
      setBusy("");
    }
  }

  async function moveProduct(product: Product, direction: -1 | 1) {
    const currentIndex = products.findIndex((item) => item.id === product.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= products.length) return;

    const reordered = [...products];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setBusy(product.id);
    setNotice("");
    try {
      const response = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((item) => item.id) }),
      });
      const data = await readResponse<{ products: Product[] }>(response);
      startTransition(() => setProducts(data.products));
      setNotice("Ordem do catálogo atualizada.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Não foi possível reordenar.");
    } finally {
      setBusy("");
    }
  }

  function exportProducts() {
    const blob = new Blob([`${JSON.stringify(products, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bellaroma-produtos-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Backup exportado.");
  }

  async function logout() {
    setBusy("logout");
    await fetch("/api/admin/session", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={styles.adminPage}>
      <aside className={styles.sidebar}>
        <Link className={styles.sidebarBrand} href="/" aria-label="Abrir site Bellaroma">
          <BrandMark />
        </Link>
        <div className={styles.sidebarLabel}>Painel do ateliê</div>
        <nav aria-label="Navegação administrativa">
          <a href="#produtos"><span>01</span> Acervo</a>
          <button type="button" onClick={() => openEditor("new")}><span>02</span> Novo produto</button>
          <a href="/" target="_blank" rel="noreferrer"><span>03</span> Ver site ↗</a>
        </nav>
        <div className={styles.sidebarFooter}>
          <span><i /> Sessão protegida</span>
          <button type="button" onClick={logout} disabled={busy === "logout"}>Sair</button>
        </div>
      </aside>

      <main id="conteudo" className={styles.dashboard}>
        <header className={styles.dashboardHeader}>
          <div>
            <p className={styles.kicker}>Gestão do catálogo</p>
            <h1>Cuide da vitrine<br /><em>com a mesma calma.</em></h1>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.secondaryButton} type="button" onClick={exportProducts}>Exportar backup</button>
            <button className={styles.primaryButton} type="button" onClick={() => openEditor("new")}>+ Adicionar produto</button>
          </div>
        </header>

        <section className={styles.metrics} aria-label="Resumo do catálogo">
          <article><span>Total no acervo</span><strong>{String(products.length).padStart(2, "0")}</strong></article>
          <article><span>Publicados</span><strong>{String(publishedCount).padStart(2, "0")}</strong></article>
          <article><span>Rascunhos</span><strong>{String(products.length - publishedCount).padStart(2, "0")}</strong></article>
          <article><span>Última ação</span><p>{notice || "Tudo organizado"}</p></article>
        </section>

        <div className={styles.workspace} data-editor-open={Boolean(editingId)}>
          <section id="produtos" className={styles.inventory} aria-labelledby="inventory-title">
            <div className={styles.inventoryHeading}>
              <div>
                <p className={styles.kicker}>Acervo</p>
                <h2 id="inventory-title">Produtos e rascunhos</h2>
              </div>
              <span>{filteredProducts.length} exibidos</span>
            </div>

            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <span className="srOnly">Buscar produto</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome, categoria ou descrição"
                />
              </label>
              <div className={styles.filters} role="group" aria-label="Filtrar produtos">
                {(["all", "published", "draft"] as const).map((value) => (
                  <button
                    type="button"
                    data-active={filter === value}
                    onClick={() => setFilter(value)}
                    key={value}
                  >
                    {value === "all" ? "Todos" : value === "published" ? "Publicados" : "Rascunhos"}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.productList} aria-busy={isPending || Boolean(busy)}>
              {filteredProducts.map((product) => {
                const absoluteIndex = products.findIndex((item) => item.id === product.id);
                const productBusy = busy === product.id;
                return (
                  <article className={styles.productRow} key={product.id}>
                    <div className={styles.productThumb} data-tone={product.tone}>
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt="" />
                      ) : (
                        <ProductArtwork kind={product.artwork} />
                      )}
                    </div>
                    <div className={styles.productSummary}>
                      <div className={styles.productState} data-published={product.published}>
                        <i /> {product.published ? "Publicado" : "Rascunho"}
                      </div>
                      <h3>{product.name}</h3>
                      <p>{product.category}{product.price ? ` · ${product.price}` : ""}</p>
                    </div>
                    <div className={styles.orderActions} role="group" aria-label={`Ordenar ${product.name}`}>
                      <button
                        type="button"
                        onClick={() => moveProduct(product, -1)}
                        disabled={absoluteIndex === 0 || productBusy}
                        aria-label={`Mover ${product.name} para cima`}
                      >↑</button>
                      <span>{String(absoluteIndex + 1).padStart(2, "0")}</span>
                      <button
                        type="button"
                        onClick={() => moveProduct(product, 1)}
                        disabled={absoluteIndex === products.length - 1 || productBusy}
                        aria-label={`Mover ${product.name} para baixo`}
                      >↓</button>
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" onClick={() => openEditor(product.id)}>Editar</button>
                      <button
                        type="button"
                        onClick={() => patchProduct(
                          product,
                          { published: !product.published },
                          product.published ? "Produto ocultado do catálogo." : "Produto publicado.",
                        )}
                        disabled={productBusy}
                      >{product.published ? "Ocultar" : "Publicar"}</button>
                      <button type="button" onClick={() => duplicateProduct(product)} disabled={productBusy}>Duplicar</button>
                      <button className={styles.dangerButton} type="button" onClick={() => removeProduct(product)} disabled={productBusy}>Excluir</button>
                    </div>
                  </article>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className={styles.emptyInventory}>
                  <strong>Nenhum produto por aqui.</strong>
                  <p>Ajuste a busca ou crie um novo item para o catálogo.</p>
                  <button className={styles.primaryButton} type="button" onClick={() => openEditor("new")}>Adicionar produto</button>
                </div>
              )}
            </div>
          </section>

          {editingId && (
            <ProductEditor
              key={editingId}
              product={editingProduct}
              saving={busy === "save"}
              onCancel={() => setEditingId(null)}
              onSave={saveProduct}
            />
          )}
        </div>

        <div className={styles.liveNotice} aria-live="polite">{notice}</div>
      </main>
    </div>
  );
}
