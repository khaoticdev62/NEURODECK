import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./index.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
} else {
  document.body.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0A0D10;color:#5EEBFF;font-family:sans-serif;"><div>Failed to mount NEURODECK. Root element missing.</div></div>';
}
