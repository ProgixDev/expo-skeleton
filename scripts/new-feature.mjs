#!/usr/bin/env node
/**
 * Scaffold a new feature slice that matches the architecture:
 *   npm run new:feature -- checkout
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2]?.toLowerCase().replace(/[^a-z0-9-]/g, '');
if (!name) {
  console.error('Usage: npm run new:feature -- <kebab-case-name>');
  process.exit(1);
}

const pascal = name
  .split('-')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('');

const base = join(process.cwd(), 'src', 'features', name);
if (existsSync(base)) {
  console.error(`Feature "${name}" already exists.`);
  process.exit(1);
}

const camel = name
  .split('-')
  .map((part, i) => (i === 0 ? part : part[0].toUpperCase() + part.slice(1)))
  .join('');

for (const dir of ['ui', 'model', 'api', 'lib', '__tests__']) {
  mkdirSync(join(base, dir), { recursive: true });
}

writeFileSync(
  join(base, 'index.ts'),
  `/**
 * PUBLIC API of the ${name} feature. Keep it minimal.
 */
export { ${pascal}Screen } from './ui/${name}-screen';
export { use${pascal}, ${camel}Keys } from './model/use-${name}';
`,
);

// Zod schema — the contract for everything entering the feature (network/storage).
writeFileSync(
  join(base, 'model', 'schema.ts'),
  `import { z } from 'zod';

/** Validate at the edge: parse server/storage payloads through this. */
export const ${pascal}Schema = z.object({
  id: z.string(),
});

export type ${pascal} = z.infer<typeof ${pascal}Schema>;
`,
);

// Data layer — talks to the backbone ONLY through the seam (@/shared/lib/backend),
// never the SDK. Swap Supabase ↔ custom API by swapping the seam, not this file.
writeFileSync(
  join(base, 'api', `${name}-api.ts`),
  `import { backend } from '@/shared/lib/backend';

import { ${pascal}Schema, type ${pascal} } from '../model/schema';

export const ${camel}Api = {
  async list(): Promise<${pascal}[]> {
    const { data, error } = await backend.db.from('${name.replace(/-/g, '_')}').select('*');
    if (error) throw error;
    return ${pascal}Schema.array().parse(data ?? []);
  },
};
`,
);

// React Query hook + key factory (the repo convention — see
// src/shared/lib/query/query-keys.md). Keys are hierarchical so invalidation is cheap.
writeFileSync(
  join(base, 'model', `use-${name}.ts`),
  `import { useQuery } from '@tanstack/react-query';

import { ${camel}Api } from '../api/${name}-api';

export const ${camel}Keys = {
  all: ['${name}'] as const,
  list: () => [...${camel}Keys.all, 'list'] as const,
  detail: (id: string) => [...${camel}Keys.all, 'detail', id] as const,
};

export function use${pascal}() {
  return useQuery({
    queryKey: ${camel}Keys.list(),
    queryFn: () => ${camel}Api.list(),
  });
}
`,
);

writeFileSync(
  join(base, 'ui', `${name}-screen.tsx`),
  `import { AppText, Screen } from '@/shared/ui';

export function ${pascal}Screen() {
  return (
    <Screen testID="${name}-screen">
      <AppText variant="display">${pascal}</AppText>
    </Screen>
  );
}
`,
);

writeFileSync(
  join(base, '__tests__', `${name}-screen.test.tsx`),
  `import { render, screen } from '@/shared/testing/render';

import { ${pascal}Screen } from '../ui/${name}-screen';

describe('<${pascal}Screen />', () => {
  it('renders', () => {
    render(<${pascal}Screen />);
    expect(screen.getByTestId('${name}-screen')).toBeOnTheScreen();
  });
});
`,
);

console.log(`✓ Created src/features/${name} (ui · model/schema+hook · api)
Next steps:
  1. Add a route in src/app/ that renders ${pascal}Screen
  2. Point ${camel}Api at your data: a Supabase table (backbone=supabase) or an
     endpoint contract (backbone=api — write server/api/openapi.yaml, run npm run api:gen)
  3. Write the PRD: docs/product/prds/ (copy _template.md)
  4. Add a Maestro flow when the CUJ stabilizes: .maestro/flows/
`);
