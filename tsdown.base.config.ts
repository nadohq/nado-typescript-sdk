import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    format: ['cjs', 'esm'],
    target: 'esnext',
    outDir: 'dist',
    dts: true,
    sourcemap: true,
    clean: true,
    fixedExtension: false,
    copy: [{ from: './src/**/*.json', to: './dist', flatten: false }],
  },
]);
