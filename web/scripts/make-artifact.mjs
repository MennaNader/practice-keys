// Turns dist/index.html (single-file build) into dist/artifact.html: just the page
// content, without <html>/<head>/<body>, which the Artifact publisher adds itself.
import fs from "node:fs";

const html = fs.readFileSync("dist/index.html", "utf8");
const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? "Practice Keys";
const links = [...html.matchAll(/<link[^>]*>/g)].map((m) => m[0]);
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) =>
  m[0].replace(/ crossorigin(="[^"]*")?/g, ""),
);

const out = [
  `<title>${title}</title>`,
  `<meta name="claude:viewport-fit-sides" content="cover">`,
  ...links,
  ...styles,
  `<div id="root"></div>`,
  ...scripts,
].join("\n");

fs.writeFileSync("dist/artifact.html", out);
console.log(`artifact.html: ${(out.length / 1024).toFixed(0)} KB`);
