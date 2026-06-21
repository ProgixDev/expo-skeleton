/**
 * orval — generates a typed React Query client from a pack's OpenAPI contract.
 *
 * Usage (API backbone only): after copying a pack into `src/features/<name>/`,
 * point `input` at the pack's spec and `output.target` at the feature, then run:
 *
 *   npx orval --config orval.config.ts
 *
 * `orval` (the devDependency) and the `api:gen` package.json script are added by
 * another stream — this file is the config they consume. The paths below are a
 * TEMPLATE for the `example` feature; ADJUST `input` + `target` per pack (one
 * `Config` entry per feature you generate).
 */
import { defineConfig } from 'orval';

export default defineConfig({
  // One entry per feature. Adjusted per pack — copy this block, rename the key,
  // and repoint the paths at the feature you just installed.
  example: {
    // The contract shipped in the pack's server half (mirrors model/schema.ts).
    input: {
      target: './src/features/example/server/api/openapi.yaml',
    },
    output: {
      // react-query client mode → typed hooks the feature consumes.
      client: 'react-query',
      // Split by OpenAPI tag → one file per resource group, re-exported.
      mode: 'tags-split',
      // Per-feature destination. Generated code is overwritten on each run —
      // never hand-edit `generated.ts`; change the spec and re-generate.
      target: './src/features/example/api/generated.ts',
      // Re-validate responses against the contract at runtime via Zod, so the
      // generated client stays honest about the wire (never trust the wire).
      clean: true,
    },
  },
});
