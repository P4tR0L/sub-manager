import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  env: {
    schema: {
      APP_PASSWORD: envField.string({ context: 'server', access: 'secret' }),
      APP_SESSION_SECRET: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
