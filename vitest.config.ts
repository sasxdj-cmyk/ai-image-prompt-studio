import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // the engine tests run in node, the component tests opt into jsdom
    // with a `@vitest-environment jsdom` docblock
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    reporters: ['default'],
  },
});
