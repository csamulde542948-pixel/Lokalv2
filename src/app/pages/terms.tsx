import { Link } from "react-router";
import { FileText, AlertTriangle, Shield, Bot, Scale, Flag, ChevronRight, ArrowLeft } from "lucide-react";
import { BrandLogo } from "../components/brand-logo";

const TOC = [
  { id: "acceptance",       label: "1. Acceptance of Terms" },
  { id: "platform",         label: "2. About the Platform" },
  { id: "accounts",         label: "3. User Accounts" },
  { id: "conduct",          label: "4. Content & Conduct" },
  { id: "ai-roast",         label: "5. AI Roast Feature" },
  { id: "ai-content",       label: "6. AI-Generated Content Disclaimer" },
  { id: "voluntary",        label: "7. Voluntary Submission" },
  { id: "own-work",         label: "8. Own-Work Clause" },
  { id: "ip",               label: "9. Intellectual Property" },
  { id: "liability",        label: "10. Limitation of Liability" },
  { id: "privacy",          label: "11. Privacy & Data" },
  { id: "termination",      label: "12. Termination" },
  { id: "disputes",         label: "13. Disputes & Governing Law" },
  { id: "changes",          label: "14. Changes to These Terms" },
  { id: "contact",          label: "15. Contact" },
];

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

