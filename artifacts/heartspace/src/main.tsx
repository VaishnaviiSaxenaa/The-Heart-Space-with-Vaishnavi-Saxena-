import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/* Expose JS errors in the console so they appear in Replit logs */
window.onerror = (msg, src, line, col, err) => {
  console.error("[HeartSpace crash]", msg, { src, line, col, stack: err?.stack });
};
window.onunhandledrejection = (e) => {
  console.error("[HeartSpace unhandled promise]", e.reason);
};

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ErrorBoundary caught]", msg);
    return { hasError: true, error: msg };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error("[ErrorBoundary detail]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "#FAF7F2",
            fontFamily: "Georgia, serif",
          }}
        >
          <svg width="48" height="44" viewBox="0 0 22 20" fill="none" style={{ marginBottom: "1rem" }}>
            <path
              d="M11 18.5C11 18.5 1.5 12.5 1.5 6.5C1.5 4.01 3.51 2 6 2C8 2 9.75 3.1 11 4.75C12.25 3.1 14 2 16 2C18.49 2 20.5 4.01 20.5 6.5C20.5 12.5 11 18.5 11 18.5Z"
              stroke="#E6A756" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <h1 style={{ color: "#3D2314", fontSize: "1.5rem", marginBottom: "0.5rem" }}>HeartSpace</h1>
          <p style={{ color: "#8C7B70", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
            Something went wrong. Please reload to continue.
          </p>
          {this.state.error && (
            <p style={{ color: "#C0392B", fontSize: "0.75rem", marginBottom: "1.5rem", maxWidth: 400, textAlign: "center" }}>
              {this.state.error}
            </p>
          )}
          <a
            href="/"
            style={{
              padding: "0.75rem 2rem",
              background: "linear-gradient(135deg, #C8922A 0%, #E6A756 100%)",
              color: "#FAF7F2",
              borderRadius: "0.75rem",
              textDecoration: "none",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
            onClick={() => this.setState({ hasError: false, error: "" })}
          >
            Back to Login
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
