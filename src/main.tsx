import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// On Android, if the app crashes during render (e.g. a Firebase or router
// issue), the user sees an empty black screen with no indication of what went
// wrong. This global handler surfaces the error visually so we can diagnose.
const root = document.getElementById("root")!;

const showFatalError = (error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack || "" : "";
  root.innerHTML = `
    <div style="padding:24px;font-family:monospace;color:#f87171;background:#0a0a0a;min-height:100vh;word-break:break-word">
      <h1 style="font-size:18px;margin-bottom:12px">⚠️ App crashed</h1>
      <p style="font-size:14px;margin-bottom:8px">${msg}</p>
      <pre style="font-size:11px;color:#888;white-space:pre-wrap;max-height:60vh;overflow:auto">${stack}</pre>
    </div>
  `;
};

try {
  createRoot(root).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (err) {
  showFatalError(err);
}

// Catch unhandled promise rejections (e.g. Firebase init failing async)
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
  // Only take over the screen if the root is still empty (nothing rendered)
  if (root.children.length === 0 || root.innerHTML.trim() === "") {
    showFatalError(event.reason);
  }
});
