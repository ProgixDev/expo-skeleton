/** Public API of the example feature (the barrel). */
export { ExampleScreen } from './ui/example-screen';
export { useExamples, useCreateExample, exampleKeys } from './use-example';
export { listExamples, createExample } from './data/example-repo';
export {
  ExampleSchema,
  CreateExampleSchema,
  parseExample,
  type Example,
  type CreateExample,
} from './model/schema';
