import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  build: {
    assetsDir: 'misaka-assets',
  },
  plugins: [vue()],
});
