import assert from "node:assert/strict";
import { normalizeCountry, resolveViewerCountry } from "../api/viewer-geo.js";

assert.equal(normalizeCountry("de"), "DE");
assert.equal(normalizeCountry(" PH "), "PH");
assert.equal(normalizeCountry("Germany"), null);
assert.equal(resolveViewerCountry({ "x-vercel-ip-country": "DE" }), "DE");
assert.equal(resolveViewerCountry({ "cf-ipcountry": "PH" }), "PH");
assert.equal(resolveViewerCountry({}), null);

const languageFor = (country) => country === "PH" ? "taglish" : "english";
assert.equal(languageFor(resolveViewerCountry({ "x-vercel-ip-country": "DE" })), "english");
assert.equal(languageFor(resolveViewerCountry({})), "english");

console.log("viewer geo regression tests passed");
