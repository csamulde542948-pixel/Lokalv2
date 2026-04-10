import { Link } from "react-router";
import { RotateCcw, ArrowLeft, ChevronRight, CheckCircle2, XCircle, Clock, Mail, CreditCard, AlertCircle } from "lucide-react";
import { BrandLogo } from "../components/brand-logo";

const TOC = [
  { id: "overview",     label: "1. Overview" },
  { id: "eligible",     label: "2. Eligible Refunds" },
  { id: "ineligible",   label: "3. Non-Refundable Situations" },
  { id: "how-to",       label: "4. How to Request a Refund" },
  { id: "processing",   label: "5. Processing Time" },
  { id: "disputes",     label: "6. Disputes & Chargebacks" },
  { id: "paddle",       label: "7. Paddle as Merchant of Record" },
  { id: "contact",      label: "8. Contact" },
];

// ─── Standalone Policy Shell ────────────────────────────────────────────────────

function PolicyNav() {
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
            Refund Policy
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

export function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <PolicyNav />

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
              <RotateCcw className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Legal · lokalhost.club
              </p>
              <h1 className="text-2xl font-bold mb-1">Refund Policy</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Last updated: <strong>April 10, 2026</strong> &nbsp;·&nbsp; Effective immediately
              </p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                This policy applies to all paid features on <strong>lokalhost.club</strong>, including
                Featured Slots purchased through our payment processor, Paddle. Please read it before
                completing a purchase.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-10">

          {/* ── Sticky TOC ── */}
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
                <Link to="/privacy" className="block text-xs text-primary hover:underline font-mono">→ Privacy Policy</Link>
                <Link to="/pricing" className="block text-xs text-primary hover:underline font-mono">→ Pricing</Link>
              </div>
            </div>
          </aside>

          {/* ── Body ── */}
          <article className="flex-1 min-w-0 space-y-10 text-sm leading-relaxed pb-16">

            {/* 1 — Overview */}
            <section id="overview" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                1. Overview
              </h2>
              <div className="pl-6 text-muted-foreground space-y-2">
                <p>
                  lokalhost.club offers digital advertising products — specifically,{" "}
                  <strong>Featured Slots</strong> that promote your project on the Launchpad feed for a
                  fixed duration. Because these are time-limited digital goods that begin delivery upon
                  purchase, refund eligibility is based on whether the slot has started delivering
                  impressions.
                </p>
                <p>
                  All payments are processed by <strong>Paddle</strong>, who acts as Merchant of Record.
                  Your card details are handled entirely by Paddle and never stored on lokalhost.club servers.
                </p>
              </div>
            </section>

            {/* 2 — Eligible Refunds */}
            <section id="eligible" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={2} />
                2. Eligible Refunds
              </h2>
              <div className="pl-6 space-y-3">
                <p className="text-muted-foreground">
                  You are entitled to a <strong>full refund</strong> in the following situations:
                </p>
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-2">
                  {[
                    "Your slot has not yet gone live (no impressions have been served).",
                    "You purchased a slot and a technical error on our side prevented it from activating.",
                    "You were charged more than once for the same slot (duplicate charge).",
                    "Your purchase was made within the last 48 hours and the slot has not started.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  To request a refund, see{" "}
                  <a href="#how-to" className="text-primary hover:underline">Section 4</a>.
                </p>
              </div>
            </section>

            {/* 3 — Non-Refundable */}
            <section id="ineligible" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive flex-shrink-0" strokeWidth={2} />
                3. Non-Refundable Situations
              </h2>
              <div className="pl-6 space-y-3">
                <p className="text-muted-foreground">
                  Refunds are <strong>not available</strong> in the following circumstances:
                </p>
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                  {[
                    "Your featured slot is already active and impressions have begun.",
                    "You changed your mind after the slot started delivering.",
                    "Your account was suspended or removed for a violation of our Terms of Service or Acceptable Use Policy.",
                    "You did not achieve the business results you expected (e.g., low sign-ups, poor conversion) — we sell visibility, not outcomes.",
                    "The slot expired naturally at the end of its duration.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-xs">
                      <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 4 — How to Request */}
            <section id="how-to" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                4. How to Request a Refund
              </h2>
              <div className="pl-6 space-y-3 text-muted-foreground">
                <p>
                  Contact us at{" "}
                  <a href="mailto:hello@lokalhost.club" className="text-primary hover:underline font-mono">
                    hello@lokalhost.club
                  </a>{" "}
                  with the subject line <strong>"Refund Request"</strong> and include:
                </p>
                <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                  {[
                    "Your full name and the email address used for the purchase.",
                    "The Paddle order ID or receipt number (found in your Paddle confirmation email).",
                    "The reason for your refund request.",
                  ].map((item, i) => (
                    <div key={item} className="flex items-start gap-2.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold font-mono flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px]">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs">
                  We aim to respond to all refund requests within <strong>2 business days</strong>.
                </p>
              </div>
            </section>

            {/* 5 — Processing Time */}
            <section id="processing" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                5. Processing Time
              </h2>
              <div className="pl-6 text-muted-foreground">
                <p>
                  Once a refund is approved, Paddle will issue the refund to your original payment method.
                  Depending on your bank or card issuer, refunds typically appear within{" "}
                  <strong>5–10 business days</strong>. lokalhost.club has no control over how quickly
                  your financial institution posts the credit.
                </p>
              </div>
            </section>

            {/* 6 — Disputes */}
            <section id="disputes" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                6. Disputes &amp; Chargebacks
              </h2>
              <div className="pl-6 text-muted-foreground">
                <p>
                  We strongly encourage you to contact us directly before filing a dispute or chargeback
                  with your bank. We resolve legitimate issues quickly and a chargeback can complicate the
                  process for both parties. If a chargeback is filed without contacting us first, we reserve
                  the right to suspend your account pending resolution.
                </p>
              </div>
            </section>

            {/* 7 — Paddle */}
            <section id="paddle" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                7. Paddle as Merchant of Record
              </h2>
              <div className="pl-6 space-y-3 text-muted-foreground">
                <p>
                  All transactions on lokalhost.club are processed by{" "}
                  <a
                    href="https://www.paddle.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Paddle.com
                  </a>
                  , who acts as the Merchant of Record. Paddle is responsible for billing, invoicing,
                  sales tax compliance, and payment processing. Your payment details are handled
                  entirely by Paddle and never stored on lokalhost.club servers.
                </p>
                <div className="rounded-xl border bg-muted/40 p-4 text-xs">
                  <p className="font-semibold text-foreground mb-1">Paddle billing support</p>
                  <p>
                    For billing inquiries, you may also contact Paddle directly at{" "}
                    <a
                      href="https://www.paddle.com/help"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono"
                    >
                      paddle.com/help
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* 8 — Contact */}
            <section id="contact" className="scroll-mt-20">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                8. Contact
              </h2>
              <div className="pl-6 text-muted-foreground">
                <div className="rounded-xl border bg-card p-5 text-xs font-mono space-y-1.5">
                  <p className="font-bold text-foreground text-sm mb-2">lokalhost.club</p>
                  <p>
                    <span className="text-muted-foreground">Email: </span>
                    <a href="mailto:hello@lokalhost.club" className="text-primary hover:underline">
                      hello@lokalhost.club
                    </a>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Website: </span>
                    <a href="https://lokalhost.club" className="text-primary hover:underline">
                      lokalhost.club
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* Related links */}
            <div className="border-t pt-6 flex flex-wrap gap-4 text-xs font-mono">
              <Link to="/terms" className="text-primary hover:underline">Terms of Service →</Link>
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy →</Link>
              <Link to="/acceptable-use" className="text-primary hover:underline">Acceptable Use →</Link>
              <Link to="/pricing" className="text-primary hover:underline">Pricing →</Link>
            </div>

          </article>
        </div>

        {/* ── Legal cross-links footer ── */}
        <div className="border-t mt-10 pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { to: "/terms", label: "Terms of Service" },
            { to: "/privacy", label: "Privacy Policy" },
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
