/**
 * Staging Environment Banner
 *
 * Shows a small fixed banner at the bottom of the screen when the app is
 * running in a staging environment (VITE_APP_ENV=staging).
 * Hidden in production and development.
 */
export function StagingBanner() {
  const appEnv = import.meta.env.VITE_APP_ENV;

  if (appEnv !== "staging") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
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
      ⚠️ STAGING ENVIRONMENT — Data here is not real production data
    </div>
  );
}
