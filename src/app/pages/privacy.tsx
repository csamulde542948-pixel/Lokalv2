import { Link } from "react-router";
import { Shield, Database, Eye, Trash2, Globe, Lock, ArrowLeft, ChevronRight } from "lucide-react";
import { BrandLogo } from "../components/brand-logo";

// ─── Standalone Policy Shell ────────────────────────────────────────────────────

function PolicyNav({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ElementType;
}) {
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
            {title}
          </span>
          <Link
            to="/pricing"
            className="text-xs font-semibold font-mono bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1"
          >
            Pricing <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </header>
  );
}

const TOC = [
  { id: "intro",        label: "1. Introduction" },
  { id: "controller",   label: "2. Data Controller" },
  { id: "collect",      label: "3. Data We Collect" },
  { id: "use",          label: "4. How We Use Your Data" },
  { id: "share",        label: "5. How We Share Data" },
  { id: "third-party",  label: "6. Third-Party Services" },
  { id: "retention",    label: "7. Data Retention" },
  { id: "rights",       label: "8. Your Rights (DPA 2012)" },
  { id: "security",     label: "9. Security" },
  { id: "cookies",      label: "10. Cookies" },
  { id: "children",     label: "11. Children" },
  { id: "intl",         label: "12. International Transfers" },
  { id: "changes",      label: "13. Changes" },
  { id: "contact",      label: "14. Contact & NPC" },
];

