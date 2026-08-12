import { defineConfig } from 'tsup';

// Builds the `@luvikung/three-next` package from the app's internal library
// at `src/lib/three-next`. Resolved relative to the repo root, since that's
// the cwd every build/release script invokes tsup from.
export default defineConfig({
  entry: { index: 'src/lib/three-next/index.tsx' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'tools/package/dist',
  tsconfig: 'tools/package/tsconfig.json',
  external: ['react', 'react-dom', 'three'],
  // tsup's default extensions are .mjs (esm) / .js (cjs) when both formats
  // are built together; align them with the `main`/`module`/`exports` fields
  // declared in tools/package/package.json instead.
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
  // `src/lib/three-next` is consumed by a Next.js app, so its source files
  // carry per-file 'use client' directives. Those get bundled away as inert
  // string statements; this banner puts the one directive that actually
  // matters back at the literal top of each emitted file, where React
  // Server Components tooling looks for it.
  banner: { js: "'use client';" },
});
