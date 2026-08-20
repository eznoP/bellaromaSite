"use client";

import { useState } from "react";
import { ProductArtwork } from "@/components/catalog/ProductArtwork";
import {
  PRODUCT_ARTWORK_LABELS,
  PRODUCT_ARTWORKS,
  PRODUCT_SIZE_LABELS,
  PRODUCT_SIZES,
  PRODUCT_TONE_LABELS,
  PRODUCT_TONES,
  type Product,
  type ProductInput,
} from "@/lib/product";
import styles from "./admin.module.css";

const emptyProduct: ProductInput = {
  name: "",
  category: "",
  description: "",
  price: "",
  imageUrl: "",
  artwork: "custom",
  size: "medium",
  tone: "ivory",
  published: true,
};

export function ProductEditor({
  product,
  saving,
  onCancel,
  onSave,
}: {
  product: Product | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: ProductInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductInput>(product ? {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    artwork: product.artwork,
    size: product.size,
    tone: product.tone,
    published: product.published,
  } : emptyProduct);

  function update(patch: Partial<ProductInput>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <aside id="editor-produto" className={styles.editorPanel} aria-labelledby="editor-title">
      <div className={styles.editorHeading}>
        <div>
          <p className={styles.kicker}>{product ? "Editar produto" : "Novo produto"}</p>
          <h2 id="editor-title">{product ? product.name : "Montar novo card"}</h2>
        </div>
        <button className={styles.iconButton} type="button" onClick={onCancel} aria-label="Fechar editor">
          ×
        </button>
      </div>

      <div className={styles.cardPreview} data-tone={form.tone}>
        <div className={styles.previewMeta}>
          <span>Prévia</span>
          <span>{form.category || "Categoria"}</span>
        </div>
        <div className={styles.previewVisual}>
          {form.imageUrl ? (
            // A URL é validada novamente no servidor antes de ser persistida.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="" />
          ) : (
            <ProductArtwork kind={form.artwork} />
          )}
        </div>
        <div>
          <strong>{form.name || "Nome do produto"}</strong>
          <p>{form.price || "Valor opcional"}</p>
        </div>
      </div>

      <form className={styles.editorForm} onSubmit={handleSubmit}>
        <label>
          <span>Nome do produto</span>
          <input
            name="name"
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
            maxLength={80}
            required
          />
        </label>

        <div className={styles.formColumns}>
          <label>
            <span>Categoria</span>
            <input
              name="category"
              value={form.category}
              onChange={(event) => update({ category: event.target.value })}
              maxLength={60}
              required
            />
          </label>
          <label>
            <span>Preço ou chamada</span>
            <input
              name="price"
              value={form.price}
              onChange={(event) => update({ price: event.target.value })}
              placeholder="R$ 89,00 ou Sob consulta"
              maxLength={40}
            />
          </label>
        </div>

        <label>
          <span>Descrição <small>{form.description.length}/240</small></span>
          <textarea
            name="description"
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
            rows={4}
            minLength={8}
            maxLength={240}
            required
          />
        </label>

        <label>
          <span>URL da imagem <small>opcional</small></span>
          <input
            name="imageUrl"
            type="url"
            value={form.imageUrl}
            onChange={(event) => update({ imageUrl: event.target.value })}
            placeholder="https://..."
            maxLength={2048}
          />
          <small className={styles.fieldHint}>Sem imagem, o card usa a ilustração escolhida abaixo.</small>
        </label>

        <div className={styles.formColumns}>
          <label>
            <span>Ilustração</span>
            <select
              name="artwork"
              value={form.artwork}
              onChange={(event) => update({ artwork: event.target.value as ProductInput["artwork"] })}
            >
              {PRODUCT_ARTWORKS.map((artwork) => (
                <option value={artwork} key={artwork}>{PRODUCT_ARTWORK_LABELS[artwork]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Cor do card</span>
            <select
              name="tone"
              value={form.tone}
              onChange={(event) => update({ tone: event.target.value as ProductInput["tone"] })}
            >
              {PRODUCT_TONES.map((tone) => (
                <option value={tone} key={tone}>{PRODUCT_TONE_LABELS[tone]}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>Formato no catálogo</span>
          <select
            name="size"
            value={form.size}
            onChange={(event) => update({ size: event.target.value as ProductInput["size"] })}
          >
            {PRODUCT_SIZES.map((size) => (
              <option value={size} key={size}>{PRODUCT_SIZE_LABELS[size]}</option>
            ))}
          </select>
        </label>

        <label className={styles.switchField}>
          <input
            name="published"
            type="checkbox"
            checked={form.published}
            onChange={(event) => update({ published: event.target.checked })}
          />
          <span><i /> Publicar no catálogo imediatamente</span>
        </label>

        <div className={styles.editorActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => setForm(emptyProduct)}>
            Limpar
          </button>
          <button className={styles.primaryButton} type="submit" disabled={saving}>
            {saving ? "Salvando..." : product ? "Salvar alterações" : "Adicionar produto"}
          </button>
        </div>
      </form>
    </aside>
  );
}
