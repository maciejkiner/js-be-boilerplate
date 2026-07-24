import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "./cn.js";

export type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const TONE_CLASS: Record<ToastTone, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-slate-800",
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Powiadomienia DS (mock inventory: toast). Auto-znikają po 4s. Osadź wysoko w drzewie skorupy. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        role="region"
        aria-label="Powiadomienia"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "rounded-md px-4 py-2 text-sm text-white shadow-lg",
              TONE_CLASS[item.tone],
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast: brak <ToastProvider> w drzewie.");
  }
  return context;
}
