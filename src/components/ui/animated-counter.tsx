import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * Smooth cubic ease-out function for realistic number count-up.
 * Starts fast and smoothly decelerates to final value.
 */
function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

export function AnimatedCounter({
  value,
  duration = 900,
  prefix = "",
  suffix = "",
  decimals,
  className,
}: AnimatedCounterProps) {
  // If target value is invalid or NaN, fallback to 0
  const targetVal = typeof value === "number" && !isNaN(value) ? value : 0;

  // Determine decimals if not specified (cap at 2 maximum to prevent runaway floating points)
  const effectiveDecimals =
    decimals !== undefined
      ? decimals
      : targetVal % 1 !== 0
        ? Math.min(2, targetVal.toString().split(".")[1]?.length ?? 2)
        : 0;

  const [displayValue, setDisplayValue] = useState<number>(0);
  const startValRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || duration <= 0) {
      setDisplayValue(targetVal);
      startValRef.current = targetVal;
      return;
    }

    const startVal = startValRef.current;
    const diff = targetVal - startVal;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const current = startVal + diff * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetVal);
        startValRef.current = targetVal;
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [targetVal, duration]);

  // Format with commas according to locale
  const formattedNumber =
    effectiveDecimals > 0
      ? displayValue.toLocaleString("en-PK", {
          minimumFractionDigits: effectiveDecimals,
          maximumFractionDigits: effectiveDecimals,
        })
      : Math.round(displayValue).toLocaleString("en-PK");

  return (
    <span className={className}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
}
