# Putting Practice Keys online with GitHub Pages

GitHub Pages serves the built app as a static website, free, straight from your repository. A GitHub Action builds it and publishes it on every push to `main`.

```
git push main ──▶ GitHub Action: test, build ──▶ GitHub Pages ──▶ https://YOUR_USER.github.io/theory-core/
```

## What changes compared to the earlier AWS plan

GitHub Pages only serves files. It has **no server and no user accounts**, so:

- **No login.** Anyone with the link can open the app.
- **Progress still saves**, in **localStorage**: quiz score, best streak, last tab, last maqam and root, settings. It stays in one browser on one device. Another phone or a cleared browser starts at zero. A **Reset my progress** link at the bottom of the app clears it.
- If you later want real accounts, they need a service outside Pages (for example Supabase, Firebase Auth, or the AWS setup this repo used before). The code that handled sign-in was removed, not hidden.
- **Ableton:** the zip export works. "Send to Ableton Live" exists only in the build published inside Claude, because it needs the Claude desktop app.

## One-time setup

1. Create a GitHub repository (suggested name `theory-core`) and push this folder to the `main` branch.
   - **Pages on a free GitHub account needs a public repository.** A private repo needs a paid plan.
   - Check before pushing: no secrets in the repo (there are none in this code).
2. On GitHub: **Settings > Pages > Build and deployment > Source: GitHub Actions.**
3. Push to `main`. Open the **Actions** tab: "CI" and "Deploy to GitHub Pages" should both go green. The deploy job prints the site address.
4. Open `https://YOUR_USER.github.io/theory-core/`.

## Check it works

1. The app opens with no login. Piano keys play (click once on the page first: browsers block sound until you do).
2. Answer a few quiz questions, pick Saba on the Maqam tab, **reload**: score, tab and maqam are still there.
3. Maqam tab: **Export to Ableton** downloads `Saba.zip`. There must be no "Send to Ableton Live" button.
4. DevTools > Console shows no red errors. Fonts come from Google Fonts; if you block them the app still works with system fonts.

## Day to day

```bash
npm test && npm run typecheck          # engine and app tests
cd web && npm run dev:pages            # local preview of the Pages build
cd web && npm run build:pages          # builds web/dist-pages (what gets published)
```

Merge to `main` to publish. To go back, revert the commit and push: the action publishes the previous version.

## Risks

| Risk | Handling |
|---|---|
| Publishing something broken | The deploy workflow runs the tests first and stops if they fail |
| Someone else's saved data in your repo | The repo has no secrets and no user data; progress lives only in each visitor's browser |
| Wrong address (404 or blank page) | The build uses relative file addresses (`base: "./"`), so it works under `/theory-core/` or any other repo name |
| Losing progress | It is per browser, by design; clearing site data deletes it |

## Later, when you want it

- A custom domain: Settings > Pages > Custom domain, then a CNAME record at your domain provider.
- Accounts and progress that follow you across devices: add a hosted service for sign-in and storage, and keep `store.ts` as the local cache.
