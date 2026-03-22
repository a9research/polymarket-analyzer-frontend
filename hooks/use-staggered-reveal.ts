import { useEffect, useLayoutEffect, useState } from "react";

/**
 * `analyze` 成功后：`useLayoutEffect` 同步将 step 置 1，再按间隔递增到 `maxStep`，用于逐块挂载内容。
 */
export function useStaggeredReveal(
  active: boolean,
  maxStep: number,
  intervalMs = 70,
) {
  const [step, setStep] = useState(0);

  useLayoutEffect(() => {
    if (!active || maxStep < 1) {
      setStep(0);
      return;
    }
    setStep(1);
  }, [active, maxStep]);

  useEffect(() => {
    if (!active || maxStep <= 1) return;

    let s = 1;
    const id = window.setInterval(() => {
      s += 1;
      if (s > maxStep) {
        window.clearInterval(id);
        return;
      }
      setStep(s);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, maxStep, intervalMs]);

  return step;
}
