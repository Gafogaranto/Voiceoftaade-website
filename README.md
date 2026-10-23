# Voiceoftaade Publications

Official publishing website for Voiceoftaade: books, daily journals, reflections, community links, and reader accounts.

Live site: https://gafogaranto.github.io/Voiceoftaade-website/

## Architecture

This project intentionally uses a lightweight static frontend hosted on GitHub Pages:

- `index.html`, `styles.css`, and `script.js`: public website, navigation, journal content, search, category filtering, and journal interactions.
- `account.html` and `account.js`: reader sign-up/sign-in, password reset, profile editing, and profile-photo uploads.
- Supabase Auth and PostgreSQL: reader authentication and profile records.
- Supabase Storage: reader avatar and cover images.
- OneSignal: web push notifications.
- `manifest.webmanifest`, `sw.js`, and `OneSignalSDKWorker.js`: installable web-app and service-worker support.
- `.github/workflows/pages.yml`: automatic deployment to GitHub Pages when changes reach `main`.

The browser-facing Supabase publishable key is expected to be public. Database security must therefore be enforced with Row Level Security (RLS), least-privilege grants, and storage policies. Never place a Supabase service-role key, database password, or other server secret in this repository or browser JavaScript.

## Current functionality

- Responsive public publishing homepage and shared navigation.
- Book promotion and external Payhip checkout.
- Daily journals with search, category filtering, article pop-ups, and saved/favourite collections.
- Reader account registration, email/password sign-in, password-reset flow, and profile details.
- Profile avatar and cover-photo upload support through Supabase Storage.
- OneSignal web push integration.
- Installable web-app manifest and service-worker support.

## Known limitations and work in progress

- Signed-in readers' saved and favourite journals are stored in Supabase with per-user row-level security. Legacy local collections are migrated on sign-in; verify this flow with a test account before relying on it for production data.
- Reading history records the journal when it is opened (currently 100% at open, not granular scroll-based progress). More precise scroll progress is a future improvement.
- Google OAuth is not considered configured until provider credentials are set in Supabase and the complete sign-in flow is tested.
- The latest successful GitHub Pages deployment does not by itself prove every live feature works. Test account flows, uploads, notifications, mobile navigation, saved journals, and offline behaviour in a real browser.
- Supabase security advisor reports leaked-password protection is disabled on the current plan. This setting has not been enabled; enabling it requires a plan that supports the feature.
- This static site does not provide a private editorial CMS. Public journal content is currently maintained in the repository.
- Book purchases are handled by the external Payhip checkout; this website should not collect payment-card details.

## Development and release workflow

1. Make a focused change and review the complete diff before committing.
2. Keep public content separate from private reader data.
3. Do not weaken RLS or Storage policies to make a feature work. Every private-data table needs user-scoped policies and appropriate grants.
4. Test desktop and mobile layouts, signed-out and signed-in states, failure states, and relevant accessibility behaviour.
5. Push to `main`; GitHub Actions deploys the static site.
6. Confirm the latest workflow run succeeds, then verify the deployed website. A successful workflow is deployment evidence, not a substitute for browser testing.

## Key files

| File | Responsibility |
| --- | --- |
| `index.html` | Public homepage and content structure |
| `styles.css` | Shared visual system and responsive styles |
| `script.js` | Journal data and public-page interactions |
| `account.html` | Reader account interface |
| `account.js` | Supabase authentication, profile and image upload logic |
| `sw.js` | Website service-worker caching |
| `manifest.webmanifest` | Installable web-app metadata |
| `.github/workflows/pages.yml` | GitHub Pages deployment |

## Deployment

GitHub Pages is configured to deploy from the GitHub Actions workflow at `.github/workflows/pages.yml`. The production site is:

https://gafogaranto.github.io/Voiceoftaade-website/

After changes are pushed, inspect the Actions tab for the workflow result and verify the live site after deployment.