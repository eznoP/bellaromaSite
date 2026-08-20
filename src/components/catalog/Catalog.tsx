"use client";

import { createScope, createTimeline, onScroll } from "animejs";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/product";
import { getWhatsAppHref } from "@/lib/whatsapp";
import styles from "./catalog.module.css";

const previewCards = ["wide", "tall", "compact", "compact"] as const;

export function Catalog({ products }: { products: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailImage, setDetailImage] = useState(0);

  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const grid = section.querySelector<HTMLElement>("[data-catalog-grid]");
    if (!grid) return;

    const scope = createScope({
      root,
      mediaQueries: {
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
    }).add((self) => {
      if (self?.matches.reduceMotion) return;

      const timeline = createTimeline({ autoplay: false })
        .add("[data-catalog-heading]", {
          y: { from: 24 },
          duration: 500,
          ease: "out(4)",
        })
        .add(
          "[data-catalog-card]",
          {
            y: { from: 30 },
            duration: 620,
            delay: (_target, index) => Math.min((index ?? 0) * 70, 560),
            ease: "out(4)",
          },
          80,
        );

      const observer = onScroll({
        target: section,
        enter: "top bottom",
        leave: "top top",
        onUpdate: (self) => timeline.seek(timeline.duration * self.progress),
      });

      timeline.seek(timeline.duration * observer.progress);
    });

    return () => scope.revert();
  }, [products.length]);

  useEffect(() => {
    if (!selectedProduct) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedProduct(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedProduct]);

  function openDetails(product: Product) {
    setDetailImage(0);
    setSelectedProduct(product);
  }

  function showDetailImage(nextIndex: number) {
    if (!selectedProduct || selectedProduct.imageUrls.length < 2) return;
    const total = selectedProduct.imageUrls.length;
    setDetailImage((nextIndex + total) % total);
  }

  const collectionLabel = products.length
    ? `Acervo 01–${String(products.length).padStart(2, "0")}`
    : "Prévias do catálogo";
  const selectedImage = selectedProduct?.imageUrls[detailImage];
  const whatsappHref = selectedProduct
    ? getWhatsAppHref(`Olá! Quero saber mais sobre ${selectedProduct.name} da Bellaroma.`)
    : "";

  return (
    <section id="catalogo" ref={root} className={styles.catalog} aria-labelledby="catalog-title">
      <header className={styles.catalogHeader} data-catalog-heading>
        <div>
          <p className={styles.eyebrow}>{products.length ? "Produtos disponíveis" : "Em breve"}</p>
          <h2 id="catalog-title">
            Catálogo
            <br />
            <em>Bellaroma.</em>
          </h2>
        </div>
        <div className={styles.catalogNote}>
          <span>{collectionLabel}</span>
          <p>{products.length
            ? "Abra cada produto para ver todas as fotos, informações e consultar a disponibilidade."
            : "Os primeiros produtos da Bellaroma aparecerão aqui."
          }</p>
        </div>
      </header>

      <div className={styles.productGrid} data-catalog-grid>
        {products.map((product) => (
          <article
            className={styles.productCard}
            data-catalog-card
            data-size={product.size}
            key={product.id}
          >
            <button
              className={styles.productButton}
              type="button"
              onClick={() => openDetails(product)}
              aria-label={`Ver detalhes de ${product.name}`}
            >
              {product.imageUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrls[0]} alt={product.name} />
              ) : (
                <span className={styles.missingImage}>Imagem indisponível</span>
              )}
              <span className={styles.cardOverlay}>
                <strong>{product.name}</strong>
                <small>Clique para mais detalhes</small>
              </span>
            </button>
          </article>
        ))}

        {products.length === 0 && previewCards.map((size, index) => (
          <article
            className={`${styles.productCard} ${styles.previewCard}`}
            data-catalog-card
            data-size={size}
            key={`${size}-${index}`}
          >
            <div className={styles.previewCardInner}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div aria-hidden="true"><i /><i /></div>
              <strong>Produto em breve</strong>
            </div>
          </article>
        ))}
      </div>

      {selectedProduct && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedProduct(null);
          }}
        >
          <section className={styles.productModal} role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
            <button
              className={styles.modalClose}
              type="button"
              onClick={() => setSelectedProduct(null)}
              aria-label="Fechar detalhes"
            >×</button>

            <div className={styles.modalGallery}>
              {selectedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedImage} alt={`${selectedProduct.name}, imagem ${detailImage + 1}`} />
              ) : (
                <span>Imagem indisponível</span>
              )}
              {selectedProduct.imageUrls.length > 1 && (
                <div className={styles.modalArrows}>
                  <button type="button" onClick={() => showDetailImage(detailImage - 1)} aria-label="Imagem anterior">←</button>
                  <span>{detailImage + 1}/{selectedProduct.imageUrls.length}</span>
                  <button type="button" onClick={() => showDetailImage(detailImage + 1)} aria-label="Próxima imagem">→</button>
                </div>
              )}
            </div>

            <div className={styles.modalDetails}>
              <p>{selectedProduct.category || "Bellaroma"}</p>
              <h3 id="product-detail-title">{selectedProduct.name}</h3>
              {selectedProduct.description && <div className={styles.modalDescription}>{selectedProduct.description}</div>}
              {selectedProduct.price && <strong className={styles.modalPrice}>{selectedProduct.price}</strong>}
              {selectedProduct.imageUrls.length > 1 && (
                <div className={styles.modalThumbnails} aria-label="Escolha uma imagem">
                  {selectedProduct.imageUrls.map((url, index) => (
                    <button
                      type="button"
                      data-active={index === detailImage}
                      onClick={() => setDetailImage(index)}
                      aria-label={`Mostrar imagem ${index + 1}`}
                      key={url}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}
              <a className={styles.modalAction} href={whatsappHref} target="_blank" rel="noreferrer">
                Consultar pelo WhatsApp <span>↗</span>
              </a>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
