import assert from "node:assert/strict";
import { getNotificationTarget } from "../src/app/components/notification-navigation.ts";

assert.equal(
  getNotificationTarget({
    type: "LIKE",
    postId: "post-1",
    entityId: "comment-1",
  }),
  "/post/post-1",
);

assert.equal(
  getNotificationTarget({
    type: "COMMENT",
    postId: "post-2",
    entityId: "reply-1",
  }),
  "/post/post-2",
);

for (const type of ["MENTION", "SHARE", "ROAST_REACTION"]) {
  assert.equal(
    getNotificationTarget({ type, postId: "post-3" }),
    "/post/post-3",
  );
}

assert.equal(
  getNotificationTarget({
    type: "PROJECT_ROAST",
    postId: "roast-post-1",
    entityId: "project-1",
  }),
  "/post/roast-post-1",
);

assert.equal(
  getNotificationTarget({
    type: "PROJECT_ROAST",
    entityId: "project-1",
  }),
  "/project/project-1",
);

assert.equal(
  getNotificationTarget({
    type: "FOLLOW",
    actorUsername: "builder",
  }),
  "/profile/builder",
);

assert.equal(getNotificationTarget({ type: "XP_LEVELUP" }), null);

console.log("Notification navigation regression checks passed.");
