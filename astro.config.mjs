// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.poelesgodin.fr',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
