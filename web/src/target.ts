/**
 * Which build this is. "claude" is the page published inside Claude (it can reach Ableton through the desktop app).
 * "pages" is the version for your own website on GitHub Pages: it cannot use the Ableton connection.
 * Set by `VITE_TARGET` at build time, so the code of the other build is left out of the file entirely.
 */
export const TARGET: "claude" | "pages" = import.meta.env.VITE_TARGET === "pages" ? "pages" : "claude";
export const IS_PAGES = TARGET === "pages";
