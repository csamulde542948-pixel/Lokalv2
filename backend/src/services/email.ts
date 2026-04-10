import { Resend } from "resend";

// Lazy-initialize so the server starts even without a Resend key configured yet
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_your")) {
    return null;
  }
  return new Resend(key);
}

/**
 * Escape HTML entities to prevent HTML injection in email templates.
 * This is critical because user-provided names, titles, etc. are interpolated
 * directly into HTML email bodies.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const FROM_EMAIL = "Lokal <noreply@lokalhost.club>";

/**
 * Send a welcome email to a new user.
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(name);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Lokal! 🚀",
    html: `
      <h1>Welcome to Lokal, ${safeName}!</h1>
      <p>You're now part of the Filipino developer community.</p>
      <p>Start by completing your profile and sharing your first project!</p>
      <a href="${process.env.FRONTEND_URL}/profile">Complete your profile →</a>
    `,
  });
}

/**
 * Send a job application confirmation.
 */
export async function sendJobApplicationEmail(
  to: string,
  applicantName: string,
  jobTitle: string,
  company: string
) {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(applicantName);
  const safeTitle = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(company);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Application received — ${safeTitle} at ${safeCompany}`,
    html: `
      <h2>Hi ${safeName},</h2>
      <p>Your application for <strong>${safeTitle}</strong> at <strong>${safeCompany}</strong> has been received.</p>
      <p>The hiring team will review it and get back to you soon.</p>
    `,
  });
}

/**
 * Send an event registration confirmation.
 */
export async function sendEventRegistrationEmail(
  to: string,
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string
) {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(eventTitle);
  const safeDate = escapeHtml(eventDate);
  const safeLocation = escapeHtml(eventLocation);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You're registered for ${safeTitle}!`,
    html: `
      <h2>Hi ${safeName},</h2>
      <p>You've successfully registered for <strong>${safeTitle}</strong>.</p>
      <p><strong>Date:</strong> ${safeDate}</p>
      <p><strong>Location:</strong> ${safeLocation}</p>
      <p>See you there!</p>
    `,
  });
}

/**
 * Send XP level-up notification email.
 */
export async function sendLevelUpEmail(
  to: string,
  name: string,
  newRankName: string
) {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(name);
  const safeRank = escapeHtml(newRankName);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🎉 You've reached ${safeRank} on Lokal!`,
    html: `
      <h2>Congrats ${safeName}!</h2>
      <p>You've leveled up to <strong>${safeRank}</strong>!</p>
      <p>Keep building and contributing to the community.</p>
    `,
  });
}
