import { Link } from "react-router";

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;
const MENTION_REGEX = /(^|[^\w])@([A-Za-z0-9_]{3,30})\b/g;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

function cleanMatchedUrl(value: string) {
  let url = value.replace(TRAILING_PUNCTUATION, "");

  const pairs: Array<[string, string]> = [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ];

  for (const [opening, closing] of pairs) {
    const openingCount = url.split(opening).length - 1;
    let closingCount = url.split(closing).length - 1;
    while (url.endsWith(closing) && closingCount > openingCount) {
      url = url.slice(0, -1);
      closingCount -= 1;
    }
  }

  return url;
}

export function extractFirstUrl(text: string): string | null {
  URL_REGEX.lastIndex = 0;
  const match = URL_REGEX.exec(text);
  return match ? cleanMatchedUrl(match[0]) : null;
}

function internalLaunchpadPath(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").replace(/^app\./, "");
    return hostname === "lokalhost.club" && parsed.pathname.startsWith("/launchpad/")
      ? parsed.pathname
      : null;
  } catch {
    return null;
  }
}

export function LinkedPostText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: Array<{ value: string; url?: string; username?: string }> = [];

  function pushTextWithMentions(value: string) {
    let cursor = 0;
    MENTION_REGEX.lastIndex = 0;

    for (const match of value.matchAll(MENTION_REGEX)) {
      const start = match.index ?? 0;
      const prefix = match[1] ?? "";
      const username = match[2] ?? "";
      const mentionStart = start + prefix.length;

      if (mentionStart > cursor) {
        parts.push({ value: value.slice(cursor, mentionStart) });
      }

      parts.push({ value: `@${username}`, username });
      cursor = mentionStart + username.length + 1;
    }

    if (cursor < value.length) {
      parts.push({ value: value.slice(cursor) });
    }
  }

  let cursor = 0;

  URL_REGEX.lastIndex = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const url = cleanMatchedUrl(raw);

    if (start > cursor) {
      pushTextWithMentions(text.slice(cursor, start));
    }
    parts.push({ value: url, url });

    const trailing = raw.slice(url.length);
    if (trailing) parts.push({ value: trailing });
    cursor = start + raw.length;
  }

  if (cursor < text.length) {
    pushTextWithMentions(text.slice(cursor));
  }

  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.url && internalLaunchpadPath(part.url) ? (
          <Link
            key={`${part.url}-${index}`}
            to={internalLaunchpadPath(part.url)!}
            className="text-sky-500 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {part.value}
          </Link>
        ) : part.url ? (
          <a
            key={`${part.url}-${index}`}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-500 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {part.value}
          </a>
        ) : part.username ? (
          <Link
            key={`${part.username}-${index}`}
            to={`/profile/${part.username}`}
            className="font-medium text-sky-500 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {part.value}
          </Link>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}
