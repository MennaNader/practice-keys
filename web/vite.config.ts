import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// The app imports the theory engine from ../src, one level above this folder.
//
// Two builds from one codebase:
//   npm run build        "claude" build: ONE html file, for publishing inside Claude (dist/)
//   npm run build:pages  "pages" build: normal files for GitHub Pages (dist-pages/)
//
// base "./" makes every file address relative, so the site works at https://USER.github.io/REPO/ whatever the repo is called.
export default defineConfig(({ mode }) => ({
  plugins: mode === "pages" ? [react()] : [react(), viteSingleFile()],
  base: mode === "pages" ? "./" : "/",
  server: { fs: { allow: [".."] } },
  build: { target: "es2020", outDir: mode === "pages" ? "dist-pages" : "dist" },
}));
