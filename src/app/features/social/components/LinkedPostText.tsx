const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;
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

export function LinkedPostText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: Array<{ value: string; url?: string }> = [];
  let cursor = 0;

  URL_REGEX.lastIndex = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const url = cleanMatchedUrl(raw);

    if (start > cursor) {
      parts.push({ value: text.slice(cursor, start) });
    }
    parts.push({ value: url, url });

    const trailing = raw.slice(url.length);
    if (trailing) parts.push({ value: trailing });
    cursor = start + raw.length;
  }

  if (cursor < text.length) {
    parts.push({ value: text.slice(cursor) });
  }

  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.url ? (
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
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}
