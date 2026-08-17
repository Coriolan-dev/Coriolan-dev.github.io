import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("page includes essential metadata", () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta\s+name="description"/);
  assert.match(html, /<link rel="canonical"/);
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /<meta\s+property="og:image"/);
  assert.match(html, /<meta\s+name="twitter:image"/);
});

test("page has one primary heading and unique section ids", () => {
  assert.equal(html.match(/<h1(?:\s|>)/g)?.length, 1);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    [
      "main",
      "top",
      "experience",
      "projects",
      "writing",
      "stack",
      "about",
      "contact",
    ].every((id) => ids.includes(id)),
    true,
  );
});

test("external links are protected", () => {
  const externalLinks = [...html.matchAll(/<a\s[\s\S]*?<\/a>/g)].filter((match) =>
    match[0].includes('target="_blank"'),
  );

  assert.ok(externalLinks.length >= 10);
  for (const link of externalLinks) {
    assert.match(link[0], /rel="noopener noreferrer"/);
  }
});

test("published reviews link to the public report repository", () => {
  const reportLinks = [
    ...html.matchAll(
      /href="(https:\/\/github\.com\/trailofbits\/publications\/[^"]+\.pdf)"/g,
    ),
  ];

  assert.equal(reportLinks.length, 7);
});

test("responsive and reduced-motion styles exist", () => {
  assert.match(css, /@media \(max-width: 44rem\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
});

test("local navigation and social image targets exist", async () => {
  const ids = new Set(
    [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
  );
  const fragments = [...html.matchAll(/href="#([^"]+)"/g)].map(
    (match) => match[1],
  );

  for (const fragment of fragments) {
    assert.ok(ids.has(fragment), `Missing target for #${fragment}`);
  }

  await access(new URL("../assets/og.png", import.meta.url));
});

test("experience content follows the requested public profile", () => {
  assert.match(html, /<strong>Security Engineer<\/strong>/);
  assert.doesNotMatch(html, /project-disclosure/);

  for (const employer of ["Trail of Bits", "Black Paper", "Xtramile", "BulldozAIR"]) {
    assert.match(html, new RegExp(employer));
  }

  assert.equal(html.match(/<details\s+class="experience-card/g)?.length, 4);
});

test("both Medium articles are included", () => {
  const mediumArticles = new Set(
    [...html.matchAll(/href="(https:\/\/medium\.com\/@coriopinhas\/[^"]+)"/g)].map(
      (match) => match[1],
    ),
  );

  assert.equal(mediumArticles.size, 2);
});
