"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Meet de reactietijd van één vraag.
 * De klok start pas na twee animatieframes, dus als de vraag echt op het scherm staat.
 * Bij een tijdslimiet roept de klok `bijTimeOut` aan; het eerste van antwoord of time-out wint.
 */
export function useKlok(limietMs: number | null, bijTimeOut: (onderbroken: boolean) => void) {
  const start = useRef<number | null>(null);
  const klaar = useRef(false);
  const onderbroken = useRef(false);
  const [loopt, setLoopt] = useState(false);
  const timeOutRef = useRef(bijTimeOut);

  useEffect(() => {
    timeOutRef.current = bijTimeOut;
  }, [bijTimeOut]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let f2 = 0;
    const f1 = requestAnimationFrame(() => {
      f2 = requestAnimationFrame(() => {
        start.current = performance.now();
        setLoopt(true);
        if (limietMs !== null) {
          timer = setTimeout(() => {
            if (klaar.current) return;
            klaar.current = true;
            timeOutRef.current(onderbroken.current);
          }, limietMs);
        }
      });
    });
    const zichtbaarheid = () => {
      if (document.visibilityState === "hidden") onderbroken.current = true;
    };
    document.addEventListener("visibilitychange", zichtbaarheid);
    return () => {
      cancelAnimationFrame(f1);
      cancelAnimationFrame(f2);
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", zichtbaarheid);
    };
  }, [limietMs]);

  /** Sluit de klok af en geeft de reactietijd, of null als de time-out al was afgegaan of de klok nog niet liep. */
  const stop = useCallback((): { ms: number; onderbroken: boolean } | null => {
    if (klaar.current || start.current === null) return null;
    klaar.current = true;
    return { ms: performance.now() - start.current, onderbroken: onderbroken.current };
  }, []);

  return { loopt, stop };
}
