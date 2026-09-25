"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
export function AnimatedNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.textContent = value;
    if (reduced) return;
    const match = value.match(/([\d,.]+)/);
    if (!match) return;
    const target = Number(match[0].replaceAll(",", ""));
    const decimals = match[0].includes(".") ? match[0].split(".")[1].length : 0;
    let frame = 0;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / 550, 1);
      const number = target * (0.88 + 0.12 * (1 - Math.pow(1 - progress, 3)));
      if (node)
        node.textContent = value.replace(
          match![0],
          number.toLocaleString("en-GB", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }),
        );
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.textContent = value;
    };
  }, [value, reduced]);
  return (
    <span aria-label={value}>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
    </span>
  );
}
