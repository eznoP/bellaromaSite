"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { useRef, useState } from "react";
import type { Category } from "@/lib/category";
import {
  PRODUCT_SIZE_DESCRIPTIONS,
  PRODUCT_SIZE_LABELS,
  PRODUCT_SIZES,
  PRODUCT_TONE_LABELS,
  PRODUCT_TONES,
  type Product,
  type ProductInput,
} from "@/lib/product";
import styles from "./admin.module.css";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function createEmptyProduct(): ProductInput {
  return {
    name: "",
    category: "",
    description: "",
    price: "",
    imageUrls: [],
    size: "medium",
    tone: "ivory",
    published: true,
  };
}

function toFormProduct(product: Product | null): ProductInput {
  return product ? {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    imageUrls: [...product.imageUrls],
    size: product.size,
    tone: product.tone,
    published: product.published,
  } : createEmptyProduct();
}

function priceDraft(value: string) {
  const numericPart = value.replace(/^\s*R\$\s*/, "").replace(/[^\d.,]/g, "");
  return numericPart ? `R$ ${numericPart}` : "";
}

function formatPrice(value: string) {
  const numericPart = value.replace(/^\s*R\$\s*/, "").trim();
  if (!numericPart) return "";

  const normalized = numericPart.includes(",")
    ? numericPart.replace(/\./g, "").replace(",", ".")
    : numericPart;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return value;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);
}

function safeFilename(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() || "jpg";
  const base = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "produto";
  return `${base}.${extension}`;
}

