import { useEffect } from "react";

export function usePageStyle(css) {
  useEffect(() => {
    const element = document.createElement("style");
    element.dataset.reactPageStyle = "true";
    // Keep the original page stylesheet as a structural fallback, but place it
    // below the redesign stylesheet in the cascade. This prevents legacy
    // colors, type and spacing from winning merely because a page selector is
    // more specific or injected later at runtime.
    element.textContent = `@layer legacy {${css}}`;
    document.head.appendChild(element);
    return () => element.remove();
  }, [css]);
}
