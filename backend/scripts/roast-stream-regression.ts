import assert from "node:assert/strict";
import { readNvidiaChatStream } from "../src/services/roast.service";

const encoder = new TextEncoder();
const chunks = [
  'data: {"choices":[{"delta":{"content":"First paragraph."}}]}\r\n\r\n',
  'data: {"choices":[{"delta":{"content":"\\n\\nFinal Verdict: "}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"Done."}}]}\n\n',
  "data: [DONE]\n\n",
];

const response = new Response(
  new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }),
  {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  }
);

async function main() {
  assert.equal(
    await readNvidiaChatStream(response),
    "First paragraph.\n\nFinal Verdict: Done."
  );

  console.log("Roast NVIDIA stream regression checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
