/**
 * Task List State Manager - React hook for managing task filtering state
 * Maintains both original and filtered task lists
 */

import { useState, useCallback, useRef } from 'react';
import { Task, filterTasks } from '../components/TaskFilterEngine';

export interface TaskListState {
  originalTasks: Task[];
  filteredTasks: Task[];
  currentQuery: string;
}

export interface UseTaskListStateManagerReturn {
  state: TaskListState;
  updateQuery: (query: string) => void;
  setOriginalTasks: (tasks: Task[]) => void;
  clearSearch: () => void;
}

/**
 * Hook for managing task list state with filtering
 * 
 * @param initialTasks - Initial task list (default: empty array)
 * @returns Object containing state and update methods
 * 
 * @example
 * const { state, updateQuery, setOriginalTasks } = useTaskListStateManager(tasks);
 * 
 * // Listen for updates
 * useEffect(() => {
 *   console.log('Filtered tasks:', state.filteredTasks);
 * }, [state.filteredTasks]);
 * 
 * // Update search query
 * updateQuery('book');
 */
export function useTaskListStateManager(
  initialTasks: Task[] = []
): UseTaskListStateManagerReturn {
  // State for original tasks (never mutated)
  const originalTasksRef = useRef<Task[]>(initialTasks);
  
  // State for filtering
  const [state, setState] = useState<TaskListState>({
    originalTasks: initialTasks,
    filteredTasks: initialTasks,
    currentQuery: '',
  });

  /**
   * Update the search query and re-filter tasks
   */
  const updateQuery = useCallback((query: string) => {
    setState(prevState => ({
      ...prevState,
      currentQuery: query,
      filteredTasks: filterTasks(prevState.originalTasks, query),
    }));
  }, []);

  /**
   * Set a new original task list and reset filtering
   */
  const setOriginalTasks = useCallback((tasks: Task[]) => {
    originalTasksRef.current = tasks;
    setState({
      originalTasks: tasks,
      filteredTasks: filterTasks(tasks, ''),
      currentQuery: '',
    });
  }, []);

  /**
   * Clear the search query and restore all tasks
   */
  const clearSearch = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      currentQuery: '',
      filteredTasks: prevState.originalTasks,
    }));
  }, []);

  return {
    state,
    updateQuery,
    setOriginalTasks,
    clearSearch,
  };
}

export default useTaskListStateManager;