export function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <PolicyNav title="Terms of Service" icon={FileText} />

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
              <FileText className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Legal · lokalhost.club
              </p>
              <h1 className="text-2xl font-bold mb-1">Terms of Service</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Last updated: <strong>April 10, 2026</strong> &nbsp;·&nbsp; Effective immediately
              </p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                These Terms govern your use of <strong>lokalhost.club</strong> — a community platform
                for independent software developers in the Philippines and globally. By using this
                platform you agree to these Terms in full.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-10">

          {/* ── Sticky TOC sidebar ── */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-20 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">
                Contents
              </p>
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 px-2 space-y-1.5 border-t mt-4">
                <Link to="/privacy" className="block text-xs text-primary hover:underline font-mono">
                  → Privacy Policy
                </Link>
                <Link to="/refund-policy" className="block text-xs text-primary hover:underline font-mono">
                  → Refund Policy
                </Link>
                <Link to="/pricing" className="block text-xs text-primary hover:underline font-mono">
                  → Pricing
                </Link>
              </div>
            </div>
          </aside>

            {/* ── Body ── */}
            <div className="flex-1 space-y-8 text-sm text-muted-foreground leading-relaxed pb-16">

              {/* 1 */}
              <section id="acceptance" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                  1. Acceptance of Terms
                </h2>
                <div className="pl-6 space-y-2">
                  <p>
                    By registering an account, accessing content, or using any feature of lokalhost.club
                    (including the AI Roast tool), you confirm that you are at least <strong>18 years old</strong>,
                    have read these Terms, and agree to be legally bound by them together with our{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,{" "}
                    <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>, and{" "}
                    <Link to="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</Link>.
                  </p>
                  <p>
                    If you are using the platform on behalf of an organisation, you represent that you
                    have authority to bind that organisation to these Terms.
                  </p>
                </div>
              </section>

              {/* 2 */}
              <section id="platform" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">2. About the Platform</h2>
                <div className="pl-6 space-y-2">
                  <p>
                    lokalhost.club is a social community platform for independent software developers,
                    primarily based in the Philippines. Features include: developer profiles, a social feed,
                    project showcasing, job and event listings, peer messaging, a leaderboard, a Launchpad
                    for project launches, and the <strong>AI Roast</strong> feature — an AI-powered
                    satirical feedback tool for web projects.
                  </p>
                  <p>
                    The platform is provided on an <em>"as is" and "as available"</em> basis. We make no
                    representations regarding uptime, uninterrupted availability, or freedom from errors.
                  </p>
                </div>
              </section>

              {/* 3 */}
              <section id="accounts" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">3. User Accounts</h2>
                <div className="pl-6 space-y-2">
                  <p>Certain features require a registered account. By creating an account you agree to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Provide accurate, current, and complete registration information</li>
                    <li>Keep your information up to date</li>
                    <li>Maintain the confidentiality of your login credentials</li>
                    <li>Accept responsibility for all activity that occurs under your account</li>
                    <li>Notify us immediately at security@lokalhost.club of any unauthorised access</li>
                  </ul>
                  <p>
                    We may require age verification at any time. Accounts created on behalf of a minor
                    will be suspended without refund.
                  </p>
                </div>
              </section>

              {/* 4 */}
              <section id="conduct" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Flag className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                  4. Content & Conduct
                </h2>
                <div className="pl-6 space-y-2">
                  <p>You are solely responsible for any content you post. You agree <strong>not</strong> to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Post content that is illegal, harmful, threatening, abusive, or defamatory</li>
                    <li>Infringe the intellectual property or privacy rights of any third party</li>
                    <li>Impersonate any person, entity, or brand</li>
                    <li>Distribute spam, unsolicited bulk messages, malware, or malicious code</li>
                    <li>Harass, bully, dox, or intimidate other users</li>
                    <li>Post false factual claims, disinformation, or manipulated media</li>
                    <li>Submit others' work to the AI Roast tool without their explicit consent</li>
                    <li>Attempt to circumvent rate limits, access controls, or security mechanisms</li>
                    <li>Violate any applicable Philippine or international law or regulation</li>
                  </ul>
                  <p>
                    We reserve the right to remove any content and to suspend or permanently terminate
                    any account that violates these rules, at our sole discretion and without prior notice.
                  </p>
                </div>
              </section>

              {/* 5 */}
              <section id="ai-roast" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                  5. AI Roast Feature
                </h2>
                <div className="pl-6 space-y-2">
                  <p>
                    The AI Roast feature uses a large language model (currently DeepSeek via OpenRouter)
                    to generate satirical, AI-driven feedback about a submitted web project.
                  </p>
                  <p><strong>By submitting a project URL to the Roast feature you confirm that:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>You own the project or have been granted explicit permission by the owner to submit it</li>
                    <li>You are doing so voluntarily and understand the output will be AI-generated satire</li>
                    <li>You accept the AI Content Disclaimer in Section 6</li>
                    <li>You will not use Roast output to harass, defame, or harm individuals behind any project</li>
                  </ul>
                  <p>
                    We log the URL, a timestamp, and (if authenticated) your user ID at the point of
                    consent. This record constitutes evidence of voluntary submission.
                  </p>
                </div>
              </section>

              {/* 6 */}
              <section id="ai-content" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" strokeWidth={2} />
                  6. AI-Generated Content Disclaimer
                </h2>
                <div className="pl-6 space-y-2">
                  <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 px-4 py-3 space-y-2">
                    <p className="font-semibold text-foreground">
                      ⚠ All Roast outputs are AI-generated satirical content.
                    </p>
                    <p>
                      Roast results do <strong>not</strong> represent the views, opinions, or assessments
                      of Lokalhost or its developers. They are produced by an automated language model
                      and are intended purely for entertainment and constructive feedback purposes.
                    </p>
                    <p>Roast outputs <strong>do not constitute</strong>:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Verified facts or factual assessments of any person, company, or project</li>
                      <li>Professional technical, legal, financial, or business advice</li>
                      <li>A statement of opinion held by Lokalhost or any human reviewer</li>
                    </ul>
                    <p>
                      Every Roast result is labelled with this disclaimer. If you believe a Roast output
                      is harmful or factually dangerous, use the Report button on the result page or
                      contact{" "}
                      <a href="mailto:abuse@lokalhost.club" className="text-primary hover:underline">
                        abuse@lokalhost.club
                      </a>.
                    </p>
                  </div>
                </div>
              </section>

              {/* 7 */}
              <section id="voluntary" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">7. Voluntary Submission</h2>
                <div className="pl-6 space-y-2">
                  <p>
                    Users who submit their work for roasting do so knowingly and voluntarily. Submission
                    constitutes explicit consent to receive AI-generated satirical feedback. You acknowledge
                    that such feedback may be critical, humorous, or unflattering.
                  </p>
                  <p>
                    Lokalhost is <strong>not liable</strong> for emotional distress, reputational concern,
                    or offence arising from AI-generated Roast content that you have voluntarily requested.
                  </p>
                </div>
              </section>

              {/* 8 */}
              <section id="own-work" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">8. Own-Work Clause</h2>
                <div className="pl-6 space-y-2">
                  <p>
                    Only the legitimate owner or an authorised representative of a project may submit it
                    to the AI Roast feature. Submitting another person's or organisation's work without
                    their consent is a <strong>material violation</strong> of these Terms and may result in
                    immediate account termination and, where applicable, legal referral.
                  </p>
                  <p>
                    If you believe your project was submitted without your consent, contact us immediately
                    at{" "}
                    <a href="mailto:legal@lokalhost.club" className="text-primary hover:underline">
                      legal@lokalhost.club
                    </a>. We will investigate and remove the content within 72 hours upon verified request.
                  </p>
                </div>
              </section>

              {/* 9 */}
              <section id="ip" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                  9. Intellectual Property
                </h2>
                <div className="pl-6 space-y-2">
                  <p>
                    <strong>Your content:</strong> You retain full ownership of all content you post.
                    By posting content you grant Lokalhost a worldwide, non-exclusive, royalty-free,
                    sublicensable licence to host, reproduce, display, and distribute that content
                    solely for the purpose of operating and improving the platform.
                  </p>
                  <p>
                    <strong>Our content:</strong> The lokalhost.club brand, logo, name, design system,
                    and all platform-level code are protected by applicable copyright and trademark laws.
                    You may not copy, reproduce, or create derivative works from them without written
                    permission.
                  </p>
                  <p>
                    <strong>AI Roast output:</strong> You may share Roast results for personal and
                    non-commercial purposes provided the AI disclaimer accompanies the content. You may
                    not represent AI Roast output as a human expert opinion or use it commercially without
                    written consent.
                  </p>
                </div>
              </section>

              {/* 10 */}
              <section id="liability" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                  10. Limitation of Liability
                </h2>
                <div className="pl-6 space-y-2">
                  <p>
                    To the maximum extent permitted by applicable law, Lokalhost and its operators shall{" "}
                    <strong>not</strong> be liable for:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                    <li>Loss of profits, data, goodwill, or business opportunities</li>
                    <li>Emotional distress or reputational harm from AI-generated content you voluntarily requested</li>
                    <li>Damages arising from third-party services (Supabase, OpenRouter, Microlink, etc.) outside our control</li>
                    <li>Service interruptions or data loss despite reasonable precautions</li>
                  </ul>
                  <p>
                    Where liability cannot be fully excluded under Philippine law, our total aggregate
                    liability shall not exceed <strong>PHP 5,000 (five thousand Philippine pesos)</strong>.
                  </p>
                </div>
              </section>

              {/* 11 */}
              <section id="privacy-ref" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">11. Privacy & Data</h2>
                <div className="pl-6">
                  <p>
                    Your personal data is processed in accordance with our{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
                    which describes how we collect, use, store, and protect your information in compliance
                    with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the Philippines.
                  </p>
                </div>
              </section>

              {/* 12 */}
              <section id="termination" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">12. Termination</h2>
                <div className="pl-6 space-y-2">
                  <p>We may suspend or terminate your access at any time for:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Violation of these Terms or our Acceptable Use Policy</li>
                    <li>Providing false registration information</li>
                    <li>Any activity posing a security risk to the platform or other users</li>
                    <li>Legal obligations or regulatory requirements</li>
                  </ul>
                  <p>
                    You may delete your account at any time via{" "}
                    <strong>Settings → Account → Delete Account</strong>. Sections 6, 7, 8, 9, 10, and
                    13 survive termination of these Terms.
                  </p>
                </div>
              </section>

              {/* 13 */}
              <section id="disputes" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                  13. Disputes & Governing Law
                </h2>
                <div className="pl-6 space-y-2">
                  <p>
                    These Terms are governed by and construed in accordance with the laws of the{" "}
                    <strong>Republic of the Philippines</strong>. Any dispute shall first be subject to
                    good-faith negotiation. If unresolved within 30 days, disputes shall be submitted
                    to mediation in Metro Manila, Philippines.
                  </p>
                  <p>
                    If mediation fails, disputes shall be resolved by the appropriate courts of Metro
                    Manila. You waive any right to participate in a class action or class-wide arbitration.
                  </p>
                  <p className="italic text-xs">
                    These Terms do not replace advice from a licensed attorney. For formal legal matters,
                    consult a Philippine Bar-licensed lawyer (budget PHP 5,000–15,000 for a legal review).
                  </p>
                </div>
              </section>

              {/* 14 */}
              <section id="changes" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">14. Changes to These Terms</h2>
                <div className="pl-6 space-y-2">
                  <p>
                    We reserve the right to update these Terms at any time. Material changes will be
                    communicated via a platform banner at least 7 days before taking effect. Continued
                    use of lokalhost.club after the effective date constitutes acceptance of the revised Terms.
                  </p>
                </div>
              </section>

              {/* 15 */}
              <section id="contact" className="scroll-mt-6 space-y-3">
                <h2 className="text-base font-semibold text-foreground">15. Contact</h2>
                <div className="pl-6 space-y-2">
                  <ul className="list-none space-y-1">
                    <li><strong>General:</strong>{" "}<a href="mailto:legal@lokalhost.club" className="text-primary hover:underline">legal@lokalhost.club</a></li>
                    <li><strong>Privacy / Data:</strong>{" "}<a href="mailto:privacy@lokalhost.club" className="text-primary hover:underline">privacy@lokalhost.club</a></li>
                    <li><strong>Abuse / Reports:</strong>{" "}<a href="mailto:abuse@lokalhost.club" className="text-primary hover:underline">abuse@lokalhost.club</a></li>
                    <li><strong>Security:</strong>{" "}<a href="mailto:security@lokalhost.club" className="text-primary hover:underline">security@lokalhost.club</a></li>
                  </ul>
                  <p className="text-xs mt-3 pt-3 border-t">
                    None of this replaces advice from a licensed attorney. For formal legal matters,
                    consult a Philippine Bar-licensed lawyer.
                  </p>
                </div>
              </section>

          </div>{/* end body */}

        </div>{/* end flex */}

        {/* ── Legal cross-links footer ── */}
        <div className="border-t mt-10 pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { to: "/privacy", label: "Privacy Policy" },
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
