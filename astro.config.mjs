import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

const timingPlugin = () => ({
  name: 'dev-transform-timing',
  apply: 'serve',
  async transform(code, id) {
    const start = Date.now();
    const result = null;
    const duration = Date.now() - start;
    if (duration > 100) {
      console.log(`[vite] transform ${id} ${duration}ms`);
    }
    return result;
  },
});

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://blog.catcat.work',
  integrations: [tailwind()],
  vite: {
    plugins: [timingPlugin()],
  },
});
