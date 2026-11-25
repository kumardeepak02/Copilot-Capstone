/**
 * Task List Display - React component for rendering filtered task list
 * Displays tasks or empty state message
 */

import React from 'react';
import { Task } from '../components/TaskFilterEngine';

export interface TaskListDisplayProps {
  /**
   * Array of tasks to display
   */
  tasks: Task[];

  /**
   * Message to show when no tasks match the search
   */
  emptyMessage?: string;

  /**
   * Callback fired when a task is clicked
   */
  onTaskClick?: (task: Task) => void;

  /**
   * CSS class name for styling
   */
  className?: string;

  /**
   * Whether to show task descriptions
   */
  showDescription?: boolean;

  /**
   * Custom renderer for task items
   */
  renderTaskItem?: (task: Task, index: number) => React.ReactNode;
}

/**
 * TaskListDisplay Component
 * 
 * @example
 * <TaskListDisplay
 *   tasks={filteredTasks}
 *   onTaskClick={(task) => console.log('Selected:', task)}
 *   showDescription={true}
 * />
 */
export const TaskListDisplay: React.FC<TaskListDisplayProps> = ({
  tasks,
  emptyMessage = 'No tasks found',
  onTaskClick,
  className = '',
  showDescription = true,
  renderTaskItem,
}) => {
  /**
   * Render empty state
   */
  if (tasks.length === 0) {
    return (
      <div className={`task-list-empty ${className}`.trim()}>
        <p className="task-list-empty-message">{emptyMessage}</p>
      </div>
    );
  }

  /**
   * Render default task item
   */
  const defaultRenderTaskItem = (task: Task, index: number) => (
    <div
      key={task.id || index}
      className="task-item"
      onClick={() => onTaskClick?.(task)}
      role="option"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onTaskClick?.(task);
        }
      }}
    >
      <div className="task-item-header">
        <h3 className="task-item-title">{task.title}</h3>
      </div>
      {showDescription && task.description && (
        <p className="task-item-description">{task.description}</p>
      )}
    </div>
  );

  return (
    <div
      className={`task-list-display ${className}`.trim()}
      role="listbox"
      aria-label="Task list"
    >
      <ul className="task-list">
        {tasks.map((task, index) => (
          <li key={task.id || index} className="task-list-item">
            {renderTaskItem
              ? renderTaskItem(task, index)
              : defaultRenderTaskItem(task, index)}
          </li>
        ))}
      </ul>
      <div className="task-list-info" aria-live="polite" aria-atomic="true">
        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} found
      </div>
    </div>
  );
};

export default TaskListDisplay;
