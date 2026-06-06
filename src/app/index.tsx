import { TasksScreen } from '@/features/tasks';

/**
 * Routes stay THIN. A route file only wires a URL to a feature's screen —
 * business logic, state and UI live in src/features/.
 * See docs/architecture/module-boundaries.md
 */
export default function HomeRoute() {
  return <TasksScreen />;
}
