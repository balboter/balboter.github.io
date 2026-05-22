// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Preview phase : sert à la racine de https://balboter.github.io/
// Quand on bascule sur poelesgodin.fr (mise en prod), changer "site" et c'est tout.
export default defineConfig({
  site: 'https://balboter.github.io',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/mentions-legales') &&
        !page.includes('/politique-de-confidentialite'),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
});
