"use client";

import { createScope, createTimeline, onScroll } from "animejs";
import { useEffect, useRef, useState } from "react";
import { getWhatsAppHref } from "@/lib/whatsapp";
import type { Product } from "@/lib/product";
import styles from "./catalog.module.css";

const previewCards = [
  { size: "wide", tone: "olive" },
  { size: "tall", tone: "ivory" },
  { size: "compact", tone: "linen" },
  { size: "compact", tone: "sage" },
] as const;

export function Catalog({ products }: { products: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const [activeImages, setActiveImages] = useState<Record<string, number>>({});

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

  const collectionLabel = products.length
    ? `Acervo 01–${String(products.length).padStart(2, "0")}`
    : "Prévias do catálogo";

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
            ? "Consulte pelo WhatsApp as medidas, cores e a disponibilidade de cada produto."
            : "O catálogo está sendo preparado. Os produtos disponíveis aparecerão aqui."
          }</p>
        </div>
      </header>

      <div className={styles.productGrid} data-catalog-grid>
        {products.map((product, index) => {
          const activeImage = product.imageUrls.length > 0
            ? Math.min(activeImages[product.id] || 0, product.imageUrls.length - 1)
            : 0;
          const href = getWhatsAppHref(
            `Olá! Quero saber mais sobre ${product.name} da Bellaroma.`,
          );

          function showImage(nextIndex: number) {
            const total = product.imageUrls.length;
            if (total < 2) return;
            setActiveImages((current) => ({
              ...current,
              [product.id]: (nextIndex + total) % total,
            }));
          }

          return (
            <article
              className={styles.productCard}
              data-catalog-card
              data-size={product.size}
              data-tone={product.tone}
              key={product.id}
            >
              <div className={styles.cardContent}>
                <div className={styles.cardMeta}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{product.category || "Bellaroma"}</span>
                </div>
                <div className={styles.cardVisual}>
                  {product.imageUrls[activeImage] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrls[activeImage]} alt={`${product.name}, imagem ${activeImage + 1}`} />
                  ) : (
                    <span className={styles.missingImage}>Imagem indisponível</span>
                  )}
                  {product.imageUrls.length > 1 && (
                    <>
                      <div className={styles.galleryArrows}>
                        <button type="button" onClick={() => showImage(activeImage - 1)} aria-label="Imagem anterior">←</button>
                        <button type="button" onClick={() => showImage(activeImage + 1)} aria-label="Próxima imagem">→</button>
                      </div>
                      <div className={styles.galleryDots} aria-label={`${product.imageUrls.length} imagens`}>
                        {product.imageUrls.map((url, imageIndex) => (
                          <button
                            type="button"
                            data-active={imageIndex === activeImage}
                            onClick={() => showImage(imageIndex)}
                            aria-label={`Mostrar imagem ${imageIndex + 1}`}
                            key={url}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <div>
                    <h3>{product.name}</h3>
                    {product.description && <p>{product.description}</p>}
                    {product.price && <strong className={styles.cardPrice}>{product.price}</strong>}
                  </div>
                  <a
                    className={styles.cardAction}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Consultar ${product.name} pelo WhatsApp`}
                  >
                    Consultar <i>↗</i>
                  </a>
                </div>
              </div>
            </article>
          );
        })}
        {products.length === 0 && previewCards.map((preview, index) => (
          <article
            className={`${styles.productCard} ${styles.previewCard}`}
            data-catalog-card
            data-size={preview.size}
            data-tone={preview.tone}
            key={`${preview.size}-${index}`}
          >
            <div className={styles.previewCardInner}>
              <div className={styles.cardMeta}>
                <span>Prévia {String(index + 1).padStart(2, "0")}</span>
                <span>Em breve</span>
              </div>
              <div className={styles.previewVisual} aria-hidden="true">
                <span>+</span>
                <i />
                <i />
              </div>
              <div className={styles.previewInfo}>
                <div>
                  <h3>Produto em breve</h3>
                  <p>Este espaço será preenchido quando um produto for cadastrado.</p>
                </div>
                <span aria-hidden="true">Bellaroma</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
