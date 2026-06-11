// ─── useLayoutBottomOffset ────────────────────────────────────────────────────
// Measures the height of the Layout's bottom-fixed element (desktop footer or
// mobile tab bar) so a fixed background layer (e.g. ASCII fire) can stop
// flush against it instead of being covered. Mirrors the pattern used by
// `src/app/pages/projects.tsx`.

import { useLayoutEffect, useState } from "react";

export function useLayoutBottomOffset(): number {
  const [bottomOffset, setBottomOffset] = useState<number>(56);

  useLayoutEffect(() => {
    const measure = () => {
      const footer = document.querySelector<HTMLElement>("footer.fixed.bottom-0");
      const tabBar = document.querySelector<HTMLElement>("nav.fixed.bottom-0");
      const isDesktop = window.innerWidth >= 1024; // lg breakpoint
      const el = isDesktop ? footer : tabBar;
      if (el) {
        setBottomOffset(el.getBoundingClientRect().height);
      } else {
        setBottomOffset(isDesktop ? 60 : 56);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return bottomOffset;
}
