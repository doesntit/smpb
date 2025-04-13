import { defineConfig } from 'tsup';
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
});
