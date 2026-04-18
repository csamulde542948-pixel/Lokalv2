/**
 * Staging Environment Banner
 *
 * Shows a fixed banner at the top of the screen when VITE_APP_ENV=staging.
 * Hidden in production and development.
 */
import { IS_STAGING } from "../../lib/env";

export function StagingBanner() {
  if (!IS_STAGING) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#f59e0b",
        color: "#000",
        textAlign: "center",
        padding: "4px 0",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      ⚠️ STAGING — Not production data. Do not share these URLs.
    </div>
  );
}
