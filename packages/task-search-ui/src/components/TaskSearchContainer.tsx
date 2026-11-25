/**
 * Task Search Container - Main component integrating all search functionality
 * Wires TaskSearchInput, TaskFilterEngine, and TaskListDisplay together
 */

import React, { useEffect } from 'react';
import { Task } from './TaskFilterEngine';
import TaskSearchInput from './TaskSearchInput';
import TaskListDisplay from './TaskListDisplay';
import { useTaskListStateManager } from '../hooks/useTaskListStateManager';

export interface TaskSearchContainerProps {
  /**
   * Initial list of tasks to search within
   */
  tasks: Task[];

  /**
   * Message shown when no tasks match search
   */
  emptyMessage?: string;

  /**
   * Callback when task is selected
   */
  onTaskSelect?: (task: Task) => void;

  /**
   * Debounce delay for search input (ms)
   */
  debounceDelay?: number;

  /**
   * CSS class name for styling
   */
  className?: string;

  /**
   * Search input placeholder text
   */
  searchPlaceholder?: string;

  /**
   * Search input label
   */
  searchLabel?: string;

  /**
   * Whether to show task descriptions
   */
  showDescription?: boolean;
}

/**
 * TaskSearchContainer Component
 * 
 * Complete task search implementation with input, filtering, and display
 * 
 * @example
 * <TaskSearchContainer
 *   tasks={allTasks}
 *   onTaskSelect={(task) => console.log('Selected:', task)}
 *   debounceDelay={300}
 * />
 */
export const TaskSearchContainer: React.FC<TaskSearchContainerProps> = ({
  tasks,
  emptyMessage = 'No tasks found',
  onTaskSelect,
  debounceDelay = 300,
  className = '',
  searchPlaceholder = 'Search tasks...',
  searchLabel = 'task search field',
  showDescription = true,
}) => {
  // Initialize state manager with tasks
  const { state, updateQuery, setOriginalTasks, clearSearch } =
    useTaskListStateManager(tasks);

  // Update original tasks when props change
  useEffect(() => {
    setOriginalTasks(tasks);
  }, [tasks, setOriginalTasks]);

  /**
   * Handle filter changes from search input
   */
  const handleFilterChange = (query: string) => {
    updateQuery(query);
  };

  /**
   * Handle clear search
   */
  const handleClear = () => {
    clearSearch();
  };

  /**
   * Handle task selection
   */
  const handleTaskClick = (task: Task) => {
    onTaskSelect?.(task);
  };

  return (
    <div className={`task-search-container ${className}`.trim()}>
      <TaskSearchInput
        onFilterChange={handleFilterChange}
        onClear={handleClear}
        debounceDelay={debounceDelay}
        placeholder={searchPlaceholder}
        label={searchLabel}
      />
      <TaskListDisplay
        tasks={state.filteredTasks}
        emptyMessage={emptyMessage}
        onTaskClick={handleTaskClick}
        showDescription={showDescription}
      />
    </div>
  );
};

export default TaskSearchContainer;
