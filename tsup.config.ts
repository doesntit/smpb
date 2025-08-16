import { defineConfig } from 'tsup';
// import '@types/node';
import fs from 'fs/promises';
import path from 'path';
import pkg from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'cli',
  format: ['esm'],
  splitting: false,
  sourcemap: false,
  treeshake: true,
  clean: true,
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {})
  ],
  onSuccess: async function() {
    console.log(__dirname, 'dirname');

    const src = path.resolve(__dirname, 'templates');
    const dist = path.resolve(__dirname, 'cli/templates');
    await fs.mkdir(dist, { recursive: true });
    await fs.cp(src, dist, { recursive: true });
  },
});
