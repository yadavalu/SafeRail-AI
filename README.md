# SafeRail

SafeRail's website is built with Next.js, React, and TypeScript.

## Development

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page is at `/`
and the privacy policy is at `/privacy`.

## Production

```bash
npm run build
npm run start
```

`npm run build` also exports the static site to `out/`. Deploy it to GitHub
Pages with:

```bash
npm run deploy
```

The GitHub Pages deployment uses the configured custom domain at the site root.
Run `npm run typecheck` to check TypeScript without building.

## Demo request email

The demo form sends the requester's name and email to `kiyan@saferail.io` via
FormSubmit. On first use, FormSubmit sends an activation email to that inbox.
Open it and confirm the activation link before relying on delivery. No SMTP
credentials or build-time secrets are required.
