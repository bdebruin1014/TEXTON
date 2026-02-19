import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "./useDebounce";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave<T>(value: T, saveFn: (value: T) => Promise<void>, delay = 800) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const debouncedValue = useDebounce(value, delay);
  const isFirstRender = useRef(true);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debouncedValue === undefined) return;

    setStatus("saving");
    saveFnRef
      .current(debouncedValue)
      .then(() => {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      })
      .catch(() => setStatus("error"));
  }, [debouncedValue]);

  const reset = useCallback(() => setStatus("idle"), []);

  return { status, reset };
}
