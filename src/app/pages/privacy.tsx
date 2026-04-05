import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Shield } from "lucide-react";

export function Privacy() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 border-x">
        <div className="max-w-[800px] mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Privacy Policy</h1>
                <p className="text-sm text-muted-foreground">Last updated: April 5, 2026</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <Card className="border">
            <CardContent className="p-6 space-y-6">
              {/* Introduction */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">1. Introduction</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  At lokalhost.club, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our platform. By using lokalhost.club, you consent to the data practices described in this policy.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">2. Information We Collect</h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">2.1 Information You Provide</h3>
                    <p>We collect information you provide directly to us, including:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Account information (name, email address, username, password)</li>
                      <li>Profile information (bio, location, profile picture, skills)</li>
                      <li>Content you post (projects, posts, comments, messages)</li>
                      <li>Communications with us (support requests, feedback)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">2.2 Information We Collect Automatically</h3>
                    <p>When you use lokalhost.club, we automatically collect:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Device information (IP address, browser type, operating system)</li>
                      <li>Usage information (pages visited, features used, time spent)</li>
                      <li>Cookies and similar tracking technologies</li>
                      <li>Log data (access times, error logs)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* How We Use Your Information */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">3. How We Use Your Information</h2>
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Provide, maintain, and improve our platform</li>
                    <li>Create and manage your account</li>
                    <li>Enable you to connect with other developers</li>
                    <li>Personalize your experience and show relevant content</li>
                    <li>Send you updates, notifications, and promotional content</li>
                    <li>Respond to your requests and provide customer support</li>
                    <li>Monitor and analyze usage trends and patterns</li>
                    <li>Detect, prevent, and address security issues and fraud</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </div>
              </section>

              {/* How We Share Your Information */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">4. How We Share Your Information</h2>
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <p>We may share your information in the following circumstances:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Public Content:</strong> Content you post publicly (projects, posts) is visible to other users</li>
                    <li><strong>With Your Consent:</strong> We share information when you give us permission</li>
                    <li><strong>Service Providers:</strong> We work with third-party service providers who help us operate our platform</li>
                    <li><strong>Legal Requirements:</strong> We may disclose information to comply with legal obligations</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                    <li><strong>Protection:</strong> To protect the rights, property, and safety of lokalhost.club and our users</li>
                  </ul>
                </div>
              </section>

              {/* Data Security */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">5. Data Security</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              {/* Your Privacy Rights */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">6. Your Privacy Rights</h2>
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <p>You have the following rights regarding your personal information:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Access:</strong> Request access to your personal information</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                    <li><strong>Export:</strong> Request a copy of your data in a portable format</li>
                    <li><strong>Opt-Out:</strong> Opt out of marketing communications</li>
                    <li><strong>Restriction:</strong> Request restriction of processing</li>
                  </ul>
                  <p className="mt-2">To exercise these rights, please contact us at privacy@lokalhost.club</p>
                </div>
              </section>

              {/* Cookies and Tracking */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">7. Cookies and Tracking Technologies</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies and similar tracking technologies to collect information about your browsing activities. You can control cookies through your browser settings. However, disabling cookies may affect your ability to use certain features of our platform.
                </p>
              </section>

              {/* Third-Party Services */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">8. Third-Party Services</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our platform may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing them with your information.
                </p>
              </section>

              {/* Children's Privacy */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">9. Children's Privacy</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  lokalhost.club is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information.
                </p>
              </section>

              {/* Data Retention */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">10. Data Retention</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this Privacy Policy. When you delete your account, we will delete or anonymize your information, except where we are required to retain it for legal or operational purposes.
                </p>
              </section>

              {/* International Data Transfers */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">11. International Data Transfers</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your information may be transferred to and processed in countries other than the Philippines. We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
                </p>
              </section>

              {/* Changes to Privacy Policy */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">12. Changes to This Privacy Policy</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our platform and updating the "Last updated" date. Your continued use of lokalhost.club after changes constitutes acceptance of the updated Privacy Policy.
                </p>
              </section>

              {/* Contact */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">13. Contact Us</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
                </p>
                <ul className="list-none space-y-1 ml-4 text-sm text-muted-foreground">
                  <li>Email: privacy@lokalhost.club</li>
                  <li>Website: lokalhost.club</li>
                </ul>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
