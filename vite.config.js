import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

export default defineConfig(({command,isPreview}) => ({
  base: command === 'serve' && !isPreview ? '/' : '/blob/',
  build: {
    rollupOptions: {
      input: {
        viewer: fileURLToPath(new URL('./index.html',import.meta.url)),
        playground: fileURLToPath(new URL('./playground.html',import.meta.url)),
      },
    },
  },
}));