export function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <PolicyNav title="Privacy Policy" icon={Shield} />

      {/* ── Page hero ── */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Pricing
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Legal · lokalhost.club
              </p>
              <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Last updated: <strong>April 10, 2026</strong> &nbsp;·&nbsp; Effective immediately
              </p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                This Privacy Policy describes how <strong>lokalhost.club</strong> collects, uses, stores,
                and protects your personal information in compliance with the{" "}
                <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>. By using the
                platform you consent to the data practices described herein.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-10">

          {/* ── TOC sidebar ── */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-20 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">Contents</p>
              {TOC.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 px-2 space-y-1.5 border-t mt-4">
                <Link to="/terms" className="block text-xs text-primary hover:underline font-mono">→ Terms of Service</Link>
                <Link to="/refund-policy" className="block text-xs text-primary hover:underline font-mono">→ Refund Policy</Link>
                <Link to="/cookie-policy" className="block text-xs text-primary hover:underline font-mono">→ Cookie Policy</Link>
              </div>
            </div>
          </aside>

          {/* ── Body ── */}
          <div className="flex-1 space-y-8 text-sm text-muted-foreground leading-relaxed pb-16">

            {/* 1 */}
            <section id="intro" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                1. Introduction
              </h2>
              <div className="pl-6 space-y-2">
                <p>
                  lokalhost.club is operated by its development team ("we," "us," or "our"). We act as
                  the <strong>Personal Information Controller</strong> under the DPA 2012. We are committed
                  to protecting your personal data and processing it lawfully, fairly, and transparently.
                </p>
                <p>
                  This Policy applies to all personal data collected through the lokalhost.club website,
                  web application, and any associated services.
                </p>
              </div>
            </section>

            {/* 2 */}
            <section id="controller" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                2. Data Controller
              </h2>
              <div className="pl-6 space-y-2">
                <p>
                  <strong>Controller:</strong> The operators of lokalhost.club (development team, Philippines)
                </p>
                <p>
                  <strong>Data Protection Contact:</strong>{" "}
                  <a href="mailto:privacy@lokalhost.club" className="text-primary hover:underline">
                    privacy@lokalhost.club
                  </a>
                </p>
                <p>
                  For complaints, you may also contact the{" "}
                  <strong>National Privacy Commission (NPC)</strong> of the Philippines at{" "}
                  <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    privacy.gov.ph
                  </a>.
                </p>
              </div>
            </section>

            {/* 3 */}
            <section id="collect" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">3. Data We Collect</h2>
              <div className="pl-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">3.1 Data You Provide Directly</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Account information: name, username, email address, password (hashed)</li>
                    <li>Profile data: bio, location, profile picture, social links, skills, role</li>
                    <li>Content: posts, comments, project listings, messages, job/event listings</li>
                    <li>Roast submissions: project URLs submitted to the AI Roast feature</li>
                    <li>Communications: support requests, feedback, reported content</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">3.2 Data Collected Automatically</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>IP address and approximate geographic location (country/region)</li>
                    <li>Browser type, device type, and operating system</li>
                    <li>Pages visited, features used, and time spent on the platform</li>
                    <li>Authentication sessions stored in secure cookies and active-tab sessionStorage</li>
                    <li>Error and diagnostic logs</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">3.3 Data from Third Parties</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong>OAuth providers</strong> (Google, GitHub): name, email, profile picture,
                      and a unique provider ID — only what you authorise
                    </li>
                    <li>
                      <strong>Web3 wallet</strong>: wallet public address only (no private keys)
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4 */}
            <section id="use" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                4. How We Use Your Data
              </h2>
              <div className="pl-6 space-y-2">
                <p>We process your data on the following legal bases (DPA 2012, Sec. 12 &amp; 13):</p>
                <table className="w-full text-xs border-collapse mt-2">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-foreground font-semibold">Purpose</th>
                      <th className="text-left py-2 text-foreground font-semibold">Legal Basis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      ["Providing and operating the platform", "Contract performance"],
                      ["Creating and managing your account", "Contract performance"],
                      ["Enabling developer connections and messaging", "Contract performance"],
                      ["Personalising your feed and recommendations", "Legitimate interest"],
                      ["Sending transactional notifications (mentions, replies)", "Contract performance"],
                      ["Sending optional marketing/newsletter emails", "Consent (opt-in)"],
                      ["Detecting fraud, abuse, and security threats", "Legitimate interest / legal obligation"],
                      ["Analytics and platform improvement", "Legitimate interest"],
                      ["Legal and regulatory compliance", "Legal obligation"],
                      ["Logging roast consent (URL, timestamp, user ID)", "Legitimate interest / contract"],
                    ].map(([p, b]) => (
                      <tr key={p}>
                        <td className="py-2 pr-4">{p}</td>
                        <td className="py-2 text-foreground/70">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5 */}
            <section id="share" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">5. How We Share Data</h2>
              <div className="pl-6 space-y-2">
                <p>We <strong>do not sell</strong> your personal data. We share it only in these circumstances:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Public content:</strong> Posts, projects, and profiles you set as public are visible to all users</li>
                  <li><strong>Service providers:</strong> Infrastructure partners (Supabase, etc.) process data on our behalf under data processing agreements</li>
                  <li><strong>AI providers:</strong> When you use Roast, your project URL is sent to OpenRouter/DeepSeek solely to generate the output — no personal account data is transmitted</li>
                  <li><strong>Legal requirements:</strong> We may disclose data to comply with a court order, subpoena, or lawful request from a Philippine government authority</li>
                  <li><strong>Business transfer:</strong> In a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity under comparable privacy protections</li>
                  <li><strong>Safety:</strong> To protect the rights, property, or safety of Lokalhost, our users, or the public</li>
                </ul>
              </div>
            </section>

            {/* 6 */}
            <section id="third-party" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                6. Third-Party Services
              </h2>
              <div className="pl-6 space-y-2">
                <p>We rely on the following key third-party processors:</p>
                <table className="w-full text-xs border-collapse mt-2">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-foreground font-semibold">Service</th>
                      <th className="text-left py-2 pr-4 text-foreground font-semibold">Purpose</th>
                      <th className="text-left py-2 text-foreground font-semibold">Data shared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      ["Supabase", "Database, auth, storage", "All account & platform data"],
                      ["OpenRouter / DeepSeek", "AI Roast generation", "Project URL only"],
                      ["Microlink", "Project screenshots", "Project URL only"],
                      ["Jina Reader", "Web scraping for Roast", "Project URL only"],
                      ["Google OAuth", "Sign-in", "Name, email, avatar"],
                      ["GitHub OAuth", "Sign-in", "Name, email, avatar"],
                    ].map(([s, p, d]) => (
                      <tr key={s}>
                        <td className="py-2 pr-4 font-medium text-foreground/80">{s}</td>
                        <td className="py-2 pr-4">{p}</td>
                        <td className="py-2">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs mt-2">
                  Each of these providers has their own privacy policy. We encourage you to review them.
                  We enter into data processing agreements where applicable.
                </p>
              </div>
            </section>

            {/* 7 */}
            <section id="retention" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">7. Data Retention</h2>
              <div className="pl-6 space-y-2">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Active account data</strong> — retained as long as your account is active</li>
                  <li><strong>Public posts &amp; projects</strong> — retained until you delete them or your account</li>
                  <li><strong>Private messages</strong> — retained for 12 months after last activity, then deleted</li>
                  <li><strong>Roast consent logs</strong> — retained for 3 years (evidence of voluntary consent)</li>
                  <li><strong>Security &amp; error logs</strong> — retained for 90 days</li>
                  <li><strong>Deleted accounts</strong> — anonymised within 30 days; certain data may be retained up to 90 days for fraud/legal obligations, then permanently deleted</li>
                </ul>
              </div>
            </section>

            {/* 8 */}
            <section id="rights" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                8. Your Rights Under DPA 2012
              </h2>
              <div className="pl-6 space-y-2">
                <p>
                  As a data subject under the Philippine Data Privacy Act of 2012, you have the following
                  rights. To exercise any of them, email{" "}
                  <a href="mailto:privacy@lokalhost.club" className="text-primary hover:underline">
                    privacy@lokalhost.club
                  </a>{" "}
                  with proof of identity. We will respond within <strong>15 business days</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Right to be informed</strong> — know how your data is being processed</li>
                  <li><strong>Right of access</strong> — request a copy of the personal data we hold about you</li>
                  <li><strong>Right to rectification</strong> — correct inaccurate or incomplete data</li>
                  <li><strong>Right to erasure / "right to be forgotten"</strong> — request deletion of your personal data (subject to legal retention obligations)</li>
                  <li><strong>Right to object</strong> — object to processing based on legitimate interest</li>
                  <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format</li>
                  <li><strong>Right to lodge a complaint</strong> — file a complaint with the National Privacy Commission (NPC) at <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">privacy.gov.ph</a></li>
                </ul>
              </div>
            </section>

            {/* 9 */}
            <section id="security" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                9. Security
              </h2>
              <div className="pl-6 space-y-2">
                <p>We implement appropriate organisational and technical measures including:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Passwords hashed using bcrypt via Supabase Auth (never stored in plain text)</li>
                  <li>All data in transit encrypted via TLS 1.2+</li>
                  <li>Database-level Row Level Security (RLS) policies limiting data access</li>
                  <li>JWT-based authentication with short-lived tokens</li>
                  <li>Regular security reviews and dependency audits</li>
                </ul>
                <p>
                  No method of internet transmission is 100% secure. In the event of a personal data
                  breach likely to cause harm, we will notify affected users and the NPC within{" "}
                  <strong>72 hours</strong> of discovery, as required by DPA 2012 Sec. 20(f).
                </p>
              </div>
            </section>

            {/* 10 */}
            <section id="cookies" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">10. Cookies &amp; Local Storage</h2>
              <div className="pl-6 space-y-2">
                <p>
                  We use secure cookies and active-tab sessionStorage for authentication. LocalStorage is used only for non-sensitive preferences.
                  See our full{" "}
                  <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>{" "}
                  for details. You can disable cookies in your browser settings, but some features
                  (including login) will not function without them.
                </p>
              </div>
            </section>

            {/* 11 */}
            <section id="children" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">11. Children</h2>
              <div className="pl-6 space-y-2">
                <p>
                  lokalhost.club is not intended for individuals under 18 years of age. We do not
                  knowingly collect personal data from minors. If we discover that we have collected
                  data from a person under 18, we will delete it within 30 days. If you believe a
                  minor has registered, contact{" "}
                  <a href="mailto:privacy@lokalhost.club" className="text-primary hover:underline">
                    privacy@lokalhost.club
                  </a>.
                </p>
              </div>
            </section>

            {/* 12 */}
            <section id="intl" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                12. International Data Transfers
              </h2>
              <div className="pl-6 space-y-2">
                <p>
                  Your data may be stored and processed in servers outside the Philippines (e.g.,
                  Supabase infrastructure). Where such transfers occur, we ensure that appropriate
                  safeguards are in place, consistent with DPA 2012 requirements and NPC guidelines
                  on cross-border data transfers.
                </p>
              </div>
            </section>

            {/* 13 */}
            <section id="changes" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">13. Changes to This Policy</h2>
              <div className="pl-6 space-y-2">
                <p>
                  We may update this Privacy Policy periodically. Material changes will be announced
                  via a platform notification at least 7 days before taking effect. The "Last updated"
                  date at the top of this page indicates when changes were last made. Continued use
                  of the platform constitutes acceptance of the revised Policy.
                </p>
              </div>
            </section>

            {/* 14 */}
            <section id="contact" className="scroll-mt-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">14. Contact &amp; NPC</h2>
              <div className="pl-6 space-y-2">
                <ul className="list-none space-y-1">
                  <li><strong>Data Privacy Officer:</strong>{" "}<a href="mailto:privacy@lokalhost.club" className="text-primary hover:underline">privacy@lokalhost.club</a></li>
                  <li><strong>General Legal:</strong>{" "}<a href="mailto:legal@lokalhost.club" className="text-primary hover:underline">legal@lokalhost.club</a></li>
                  <li>
                    <strong>National Privacy Commission (PH):</strong>{" "}
                    <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      privacy.gov.ph
                    </a>
                  </li>
                </ul>
                <p className="text-xs mt-3 pt-3 border-t">
                  This Policy is written in plain English for clarity. It does not replace formal legal
                  advice. For complex data compliance matters, consult a Philippine Bar-licensed attorney.
                </p>
              </div>
            </section>

          </div>{/* end body */}
        </div>{/* end flex */}

        {/* ── Legal cross-links footer ── */}
        <div className="border-t mt-10 pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { to: "/terms", label: "Terms of Service" },
            { to: "/refund-policy", label: "Refund Policy" },
            { to: "/cookie-policy", label: "Cookie Policy" },
            { to: "/acceptable-use", label: "Acceptable Use" },
            { to: "/pricing", label: "Pricing" },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-[11px] text-muted-foreground hover:text-foreground font-mono transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted-foreground font-mono mt-3 pb-10">
          © {new Date().getFullYear()} lokalhost.club &middot; Built for Filipino devs 🇵🇭
        </p>

      </div>
    </div>
  );
}
