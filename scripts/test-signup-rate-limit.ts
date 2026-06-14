import assert from "node:assert/strict";
import {
  EMAIL_SIGNUP_COOLDOWN_MS,
  getCooldownMinutesRemaining,
  isEmailSendRateLimitError,
} from "../src/lib/signup-rate-limit";

assert.equal(
  isEmailSendRateLimitError({
    code: "over_email_send_rate_limit",
    message: "Email rate limit exceeded",
    status: 429,
  }),
  true
);
assert.equal(
  isEmailSendRateLimitError({
    message: "Email rate limit exceeded",
    status: 429,
  }),
  true
);
assert.equal(
  isEmailSendRateLimitError({
    code: "over_request_rate_limit",
    message: "Too many requests",
    status: 429,
  }),
  false
);
assert.equal(
  getCooldownMinutesRemaining(EMAIL_SIGNUP_COOLDOWN_MS, 0),
  15
);
assert.equal(getCooldownMinutesRemaining(1_000, 1_001), 0);

console.log("signup email rate-limit regression tests passed");
