import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    solidPlugin(),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/static/*',
          dest: 'assets'
        }
      ]
    })
  ],
  server: {
    port: 3456
  },
  build: {
    target: 'esnext'
  }
});
