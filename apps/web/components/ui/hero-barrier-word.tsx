"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export function HeroBarrierWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const words = useMemo(() => ["barriers.", "friction.", "guesswork.", "awkwardness."], []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setWordIndex((current) => (current === words.length - 1 ? 0 : current + 1));
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [wordIndex, words.length]);

  return (
    <span className="hero-animated-word">
      {words.map((word, index) => (
        <motion.span
          key={word}
          className="hero-animated-word-item"
          initial={{ opacity: 0, y: "-100" }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
          animate={wordIndex === index ? { y: 0, opacity: 1 } : { y: wordIndex > index ? -120 : 120, opacity: 0 }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
