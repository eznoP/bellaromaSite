"use client";

import { animate, createScope, stagger as animeStagger, utils } from "animejs";
import { useEffect, useRef } from "react";
import styles from "./kinetic-text-reveal.module.css";

type StaggerOrigin = "first" | "center" | "last";

type KineticTextRevealProps = {
  text: string;
  splitBy?: "characters";
  stagger?: number;
  distance?: number;
  staggerFrom?: StaggerOrigin;
  className?: string;
};

export function KineticTextReveal({
  text,
  splitBy = "characters",
  stagger = 0.06,
  distance = 16,
  staggerFrom = "center",
  className = "",
}: KineticTextRevealProps) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (splitBy !== "characters") return;

    const scope = createScope({
      root,
      mediaQueries: {
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
    }).add((self) => {
      if (self?.matches.reduceMotion) {
        utils.set("[data-kinetic-character]", { opacity: 1, y: 0 });
        return;
      }

      animate("[data-kinetic-character]", {
        opacity: { from: 0 },
        y: { from: distance },
        duration: 650,
        delay: animeStagger(stagger * 1000, { from: staggerFrom }),
        ease: "out(4)",
      });
    });

    return () => scope.revert();
  }, [distance, splitBy, stagger, staggerFrom]);

  return (
    <span ref={root} className={`${styles.root} ${className}`}>
      <span className="srOnly">{text}</span>
      {Array.from(text).map((character, index) => (
        <span
          className={styles.character}
          data-kinetic-character
          aria-hidden="true"
          key={`${character}-${index}`}
        >
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </span>
  );
}
