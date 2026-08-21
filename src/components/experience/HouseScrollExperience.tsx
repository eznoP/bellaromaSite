"use client";

import { createScope, createTimeline, onScroll } from "animejs";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { ACESFilmicToneMapping } from "three";
import { KineticTextReveal } from "@/components/motion/KineticTextReveal";
import { AtelierHouseScene } from "./AtelierHouseScene";
import styles from "./house-scroll-experience.module.css";

const ThreeCanvas = dynamic(
  () => import("@react-three/fiber").then((module) => module.Canvas),
  { ssr: false },
);

export function HouseScrollExperience() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef({ value: 0 });
  const invalidate = useRef<(() => void) | null>(null);

  useEffect(() => {
    const section = root.current;
    if (!section) return;

    const scope = createScope({
      root,
      mediaQueries: {
        isMobile: "(max-width: 719px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
    }).add((self) => {
      const isMobile = Boolean(self?.matches.isMobile);
      const reduceMotion = Boolean(self?.matches.reduceMotion);
      let renderFrame = 0;
      const renderScene = () => {
        invalidate.current?.();
        cancelAnimationFrame(renderFrame);
        renderFrame = requestAnimationFrame(() => invalidate.current?.());
      };
      section.dataset.motionLayout = isMobile ? "mobile" : "desktop";

      if (reduceMotion) {
        progress.current.value = -1;
        section.style.setProperty("--scene-progress", "0");
        renderScene();
        return () => {
          cancelAnimationFrame(renderFrame);
          delete section.dataset.motionLayout;
        };
      }

      progress.current.value = 0;
      let lastRenderedProgress = Number.NaN;
      const syncScene = () => {
        const nextProgress = progress.current.value;
        if (Math.abs(nextProgress - lastRenderedProgress) < 0.0001) return;
        lastRenderedProgress = nextProgress;
        section.style.setProperty("--scene-progress", `${nextProgress}`);
        renderScene();
      };

      createTimeline({
        defaults: { ease: "linear" },
        autoplay: onScroll({
          target: section,
          enter: "top top",
          leave: "bottom bottom",
          sync: true,
          onUpdate: syncScene,
        }),
      })
        .add(progress.current, { value: 1, duration: 1000, ease: "linear" }, 0)
        .add(
          "[data-hero-copy]",
          { opacity: 0, y: -28, duration: isMobile ? 150 : 190, ease: "inOutQuad" },
          145,
        )
        .add("[data-scene-meta]", { opacity: 0, duration: 120 }, 110)
        .add("[data-portal]", { opacity: 1, duration: 180, ease: "inOutQuad" }, 760)
        .add("[data-scene-canvas]", { opacity: 0, duration: 180 }, 790)
        .add(
          "[data-portal-copy]",
          { opacity: 1, y: 0, duration: 150, ease: "out(4)" },
          820,
        );

      return () => {
        cancelAnimationFrame(renderFrame);
        delete section.dataset.motionLayout;
      };
    });

    return () => scope.revert();
  }, []);

  return (
    <section id="inicio" ref={root} className={styles.experience} aria-labelledby="hero-title">
      <div className={styles.stickyScene}>
        <div className={styles.portal} data-portal aria-hidden="true">
          <div className={styles.portalCopy} data-portal-copy>
            <p>Bellaroma</p>
            <strong>Conheça nosso catálogo.</strong>
            <span>Veja os produtos disponíveis.</span>
          </div>
        </div>

        <div className={styles.canvasShell} data-scene-canvas aria-hidden="true">
          <ThreeCanvas
            shadows="soft"
            frameloop="demand"
            dpr={[1, 1.75]}
            camera={{ position: [0, 0.88, 15.4], fov: 40, near: 0.08, far: 140 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
              toneMapping: ACESFilmicToneMapping,
              toneMappingExposure: 1.08,
            }}
            fallback={
              <div className={styles.webglFallback}>
                <span />
              </div>
            }
          >
            <AtelierHouseScene progress={progress} invalidateRef={invalidate} />
          </ThreeCanvas>
        </div>

        <div className={styles.heroCopy} data-hero-copy>
          <p className={styles.eyebrow}>Bellaroma</p>
          <h1 id="hero-title">
            <span>Entre.</span>
            <KineticTextReveal
              text="Sinta-se em casa."
              splitBy="characters"
              stagger={0.06}
              distance={16}
              staggerFrom="center"
              className={styles.kineticTitle}
            />
          </h1>
          <p className={styles.heroText}>
            Peças artesanais para mesa e decoração, produzidas com cuidado em cada acabamento.
          </p>
          <a className={styles.heroLink} href="#catalogo">
            Ir direto ao catálogo <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className={styles.sceneMeta} data-scene-meta aria-hidden="true">
          <span>Casa-ateliê</span>
          <strong>Bellaroma</strong>
        </div>

        <div className={styles.progressRail} aria-hidden="true">
          <span>01</span>
          <i><b /></i>
          <span>02</span>
        </div>

      </div>
    </section>
  );
}
