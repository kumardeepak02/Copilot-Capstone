/**
 * Task Search UI - Public API
 * Exports all public components, hooks, and utilities
 */

// Components
export { TaskSearchInput, type TaskSearchInputProps } from './components/TaskSearchInput';
export { TaskListDisplay, type TaskListDisplayProps } from './components/TaskListDisplay';
export { default as TaskSearchContainer, type TaskSearchContainerProps } from './components/TaskSearchContainer';
export { filterTasks, matchesQuery, type Task } from './components/TaskFilterEngine';

// Hooks
export { useDebouncedCallback, useDebouncedValue } from './hooks/useInputDebouncer';
export {
  useTaskListStateManager,
  type TaskListState,
  type UseTaskListStateManagerReturn,
} from './hooks/useTaskListStateManager';

// Re-export default
export { default } from './components/TaskSearchContainer';
