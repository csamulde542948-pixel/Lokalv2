export function timeAgo(value: string) {
  const date = new Date(value);
  const elapsedMs = Date.now() - date.getTime();
  const seconds = Math.max(0, Math.floor(elapsedMs / 1_000));

  if (seconds < 60) return `${seconds || 1} ${seconds === 1 ? "sec" : "secs"} ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "min" : "mins"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;

  if (hours < 48) return "Yesterday";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}
