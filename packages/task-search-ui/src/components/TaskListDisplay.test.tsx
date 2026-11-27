/**
 * Unit tests for TaskListDisplay component
 * Tests display component (mocked task list)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskListDisplay } from '../components/TaskListDisplay';
import { Task } from '../components/TaskFilterEngine';

describe('TaskListDisplay', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Book flights',
      description: 'Travel to conference',
    },
    {
      id: '2',
      title: 'Write quarterly report',
      description: 'Q4 2026 report',
    },
  ];

  it('should render list of tasks', () => {
    render(<TaskListDisplay tasks={mockTasks} />);

    expect(screen.getByText('Book flights')).toBeInTheDocument();
    expect(screen.getByText('Write quarterly report')).toBeInTheDocument();
  });

  it('should render each task item with title and description', () => {
    render(<TaskListDisplay tasks={mockTasks} />);

    expect(screen.getByText('Book flights')).toBeInTheDocument();
    expect(screen.getByText('Travel to conference')).toBeInTheDocument();
    expect(screen.getByText('Write quarterly report')).toBeInTheDocument();
    expect(screen.getByText('Q4 2026 report')).toBeInTheDocument();
  });

  it('should show empty message when task list is empty', () => {
    render(<TaskListDisplay tasks={[]} />);

    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });

  it('should use custom empty message', () => {
    render(
      <TaskListDisplay
        tasks={[]}
        emptyMessage="Custom empty message"
      />
    );

    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('should show task count', () => {
    render(<TaskListDisplay tasks={mockTasks} />);

    expect(screen.getByText('2 tasks found')).toBeInTheDocument();
  });

  it('should show singular "task" for single item', () => {
    render(<TaskListDisplay tasks={[mockTasks[0]]} />);

    expect(screen.getByText('1 task found')).toBeInTheDocument();
  });

  it('should hide description when showDescription is false', () => {
    render(<TaskListDisplay tasks={mockTasks} showDescription={false} />);

    expect(screen.getByText('Book flights')).toBeInTheDocument();
    expect(screen.queryByText('Travel to conference')).not.toBeInTheDocument();
  });

  it('should call onTaskClick when task item is clicked', () => {
    const handleTaskClick = jest.fn();
    render(
      <TaskListDisplay
        tasks={mockTasks}
        onTaskClick={handleTaskClick}
      />
    );

    const firstTask = screen.getByText('Book flights').closest('.task-item');
    fireEvent.click(firstTask!);

    expect(handleTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('should call onTaskClick when task is activated with keyboard', () => {
    const handleTaskClick = jest.fn();
    render(
      <TaskListDisplay
        tasks={mockTasks}
        onTaskClick={handleTaskClick}
      />
    );

    const firstTask = screen.getByText('Book flights').closest('.task-item');
    fireEvent.keyPress(firstTask!, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(handleTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('should accept custom className', () => {
    const { container } = render(
      <TaskListDisplay
        tasks={mockTasks}
        className="custom-class"
      />
    );

    expect(container.querySelector('.task-list-display')).toHaveClass('custom-class');
  });

  it('should use custom renderer for task items', () => {
    const customRenderer = (task: Task) => (
      <div key={task.id} data-testid={`custom-${task.id}`}>
        {task.title.toUpperCase()}
      </div>
    );

    render(
      <TaskListDisplay
        tasks={mockTasks}
        renderTaskItem={customRenderer}
      />
    );

    expect(screen.getByTestId('custom-1')).toHaveTextContent('BOOK FLIGHTS');
    expect(screen.getByTestId('custom-2')).toHaveTextContent('WRITE QUARTERLY REPORT');
  });

  it('should have accessible role attributes', () => {
    render(<TaskListDisplay tasks={mockTasks} />);

    const listbox = screen.getByRole('listbox', { name: 'Task list' });
    expect(listbox).toBeInTheDocument();
  });

  it('should handle empty task list gracefully', () => {
    const { container } = render(<TaskListDisplay tasks={[]} />);

    expect(screen.getByText('No tasks found')).toBeInTheDocument();
    expect(container.querySelector('.task-list')).not.toBeInTheDocument();
  });

  it('should handle tasks without description', () => {
    const tasksNoDesc: Task[] = [
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2', description: 'Has description' },
    ];

    render(<TaskListDisplay tasks={tasksNoDesc} />);

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Has description')).toBeInTheDocument();
  });

  it('should use task id as key when available', () => {
    const { container } = render(<TaskListDisplay tasks={mockTasks} />);

    // Check that list items exist
    const listItems = container.querySelectorAll('.task-list-item');
    expect(listItems).toHaveLength(2);
  });

  it('should have live region for task count announcements', () => {
    render(<TaskListDisplay tasks={mockTasks} />);

    const liveRegion = screen.getByText('2 tasks found');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });
});
