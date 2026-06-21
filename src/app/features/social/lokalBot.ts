import type { MentionUser } from "./components/CommentInput";

export const NGEK_BOT = {
  id: "8c509753-984b-4e2d-85dc-dd6ed0b07a82",
  name: "Ngek The Great Bot",
  username: "ngek",
} satisfies MentionUser;

export const NGEK_MENTION = `@${NGEK_BOT.username}`;
