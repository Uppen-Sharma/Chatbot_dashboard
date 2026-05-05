import { useEffect, useRef, useState } from "react";

// easeOutQuart — fast start, gentle finish
function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

function getZeroDisplay(rawValue) {
  const stripped = String(rawValue).replace(/,/g, "");
  const match = stripped.match(/^([\d.]+)(.*)$/);

  if (!match) return rawValue;

  const suffix = match[2] || "";
  const hasCommas = String(rawValue).includes(",");
  const decimals = (match[1].split(".")[1] || "").length;

  if (decimals > 0) return `${(0).toFixed(decimals)}${suffix}`;
  if (hasCommas) return `${(0).toLocaleString("en-US")}${suffix}`;
  return `0${suffix}`;
}

/**
 * Animates a numeric string (e.g. "142", "1,234", "87.5%") from 0 to its
 * target value whenever `rawValue` changes. Non-numeric strings (e.g. "N/A")
 * are returned immediately without animation.
 *
 * @param {string} rawValue  - The value string from the API
 * @param {number} duration  - Animation duration in ms (default 1200)
 */
export function useCountUp(rawValue, duration = 1200) {
  const [display, setDisplay] = useState(() => getZeroDisplay(rawValue));
  const rafRef = useRef(null);
  const prevRef = useRef(null);

  useEffect(() => {
    if (prevRef.current === rawValue) return;
    prevRef.current = rawValue;

    const stripped = String(rawValue).replace(/,/g, "");
    const match = stripped.match(/^([\d.]+)(.*)$/);

    if (!match) {
      // Non-numeric — show immediately
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(rawValue);
      return;
    }

    const target = parseFloat(match[1]);
    const suffix = match[2]; // "%" or ""
    const hasCommas = String(rawValue).includes(",");
    const decimals = (match[1].split(".")[1] || "").length;

    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = easeOut(progress) * target;

      let formatted =
        decimals > 0
          ? current.toFixed(decimals)
          : Math.round(current).toString();

      if (hasCommas) {
        formatted = parseInt(formatted, 10).toLocaleString("en-US");
      }

      setDisplay(formatted + suffix);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [rawValue, duration]);

  return display;
}
