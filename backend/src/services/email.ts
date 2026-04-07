import { Resend } from "resend";

// Lazy-initialize so the server starts even without a Resend key configured yet
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_your")) {
    return null;
  }
  return new Resend(key);
}

const FROM_EMAIL = "Lokal <noreply@lokalhost.club>";

/**
 * Send a welcome email to a new user.
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Lokal! 🚀",
    html: `
      <h1>Welcome to Lokal, ${name}!</h1>
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
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Application received — ${jobTitle} at ${company}`,
    html: `
      <h2>Hi ${applicantName},</h2>
      <p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been received.</p>
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
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You're registered for ${eventTitle}!`,
    html: `
      <h2>Hi ${name},</h2>
      <p>You've successfully registered for <strong>${eventTitle}</strong>.</p>
      <p><strong>Date:</strong> ${eventDate}</p>
      <p><strong>Location:</strong> ${eventLocation}</p>
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
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🎉 You've reached ${newRankName} on Lokal!`,
    html: `
      <h2>Congrats ${name}!</h2>
      <p>You've leveled up to <strong>${newRankName}</strong>!</p>
      <p>Keep building and contributing to the community.</p>
    `,
  });
}
