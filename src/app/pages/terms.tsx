import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { FileText } from "lucide-react";

export function Terms() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 border-x">
        <div className="max-w-[800px] mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Terms of Service</h1>
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
                  Welcome to lokalhost.club ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of our platform, a community platform for indie developers in the Philippines. By accessing or using lokalhost.club, you agree to be bound by these Terms.
                </p>
              </section>

              {/* Acceptance of Terms */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">2. Acceptance of Terms</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By creating an account or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, please do not use our platform.
                </p>
              </section>

              {/* User Accounts */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">3. User Accounts</h2>
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <p>You must create an account to use certain features of lokalhost.club. You agree to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Provide accurate, current, and complete information during registration</li>
                    <li>Maintain and update your information to keep it accurate and current</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized access or security breach</li>
                  </ul>
                </div>
              </section>

              {/* Content and Conduct */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">4. Content and Conduct</h2>
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <p>You are responsible for the content you post on lokalhost.club. You agree not to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Post content that is illegal, harmful, threatening, abusive, or offensive</li>
                    <li>Infringe on the intellectual property rights of others</li>
                    <li>Impersonate any person or entity</li>
                    <li>Post spam, malware, or malicious code</li>
                    <li>Harass, bully, or harm other users</li>
                    <li>Violate any applicable laws or regulations</li>
                  </ul>
                </div>
              </section>

              {/* Intellectual Property */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">5. Intellectual Property</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You retain ownership of the content you post on lokalhost.club. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display your content for the purpose of operating and improving our platform. The lokalhost.club platform, including its design, logo, and features, are owned by us and protected by intellectual property laws.
                </p>
              </section>

              {/* Community Guidelines */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">6. Community Guidelines</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  lokalhost.club is a professional community for indie developers. We expect all users to maintain a respectful and constructive environment. We reserve the right to remove content or suspend accounts that violate our community guidelines or these Terms.
                </p>
              </section>

              {/* Termination */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">7. Termination</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We may suspend or terminate your account at any time, with or without notice, for any violation of these Terms or for any other reason we deem appropriate. You may also delete your account at any time through your account settings.
                </p>
              </section>

              {/* Disclaimer of Warranties */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">8. Disclaimer of Warranties</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  lokalhost.club is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the platform will be uninterrupted, secure, or error-free.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">9. Limitation of Liability</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To the maximum extent permitted by law, lokalhost.club and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.
                </p>
              </section>

              {/* Changes to Terms */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">10. Changes to Terms</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the updated Terms on our platform. Your continued use of lokalhost.club after changes constitutes acceptance of the updated Terms.
                </p>
              </section>

              {/* Governing Law */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">11. Governing Law</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions.
                </p>
              </section>

              {/* Contact */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">12. Contact Us</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us at legal@lokalhost.club
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
