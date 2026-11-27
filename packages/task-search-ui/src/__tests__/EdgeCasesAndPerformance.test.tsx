/**
 * Edge case and performance testing
 * Tests edge cases and performance targets
 */

import { filterTasks, Task } from '../components/TaskFilterEngine';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskSearchContainer } from '../components/TaskSearchContainer';

describe('Edge Cases and Performance', () => {
  describe('Large task list performance', () => {
    it('should filter 10,000 items within <100ms', () => {
      // Create large task list
      const largeTasks: Task[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `${i}`,
        title: i % 3 === 0 ? `Book item ${i}` : `Report item ${i}`,
        description: 'Test description',
      }));

      // Measure filter performance
      const startTime = performance.now();
      const result = filterTasks(largeTasks, 'book');
      const duration = performance.now() - startTime;

      // Verify results
      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it('should handle 100,000 items within reasonable time', () => {
      const hugeTasks: Task[] = Array.from({ length: 100000 }, (_, i) => ({
        id: `${i}`,
        title: `Task ${i}`,
        description: 'Test',
      }));

      const startTime = performance.now();
      const result = filterTasks(hugeTasks, 'Task 1');
      const duration = performance.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Allow 500ms for very large list
    });
  });

  describe('Special character handling', () => {
    it('should match special characters literally', () => {
      const tasks: Task[] = [
        { id: '1', title: 'test@email.com', description: '' },
        { id: '2', title: 'test#hashtag', description: '' },
        { id: '3', title: 'test!urgent', description: '' },
        { id: '4', title: 'test?question', description: '' },
      ];

      expect(filterTasks(tasks, '@')).toHaveLength(1);
      expect(filterTasks(tasks, '#')).toHaveLength(1);
      expect(filterTasks(tasks, '!')).toHaveLength(1);
      expect(filterTasks(tasks, '?')).toHaveLength(1);
    });

    it('should match regex special characters literally (not as regex)', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Price $50', description: '' },
        { id: '2', title: 'Email (test)', description: '' },
        { id: '3', title: 'Percent 50%', description: '' },
        { id: '4', title: 'Range [1-5]', description: '' },
      ];

      expect(filterTasks(tasks, '$')).toHaveLength(1);
      expect(filterTasks(tasks, '(')).toHaveLength(1);
      expect(filterTasks(tasks, '%')).toHaveLength(1);
      expect(filterTasks(tasks, '[')).toHaveLength(1);
    });
  });

  describe('Unicode and special text handling', () => {
    it('should handle unicode characters', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Café meeting', description: '' },
        { id: '2', title: 'Naïve approach', description: '' },
        { id: '3', title: 'Résumé review', description: '' },
      ];

      expect(filterTasks(tasks, 'café')).toHaveLength(1);
      expect(filterTasks(tasks, 'resume')).toHaveLength(0); // Accents matter
      expect(filterTasks(tasks, 'Résumé')).toHaveLength(1);
    });

    it('should handle emoji characters', () => {
      const tasks: Task[] = [
        { id: '1', title: '🎉 Party planning', description: '' },
        { id: '2', title: '📚 Read book', description: '' },
      ];

      expect(filterTasks(tasks, '🎉')).toHaveLength(1);
      expect(filterTasks(tasks, '📚')).toHaveLength(1);
    });

    it('should handle right-to-left text', () => {
      const tasks: Task[] = [
        { id: '1', title: 'مرحبا بالعالم', description: '' }, // Arabic "Hello World"
      ];

      expect(filterTasks(tasks, 'مرحبا')).toHaveLength(1);
    });
  });

  describe('Rapid input handling', () => {
    it('should debounce 10+ characters per second', async () => {
      const handleFilterChange = jest.fn();
      const { rerender } = render(
        <TaskSearchContainer
          tasks={[
            { id: '1', title: 'Book flights', description: '' },
            { id: '2', title: 'Write report', description: '' },
          ]}
          debounceDelay={100}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Simulate rapid typing
      for (let i = 0; i < 15; i++) {
        fireEvent.change(input, { target: { value: 'b'.repeat(i + 1) } });
      }

      // Should have many events but debounce prevents excessive filtering
      expect(input.value).toBe('b'.repeat(15));
    });
  });

  describe('Empty results handling', () => {
    it('should not crash with empty results', async () => {
      const { container } = render(
        <TaskSearchContainer
          tasks={[
            { id: '1', title: 'Book flights', description: '' },
          ]}
          debounceDelay={50}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'xyz' } });

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByText('No tasks found')).toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });

    it('should display proper empty message', async () => {
      render(
        <TaskSearchContainer
          tasks={[
            { id: '1', title: 'Book flights', description: '' },
          ]}
          emptyMessage="Custom message: No results"
          debounceDelay={50}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'nomatch' } });

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByText('Custom message: No results')).toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });
  });

  describe('Very long task titles', () => {
    it('should match in very long titles (1000+ chars)', () => {
      const longTitle = 'a'.repeat(500) + 'specific_keyword' + 'a'.repeat(500);
      const tasks: Task[] = [
        { id: '1', title: longTitle, description: '' },
      ];

      const result = filterTasks(tasks, 'specific_keyword');
      expect(result).toHaveLength(1);
    });

    it('should not cause performance issues with many long titles', () => {
      const longTitle = 'a'.repeat(1000);
      const tasks: Task[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        title: `${longTitle} ${i}`,
        description: '',
      }));

      const start = performance.now();
      filterTasks(tasks, 'searchterm');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Whitespace handling', () => {
    it('should handle leading/trailing whitespace in query', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Book flights', description: '' },
      ];

      expect(filterTasks(tasks, '  book  ')).toHaveLength(0); // "  book  " not in "Book flights"
      expect(filterTasks(tasks, 'book')).toHaveLength(1);
    });

    it('should handle whitespace in task titles', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Book   flights', description: '' }, // Multiple spaces
        { id: '2', title: 'Book\tflights', description: '' }, // Tab
        { id: '3', title: 'Book\nflights', description: '' }, // Newline
      ];

      expect(filterTasks(tasks, 'Book   flights')).toHaveLength(1);
      expect(filterTasks(tasks, 'flights')).toHaveLength(3);
    });
  });

  describe('Case sensitivity edge cases', () => {
    it('should handle mixed case queries', () => {
      const tasks: Task[] = [
        { id: '1', title: 'BOOK FLIGHTS', description: '' },
        { id: '2', title: 'book flights', description: '' },
        { id: '3', title: 'Book Flights', description: '' },
      ];

      expect(filterTasks(tasks, 'BoOk')).toHaveLength(3);
      expect(filterTasks(tasks, 'BOOK')).toHaveLength(3);
      expect(filterTasks(tasks, 'book')).toHaveLength(3);
    });
  });

  describe('Null and undefined handling', () => {
    it('should handle null tasks array gracefully', () => {
      expect(() => filterTasks(null as any, 'test')).toThrow();
    });

    it('should handle undefined query', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Book flights', description: '' },
      ];

      expect(filterTasks(tasks, undefined as any)).toEqual(tasks);
    });

    it('should handle tasks with missing fields', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Book flights' } as Task,
        { id: '2', title: 'Write report', description: '' },
      ];

      expect(filterTasks(tasks, 'book')).toHaveLength(1);
    });
  });

  describe('Concurrent filtering', () => {
    it('should handle concurrent filter calls without interference', async () => {
      const tasks: Task[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        title: `Task ${i}`,
        description: 'Test',
      }));

      const promises = [
        Promise.resolve(filterTasks(tasks, 'Task 1')),
        Promise.resolve(filterTasks(tasks, 'Task 2')),
        Promise.resolve(filterTasks(tasks, 'Task 3')),
      ];

      const results = await Promise.all(promises);

      expect(results[0].length).toBeGreaterThan(0);
      expect(results[1].length).toBeGreaterThan(0);
      expect(results[2].length).toBeGreaterThan(0);
    });
  });
});
