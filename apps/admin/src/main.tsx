import { ApiProvider } from "@repo/api-react";
import { ToastProvider } from "@repo/design-system";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { apiClient, queryClient } from "./api";
import { router } from "./routes";
import "./app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Brak elementu #root w index.html");
}

// Provider order: Query (cache) → Api (the client) → Toast (notifications) → Router (the views).
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={apiClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>,
);
