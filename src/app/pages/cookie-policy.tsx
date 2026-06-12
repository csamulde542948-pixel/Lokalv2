import { Link } from "react-router";
import { Cookie } from "lucide-react";

export function CookiePolicy() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 border-x">
        <div className="max-w-[800px] mx-auto px-4 py-8 space-y-8 text-sm text-muted-foreground leading-relaxed">

          {/* Header */}
          <div className="flex items-start gap-4 pb-6 border-b">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Cookie className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cookie Policy</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Last updated: <strong>April 10, 2026</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-xl">
                This Cookie Policy explains how lokalhost.club uses cookies and similar technologies.
                For full data practices see our{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>

          {/* 1 */}
          <section id="what" className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files placed on your device by a website. They allow the site to
              remember your preferences and actions over time. We also use browser <strong>localStorage</strong> and{" "}
              <strong>sessionStorage</strong> for similar purposes.
            </p>
          </section>

          {/* 2 */}
          <section id="types" className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Cookies We Use</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-foreground font-semibold">Name / Key</th>
                  <th className="text-left py-2 pr-4 text-foreground font-semibold">Type</th>
                  <th className="text-left py-2 pr-4 text-foreground font-semibold">Purpose</th>
                  <th className="text-left py-2 text-foreground font-semibold">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  ["lokal_access_token", "HttpOnly cookie", "Authenticates backend requests without exposing the token to page scripts", "1 hour"],
                  ["lokal_refresh_token", "HttpOnly cookie", "Renews the backend session", "30 days"],
                  ["lokal_csrf_token", "Secure cookie / sessionStorage", "Protects authenticated mutations from cross-site requests", "Up to 30 days"],
                  ["lokal-supabase-auth", "sessionStorage", "Supabase authentication session for the active tab", "Until the tab is closed"],
                  ["lokal:pending_roast", "sessionStorage", "Temporarily stores roast data across redirect", "Browser session"],
                  ["lokal:pending_publish", "sessionStorage", "Tracks pending publish action across auth redirect", "Browser session"],
                  ["lokal:auth_redirect", "sessionStorage", "Saves redirect target for OAuth flows", "Browser session"],
                  ["theme", "localStorage", "Remembers your light/dark mode preference", "Persistent (no expiry)"],
                  ["lokal:roast_consent", "sessionStorage", "Records roast consent within a session", "Browser session"],
                ].map(([n, t, p, e]) => (
                  <tr key={n}>
                    <td className="py-2 pr-4 font-mono text-[11px] text-foreground/80">{n}</td>
                    <td className="py-2 pr-4">{t}</td>
                    <td className="py-2 pr-4">{p}</td>
                    <td className="py-2">{e}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs">
              We do <strong>not</strong> currently use third-party advertising or tracking cookies.
              We do not use Google Analytics or Facebook Pixel.
            </p>
          </section>

          {/* 3 */}
          <section id="essential" className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Essential vs. Non-Essential</h2>
            <div className="space-y-2">
              <p>
                <strong>Essential cookies</strong> (backend session and CSRF tokens) are strictly necessary for
                the platform to function. You cannot opt out of these without disabling your account
                session entirely.
              </p>
              <p>
                <strong>Non-essential cookies</strong> (theme preference, sessionStorage items) are
                convenience features. You can clear them at any time through your browser's developer
                tools or storage settings.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section id="control" className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Managing Cookies</h2>
            <p>You can control cookies through your browser settings:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data
              </li>
              <li>
                <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
              </li>
              <li>
                <strong>Safari:</strong> Preferences → Privacy → Manage Website Data
              </li>
              <li>
                <strong>Edge:</strong> Settings → Cookies and site permissions
              </li>
            </ul>
            <p>
              Blocking essential auth cookies will prevent you from logging in and using most platform features.
            </p>
          </section>

          {/* 5 */}
          <section id="changes" className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Changes</h2>
            <p>
              We may update this Cookie Policy when we introduce new technologies or change our practices.
              Changes will be posted here with an updated date.
            </p>
          </section>

          {/* 6 */}
          <section id="contact" className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Contact</h2>
            <p>
              Questions about cookies?{" "}
              <a href="mailto:privacy@lokalhost.club" className="text-primary hover:underline">
                privacy@lokalhost.club
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
