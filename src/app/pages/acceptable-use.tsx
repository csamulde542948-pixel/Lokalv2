import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";

export function AcceptableUse() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 border-x">
        <div className="max-w-[800px] mx-auto px-4 py-8 space-y-8 text-sm text-muted-foreground leading-relaxed">

          {/* Header */}
          <div className="flex items-start gap-4 pb-6 border-b">
            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-destructive" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Acceptable Use Policy</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Last updated: <strong>April 10, 2026</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-xl">
                This Acceptable Use Policy ("AUP") supplements our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and
                sets out what you may and may not do on lokalhost.club. Violations may result in
                immediate account suspension or termination.
              </p>
            </div>
          </div>

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Permitted Uses</h2>
            <p>You may use lokalhost.club to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Create a developer profile and showcase your projects</li>
              <li>Post updates, share code, and participate in community discussions</li>
              <li>Connect with other developers, send direct messages, and collaborate</li>
              <li>Submit your own projects to the AI Roast feature for satirical feedback</li>
              <li>Post and apply to job listings and community events</li>
              <li>Participate in the leaderboard and earn XP through platform activity</li>
            </ul>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Prohibited Content</h2>
            <p>You must <strong>not</strong> post, upload, or transmit content that:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Is illegal under Philippine or applicable international law</li>
              <li>Is defamatory, fraudulent, or constitutes hate speech targeting any group</li>
              <li>Contains sexual content involving minors (CSAM) — zero tolerance, will be reported to authorities</li>
              <li>Doxxes, exposes private information of individuals without consent</li>
              <li>Spreads deliberate disinformation or manipulated media</li>
              <li>Constitutes spam, chain letters, or unsolicited mass messaging</li>
              <li>Contains malware, viruses, Trojans, ransomware, or any malicious code</li>
              <li>Promotes or facilitates illegal activities including hacking or phishing</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. AI Roast Restrictions</h2>
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3 space-y-2">
              <p>You must <strong>not</strong> use the AI Roast feature to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Submit a project you do not own or lack explicit permission to submit</li>
                <li>Target an individual's personal website with intent to harass or harm them</li>
                <li>Generate roast output for use in a smear campaign or coordinated harassment</li>
                <li>Circumvent rate limits or generate roasts at automated scale</li>
                <li>Represent AI-generated satire as factual expert opinion</li>
              </ul>
              <p className="text-xs">
                Violation of roast-specific rules constitutes a material breach of our{" "}
                <Link to="/terms#own-work" className="text-primary hover:underline">Own-Work Clause</Link> and{" "}
                <Link to="/terms#voluntary" className="text-primary hover:underline">Voluntary Submission</Link> sections.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Account & Platform Abuse</h2>
            <p>You must <strong>not</strong>:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Create multiple accounts to circumvent bans, rate limits, or platform rules</li>
              <li>Impersonate another developer, company, public figure, or Lokalhost staff</li>
              <li>Artificially inflate XP, upvotes, or engagement metrics</li>
              <li>Scrape or harvest user data using automated tools without written permission</li>
              <li>Conduct penetration testing or security scanning without written authorisation</li>
              <li>Attempt to access accounts, data, or systems that are not your own</li>
              <li>Sell, transfer, or sublicense access to your account</li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Enforcement</h2>
            <p>
              We reserve the right to take any of the following actions for violations of this AUP,
              at our sole discretion and without prior notice:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Issue a warning or content removal notice</li>
              <li>Temporarily restrict or suspend account functionality</li>
              <li>Permanently ban the account and any associated accounts</li>
              <li>Report conduct to the appropriate Philippine law enforcement authorities</li>
              <li>Pursue civil legal remedies for damages caused to Lokalhost or its users</li>
            </ul>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Reporting Violations</h2>
            <p>
              If you encounter content or behaviour that violates this AUP, please report it:
            </p>
            <ul className="list-none space-y-1 ml-2">
              <li><strong>Abuse / harassment:</strong>{" "}<a href="mailto:abuse@lokalhost.club" className="text-primary hover:underline">abuse@lokalhost.club</a></li>
              <li><strong>Security issues:</strong>{" "}<a href="mailto:security@lokalhost.club" className="text-primary hover:underline">security@lokalhost.club</a></li>
              <li><strong>Legal / IP matters:</strong>{" "}<a href="mailto:legal@lokalhost.club" className="text-primary hover:underline">legal@lokalhost.club</a></li>
            </ul>
            <p>Use the Report button on any post, roast result, or profile for in-app reporting.</p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Changes</h2>
            <p>
              We may update this AUP at any time. Continued use of the platform constitutes acceptance
              of the current version, always available at{" "}
              <Link to="/acceptable-use" className="text-primary hover:underline">
                lokalhost.club/acceptable-use
              </Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
