import { CreateExampleSchema, ExampleSchema, type Example } from '../../src/model/schema';

/**
 * Dependency-light dev mock for the API backbone. No MSW — just a typed async
 * handler map keyed by `'METHOD /path'`. Wire it behind the backend-api preset's
 * fetch in dev so the client works BEFORE the real API exists. Fixtures are
 * shaped (and re-validated) by the shared Zod model, so a drift in the contract
 * surfaces here too. Delete once the real endpoints land.
 */
let store: Example[] = [
  ExampleSchema.parse({
    id: 'ex_1',
    owner_id: 'dev-user',
    title: 'First example',
    done: false,
    created_at: new Date().toISOString(),
  }),
];

export type MockRequest = { body?: unknown };

export const mockHandlers = {
  'GET /examples': async (): Promise<Example[]> => {
    return store;
  },
  'POST /examples': async (req: MockRequest): Promise<Example> => {
    const input = CreateExampleSchema.parse(req.body);
    const created = ExampleSchema.parse({
      id: `ex_${store.length + 1}`,
      owner_id: 'dev-user', // server-stamped in prod; fixed in the mock.
      title: input.title.trim(),
      done: input.done ?? false,
      created_at: new Date().toISOString(),
    });
    store = [created, ...store];
    return created;
  },
} satisfies Record<string, (req: MockRequest) => Promise<unknown>>;

export type MockHandlers = typeof mockHandlers;

/** Reset fixtures between dev sessions / tests. */
export function resetMock(): void {
  store = [];
}
