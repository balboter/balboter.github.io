# {{CLIENT_NAME}} — Site vitrine

Site B2B vitrine construit avec **Astro 5 + Tailwind v4**.

## Démarrer

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # build production -> dist/
pnpm preview  # preview du build
```

## Structure

```
src/
├── components/        # Hero, FeatureGrid, Testimonials, CTA, Header, Footer
├── layouts/
│   └── BaseLayout.astro   # meta, OG, schema.org, lang fr-FR
├── pages/
│   ├── index.astro
│   ├── services.astro
│   ├── about.astro
│   ├── contact.astro
│   ├── mentions-legales.astro
│   └── politique-de-confidentialite.astro
└── styles/
    └── global.css     # Tailwind v4 + tokens couleur brand
```

## Personnalisation

1. Remplacer `{{CLIENT_NAME}}`, `{{CLIENT_TAGLINE}}`, etc. (chercher `grep -r "{{CLIENT" src/ public/`).
2. Adapter la palette dans `src/styles/global.css` (`--color-brand-*`).
3. Remplir les vraies données dans `mentions-legales.astro` (SIRET, RCS, etc.).
4. Configurer `PUBLIC_SITE_URL` et l'email de contact dans `.env.local`.
5. Mettre à jour `site:` dans `astro.config.mjs`.

## Standards

- Mobile-first, breakpoints sm/md/lg/xl.
- WCAG AA, contraste 4.5:1 minimum.
- HTML lang="fr-FR".
- Meta + OG + schema.org Organization déjà câblés.
- Sitemap XML auto-généré via `@astrojs/sitemap`.
- Pas de cookies (CNIL-exempt), Plausible Analytics recommandé.

## Déploiement

```bash
vercel              # preview
vercel --prod       # production
```
