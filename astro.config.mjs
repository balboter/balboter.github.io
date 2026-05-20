// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// PREVIEW : sur GitHub Pages, le site est servi sous /poelesgodin-refonte
// Quand on bascule sur le vrai domaine (poelesgodin.fr), il suffira d'unsetter "base"
// et de remettre "site: 'https://www.poelesgodin.fr'"
const isPreviewOnGitHubPages = process.env.PUBLIC_USE_BASE_PATH === '1';

export default defineConfig({
  site: isPreviewOnGitHubPages
    ? 'https://balboter.github.io'
    : 'https://www.poelesgodin.fr',
  base: isPreviewOnGitHubPages ? '/poelesgodin-refonte' : undefined,
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
