import { useCallback, useEffect, useRef, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const showToast = useCallback((message, type = "error", duration = 2000) => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, showToast, clearToast: () => setToast(null) };
}
