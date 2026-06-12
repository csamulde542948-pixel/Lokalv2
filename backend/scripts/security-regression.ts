import assert from "node:assert/strict";
import { analyzeGraphqlRequest } from "../src/lib/graphqlRequest";
import { isPublicIpAddress } from "../src/lib/ssrf";

const fragmentMutation = analyzeGraphqlRequest(`
  mutation PublishMany {
    ...Writes
  }

  fragment Writes on Mutation {
    first: createPost(input: { content: "one" }) { id }
    second: createPost(input: { content: "two" }) { id }
  }
`);

assert.equal(fragmentMutation.isMutation, true);
assert.equal(fragmentMutation.mutationFieldCounts.createPost, 2);
assert.equal(fragmentMutation.topLevelMutationFieldCount, 2);

const selectedQuery = analyzeGraphqlRequest(
  `
    query Read { health }
    mutation Write { deletePost(id: "example") }
  `,
  "Read"
);
assert.equal(selectedQuery.isMutation, false);

const inlineMutation = analyzeGraphqlRequest(`
  mutation Write {
    ... on Mutation {
      a: deletePost(id: "a")
      b: deletePost(id: "b")
    }
  }
`);
assert.equal(inlineMutation.mutationFieldCounts.deletePost, 2);

for (const blocked of [
  "0.0.0.0",
  "10.0.0.1",
  "100.64.0.1",
  "127.255.255.255",
  "169.254.169.254",
  "172.31.255.255",
  "192.168.1.1",
  "198.18.0.1",
  "224.0.0.1",
  "::",
  "::1",
  "::ffff:127.0.0.1",
  "fc00::1",
  "fe80::1",
  "2001:db8::1",
]) {
  assert.equal(isPublicIpAddress(blocked), false, `${blocked} must be blocked`);
}

for (const allowed of [
  "1.1.1.1",
  "8.8.8.8",
  "93.184.216.34",
  "2606:4700:4700::1111",
]) {
  assert.equal(isPublicIpAddress(allowed), true, `${allowed} must be public`);
}

console.log("Security regression checks passed.");
