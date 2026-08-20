"use client";

import { createScope, createTimeline, onScroll } from "animejs";
import { useEffect, useRef } from "react";
import { getWhatsAppHref } from "@/lib/whatsapp";
import type { Product } from "@/lib/product";
import { ProductArtwork } from "./ProductArtwork";
import styles from "./catalog.module.css";

export function Catalog({ products }: { products: Product[] }) {
  const root = useRef<HTMLElement>(null);

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
    : "Acervo em atualização";

  return (
    <section id="catalogo" ref={root} className={styles.catalog} aria-labelledby="catalog-title">
      <header className={styles.catalogHeader} data-catalog-heading>
        <div>
          <p className={styles.eyebrow}>Produtos disponíveis</p>
          <h2 id="catalog-title">
            Feitos para morar
            <br />
            <em>com você.</em>
          </h2>
        </div>
        <div className={styles.catalogNote}>
          <span>{collectionLabel}</span>
          <p>
            Cada coleção nasce em pequena escala. Consulte cores, medidas e
            disponibilidade pelo WhatsApp.
          </p>
        </div>
      </header>

      <div className={styles.productGrid} data-catalog-grid>
        {products.map((product, index) => {
          const href = getWhatsAppHref(
            `Olá! Quero saber mais sobre ${product.category.toLowerCase()} da Bellaroma.`,
          );

          return (
            <article
              className={styles.productCard}
              data-catalog-card
              data-size={product.size}
              data-tone={product.tone}
              key={product.id}
            >
              <a
                className={styles.cardLink}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Consultar ${product.category} pelo WhatsApp`}
              >
                <div className={styles.cardMeta}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{product.category}</span>
                </div>
                <div className={styles.cardVisual}>
                  {product.imageUrl ? (
                    // A URL é validada pelo servidor antes de entrar no catálogo.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} />
                  ) : (
                    <ProductArtwork kind={product.artwork} />
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    {product.price && <strong className={styles.cardPrice}>{product.price}</strong>}
                  </div>
                  <span className={styles.cardAction} aria-hidden="true">
                    Consultar <i>↗</i>
                  </span>
                </div>
              </a>
            </article>
          );
        })}
        {products.length === 0 && (
          <div className={styles.emptyCatalog}>
            <span aria-hidden="true">✦</span>
            <h3>Novas peças estão sendo preparadas.</h3>
            <p>Enquanto isso, conte sua ideia para criarmos algo sob medida.</p>
            <a href={getWhatsAppHref("Olá! Quero conversar sobre uma peça personalizada da Bellaroma.")} target="_blank" rel="noreferrer">
              Conversar pelo WhatsApp ↗
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
