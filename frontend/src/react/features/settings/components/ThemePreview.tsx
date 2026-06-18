import type { ThemePreviewColors } from "../types";

export function ThemePreview({ name, color }: { name: string; color: ThemePreviewColors }) {
  const c = color;
  return (
    <div
      aria-hidden="true"
      title={`Preview: ${name}`}
      className="relative overflow-hidden rounded-xl border select-none transition-all duration-200"
      style={{ height: "150px", background: c.surface.app, borderColor: c.border.default }}
    >
      {/* Sidebar strip */}
      <div
        className="absolute inset-y-0 left-0 flex flex-col items-center gap-2 py-3"
        style={{
          width: "36px",
          background: c.surface.sidebar,
          borderRight: `1px solid ${c.border.subtle}`,
        }}
      >
        <div
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "4px",
            background: c.accent.primary,
          }}
        />
        {[0.35, 0.25, 0.2].map((op, i) => (
          <div
            key={i}
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "4px",
              background: c.text.muted,
              opacity: op,
            }}
          />
        ))}
      </div>

      {/* Main pane */}
      <div className="absolute inset-0" style={{ left: "36px", padding: "10px 10px 8px" }}>
        {/* Topbar */}
        <div className="flex items-center gap-1.5 mb-2">
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: c.accent.primary,
            }}
          />
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              background: c.text.muted,
              width: "50px",
              opacity: 0.45,
            }}
          />
          <div
            style={{
              marginLeft: "auto",
              width: "32px",
              height: "13px",
              borderRadius: "5px",
              background: c.accent.primary,
              opacity: 0.85,
            }}
          />
        </div>

        {/* Response card */}
        <div
          className="mb-2 rounded-lg p-1.5"
          style={{ background: c.surface.raised, border: `1px solid ${c.border.subtle}` }}
        >
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              background: c.text.primary,
              width: "78%",
              marginBottom: "4px",
              opacity: 0.75,
            }}
          />
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              background: c.text.muted,
              width: "60%",
              marginBottom: "3px",
              opacity: 0.5,
            }}
          />
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              background: c.text.muted,
              width: "42%",
              opacity: 0.35,
            }}
          />
        </div>

        {/* Input row */}
        <div className="flex items-center gap-1.5 mb-2">
          <div
            style={{
              flex: 1,
              height: "16px",
              borderRadius: "5px",
              background: c.surface.input,
              border: `1px solid ${c.border.default}`,
            }}
          />
          <div
            style={{
              width: "20px",
              height: "16px",
              borderRadius: "5px",
              background: c.accent.primary,
              opacity: 0.9,
            }}
          />
        </div>

        {/* State pills */}
        <div className="flex gap-1">
          <div
            style={{ height: "3px", borderRadius: "2px", flex: 3, background: c.accent.primary }}
          />
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              flex: 1,
              background: c.state.success,
              opacity: 0.75,
            }}
          />
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              flex: 1,
              background: c.state.warning,
              opacity: 0.75,
            }}
          />
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              flex: 1,
              background: c.state.error,
              opacity: 0.75,
            }}
          />
        </div>
      </div>
    </div>
  );
}
