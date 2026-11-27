/**
 * Task Filter Engine - Pure function for filtering tasks
 * Performs case-insensitive substring matching on task titles
 */

export interface Task {
  id: string;
  title: string;
  description?: string;
  [key: string]: any;
}

/**
 * Filters a list of tasks based on a search query.
 * Performs case-insensitive substring matching on task titles.
 * 
 * @param tasks - Array of task objects
 * @param query - Search query string
 * @returns Filtered array of tasks matching the query
 * 
 * @example
 * const tasks = [
 *   { id: '1', title: 'Book flights', description: 'Travel' },
 *   { id: '2', title: 'Write quarterly report', description: 'Work' }
 * ];
 * const result = filterTasks(tasks, 'book');
 * // Returns: [{ id: '1', title: 'Book flights', ... }]
 */
export function filterTasks(tasks: Task[], query: string): Task[] {
  // Handle empty or null query - return all tasks (always create new array)
  if (!query || query.trim() === '') {
    return [...tasks];
  }

  // Convert query to lowercase for case-insensitive comparison
  const lowerQuery = query.toLowerCase();

  // Filter tasks by checking if title contains the query (case-insensitive)
  return tasks.filter(task => 
    task.title.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Checks if a single task matches a search query
 * 
 * @param task - Task object
 * @param query - Search query string
 * @returns True if task title contains the query (case-insensitive)
 */
export function matchesQuery(task: Task, query: string): boolean {
  if (!query || query.trim() === '') {
    return true;
  }
  return task.title.toLowerCase().includes(query.toLowerCase());
}

export default filterTasks;