export function ProductEditor({
  product,
  categories,
  uploadsConfigured,
  saving,
  onCancel,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  uploadsConfigured: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: ProductInput) => Promise<boolean>;
}) {
  const [form, setForm] = useState<ProductInput>(() => toFormProduct(product));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const uploadedThisSession = useRef(new Set<string>());

  function update(patch: Partial<ProductInput>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function deleteTemporaryImage(url: string) {
    const response = await fetch("/api/admin/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error("Não foi possível remover a imagem enviada.");
    uploadedThisSession.current.delete(url);
  }

  async function handleFiles(fileList: FileList | File[]) {
    setMessage("");
    if (!uploadsConfigured) {
      setMessage("Conecte o Vercel Blob antes de enviar imagens.");
      return;
    }

    const availableSlots = MAX_IMAGES - form.imageUrls.length;
    const files = Array.from(fileList).slice(0, availableSlots);
    if (files.length === 0) {
      setMessage("O limite de 5 imagens já foi atingido.");
      return;
    }

    const invalidType = files.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
    if (invalidType) {
      setMessage("Use imagens JPG, PNG, WebP ou AVIF.");
      return;
    }
    const oversized = files.find((file) => file.size > MAX_IMAGE_BYTES);
    if (oversized) {
      setMessage(`A imagem “${oversized.name}” ultrapassa 8 MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      for (const [index, file] of files.entries()) {
        const blob = await uploadPresigned(`products/${safeFilename(file.name)}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/uploads",
          multipart: file.size > 4 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => {
            const totalPercentage = ((index + percentage / 100) / files.length) * 100;
            setUploadProgress(Math.round(totalPercentage));
          },
        });
        uploadedThisSession.current.add(blob.url);
        setForm((current) => ({
          ...current,
          imageUrls: [...current.imageUrls, blob.url].slice(0, MAX_IMAGES),
        }));
      }
      setUploadProgress(100);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível enviar as imagens.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(url: string) {
    setMessage("");
    if (uploadedThisSession.current.has(url)) {
      try {
        await deleteTemporaryImage(url);
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : "Não foi possível remover a imagem.");
        return;
      }
    }
    setForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.filter((imageUrl) => imageUrl !== url),
    }));
  }

  function makeCover(index: number) {
    setForm((current) => {
      const images = [...current.imageUrls];
      const [selected] = images.splice(index, 1);
      images.unshift(selected);
      return { ...current, imageUrls: images };
    });
  }

  async function cancelEditor() {
    const temporaryUrls = [...uploadedThisSession.current];
    if (temporaryUrls.length > 0) {
      setUploading(true);
      await Promise.allSettled(temporaryUrls.map(deleteTemporaryImage));
      setUploading(false);
    }
    onCancel();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (form.imageUrls.length === 0) {
      setMessage("Adicione pelo menos uma imagem do produto.");
      return;
    }
    if (categories.length > 0 && !form.category) {
      setMessage("Selecione uma categoria.");
      return;
    }

    const saved = await onSave({ ...form, price: formatPrice(form.price) });
    if (saved) uploadedThisSession.current.clear();
  }

  const busy = saving || uploading;
  const legacyCategory = Boolean(form.category) && !categories.some((category) => category.name === form.category);

  return (
    <div className={styles.editorOverlay} role="presentation">
      <aside
        id="editor-produto"
        className={styles.editorPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className={styles.editorHeading}>
          <div>
            <p className={styles.kicker}>{product ? "Editar produto" : "Novo produto"}</p>
            <h2 id="editor-title">{product ? product.name : "Adicionar ao catálogo"}</h2>
          </div>
          <button className={styles.iconButton} type="button" onClick={cancelEditor} disabled={busy} aria-label="Fechar editor">
            ×
          </button>
        </div>

        <div className={styles.editorLayout}>
          <section className={styles.previewColumn} aria-labelledby="preview-title">
            <div className={styles.previewHeading}>
              <div>
                <p className={styles.kicker}>Visualização</p>
                <h3 id="preview-title">Prévia no catálogo</h3>
              </div>
              <span>{PRODUCT_SIZE_LABELS[form.size]}</span>
            </div>
            <div className={styles.catalogPreviewStage} data-size={form.size}>
              <div className={styles.cardPreview} data-tone={form.tone}>
                <div className={styles.previewMeta}>
                  <span>01</span>
                  <span>{form.category || "Sem categoria"}</span>
                </div>
                <div className={styles.previewVisual}>
                  {form.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrls[0]} alt="Prévia da imagem de capa" />
                  ) : (
                    <span className={styles.previewPlaceholder}>Adicione a imagem de capa</span>
                  )}
                </div>
                <div className={styles.previewText}>
                  <strong>{form.name || "Nome do produto"}</strong>
                  {form.description && <p>{form.description}</p>}
                  <small>{formatPrice(form.price) || "Preço não informado"}</small>
                </div>
              </div>
            </div>
            <p className={styles.previewExplanation}>{PRODUCT_SIZE_DESCRIPTIONS[form.size]}</p>
          </section>

          <form className={styles.editorForm} onSubmit={handleSubmit}>
            <section className={styles.formSection}>
              <div className={styles.formSectionHeading}>
                <span>1</span>
                <div><strong>Fotos do produto</strong><small>Obrigatório</small></div>
                <b>{form.imageUrls.length}/{MAX_IMAGES} imagens adicionadas</b>
              </div>
              <p className={styles.uploadGuidance}>
                Adicione de 1 a 5 fotos nítidas. A primeira será a capa do card; use as demais para mostrar detalhes, acabamentos e outros ângulos.
              </p>
              <label
                className={styles.uploadDropzone}
                data-disabled={!uploadsConfigured || form.imageUrls.length >= MAX_IMAGES || busy}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!busy) void handleFiles(event.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  multiple
                  disabled={!uploadsConfigured || form.imageUrls.length >= MAX_IMAGES || busy}
                  onChange={(event) => {
                    if (event.target.files) void handleFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <strong>{uploading ? `Enviando… ${uploadProgress}%` : "Selecionar ou arrastar imagens"}</strong>
                <span>JPG, PNG, WebP ou AVIF · até 8 MB cada</span>
              </label>
              {!uploadsConfigured && (
                <p className={styles.configWarning}>O armazenamento de imagens precisa ser conectado ao Vercel Blob.</p>
              )}
              {form.imageUrls.length > 0 && (
                <div className={styles.imageList}>
                  {form.imageUrls.map((url, index) => (
                    <article key={url} className={styles.imageItem}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Imagem ${index + 1} do produto`} />
                      <div>
                        <strong>{index === 0 ? "Imagem de capa" : `Imagem ${index + 1}`}</strong>
                        <span>{index === 0 ? "Aparece primeiro no catálogo" : "Imagem complementar"}</span>
                      </div>
                      <div className={styles.imageActions}>
                        {index > 0 && <button type="button" onClick={() => makeCover(index)}>Usar como capa</button>}
                        <button type="button" onClick={() => void removeImage(url)} disabled={busy}>Remover</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.formSection}>
              <div className={styles.formSectionHeading}>
                <span>2</span>
                <div><strong>Informações</strong><small>Nome e preço</small></div>
              </div>
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
                {categories.length > 0 ? (
                  <label>
                    <span>Categoria</span>
                    <select
                      name="category"
                      value={form.category}
                      onChange={(event) => update({ category: event.target.value })}
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {legacyCategory && <option value={form.category}>{form.category}</option>}
                      {categories.map((category) => (
                        <option value={category.name} key={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className={styles.noCategoryNotice}>
                    <span>Categoria</span>
                    <p>Você poderá selecionar uma categoria depois que criar a primeira na área “Categorias”.</p>
                  </div>
                )}
                <label>
                  <span>Preço</span>
                  <input
                    name="price"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) => update({ price: priceDraft(event.target.value) })}
                    onBlur={() => update({ price: formatPrice(form.price) })}
                    placeholder="R$ 0,00"
                    maxLength={40}
                    required
                  />
                </label>
              </div>

              <label>
                <span>Descrição <small>opcional · {form.description.length}/240</small></span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(event) => update({ description: event.target.value })}
                  rows={4}
                  maxLength={240}
                  placeholder="Ex.: tecido, medidas, composição ou cuidados."
                />
              </label>
            </section>

            <section className={styles.formSection}>
              <div className={styles.formSectionHeading}>
                <span>3</span>
                <div><strong>Aparência no catálogo</strong><small>Área ocupada pelo produto</small></div>
              </div>
              <fieldset className={styles.sizePicker}>
                <legend>Formato do card</legend>
                {PRODUCT_SIZES.map((size) => (
                  <label key={size} data-selected={form.size === size}>
                    <input
                      type="radio"
                      name="size"
                      value={size}
                      checked={form.size === size}
                      onChange={() => update({ size })}
                    />
                    <i data-shape={size} />
                    <span><strong>{PRODUCT_SIZE_LABELS[size]}</strong><small>{PRODUCT_SIZE_DESCRIPTIONS[size]}</small></span>
                  </label>
                ))}
              </fieldset>

              <label>
                <span>Cor de fundo do card</span>
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

              <label className={styles.switchField}>
                <input
                  name="published"
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => update({ published: event.target.checked })}
                />
                <span><i /> Publicar no catálogo imediatamente</span>
              </label>
            </section>

            {message && <p className={styles.editorMessage} role="alert">{message}</p>}

            <div className={styles.editorActions}>
              <button className={styles.secondaryButton} type="button" onClick={cancelEditor} disabled={busy}>
                Cancelar
              </button>
              <button className={styles.primaryButton} type="submit" disabled={busy || form.imageUrls.length === 0}>
                {saving ? "Salvando…" : uploading ? `Enviando… ${uploadProgress}%` : product ? "Salvar alterações" : "Adicionar produto"}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
