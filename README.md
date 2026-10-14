# Voiceoftaade Publications — static website

A responsive, multi-section publishing website prepared for GitHub Pages. It uses plain HTML, CSS, and JavaScript, so no build process or paid hosting is required.

## Included
- Responsive home page and navigation
- Featured ebook section linking to the existing Payhip checkout
- Journal cards with working category filters, search, and article pop-ups
- About, community, social links, and contact sections
- Mobile navigation and accessible reduced-motion support
- GitHub Pages workflow for automatic deployment

## Before publishing
1. Check the contact email in `index.html`. It currently uses `voiceoftaade@gmail.com`; replace it if that is not the email you want public.
2. Confirm your social/community links and Payhip product link.
3. Update the book cover wording and any pricing/availability on Payhip as needed.
4. The journal articles are starter content. Edit them in `index.html` and `script.js` before treating them as final editorial pieces.

## Deploy to GitHub Pages (free)
1. Sign in at https://github.com/ and create a **public** repository named `voiceoftaade-website` (or another name you prefer).
2. Extract this ZIP on your computer.
3. Upload the contents of this folder to the repository root. `index.html`, `styles.css`, and `script.js` should be at the top level, not buried inside another folder.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. The included workflow at `.github/workflows/pages.yml` deploys the site automatically when you push to the `main` branch.
7. Open the **Actions** tab and wait for the Pages deployment workflow to finish successfully.
8. Under **Settings → Pages**, GitHub will show the public URL. For a repository named `voiceoftaade-website`, it will usually be `https://YOUR-USERNAME.github.io/voiceoftaade-website/`. Replace `YOUR-USERNAME` with your GitHub username.

### Alternative: GitHub user site
If you want the URL to be `https://YOUR-USERNAME.github.io/` instead, create the repository with the exact name `YOUR-USERNAME.github.io` and upload the site there.

## Important scope and limitations
GitHub Pages hosts static files. This version is a polished front-end, not a full back-end platform:
- **Ebook sales:** handled by Payhip, so no card details are collected by this site.
- **Reader accounts / login:** not implemented. Real accounts require an authentication provider and backend.
- **Admin dashboard / CMS:** not implemented. For now, edit the files and push changes to GitHub. A headless CMS can be connected later.
- **Newsletter storage and delivery:** not implemented. Use a newsletter service if you want subscriptions.
- **Contact form:** the site provides direct contact links instead of pretending to store submissions.
- **Privacy:** no analytics or cookies are added by this template. Google Fonts is an external service.

## Editing the site
- Page content and sections: `index.html`
- Design and responsive styles: `styles.css`
- Journal content, filtering, and interactions: `script.js`
- Automatic GitHub Pages deployment: `.github/workflows/pages.yml`

## Updating later
Edit the files locally, commit and push to the `main` branch. GitHub Actions redeploys the site automatically.
