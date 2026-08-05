import { useEffect } from "react";

export function usePageStyle(css) {
  useEffect(() => {
    const element = document.createElement("style");
    element.dataset.reactPageStyle = "true";
    element.textContent = css;
    document.head.appendChild(element);
    return () => element.remove();
  }, [css]);
}
