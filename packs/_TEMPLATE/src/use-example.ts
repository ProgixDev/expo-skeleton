import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createExample, listExamples } from './data/example-repo';
import { type CreateExample } from './model/schema';

/** Key factory — every cache key for this feature derives from here. */
export const exampleKeys = {
  all: ['example'] as const,
  list: () => [...exampleKeys.all, 'list'] as const,
  detail: (id: string) => [...exampleKeys.all, 'detail', id] as const,
};

/** List the current user's examples (server-scoped). */
export function useExamples() {
  return useQuery({
    queryKey: exampleKeys.list(),
    queryFn: async () => {
      const r = await listExamples();
      if (!r.ok) throw new Error(r.error);
      return r.value;
    },
  });
}

/** Create an example, then invalidate the list so it refetches. */
export function useCreateExample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExample) => {
      const r = await createExample(input);
      if (!r.ok) throw new Error(r.error);
      return r.value;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: exampleKeys.list() }),
  });
}
