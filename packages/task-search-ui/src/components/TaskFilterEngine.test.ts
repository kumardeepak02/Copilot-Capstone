/**
 * Unit tests for TaskFilterEngine
 * Tests pure filter function exhaustively
 */

import { filterTasks, matchesQuery, Task } from '../components/TaskFilterEngine';

describe('TaskFilterEngine', () => {
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
    {
      id: '3',
      title: 'Pay invoices',
      description: 'Monthly invoices',
    },
  ];

  describe('filterTasks', () => {
    it('should return all tasks when query is empty', () => {
      const result = filterTasks(mockTasks, '');
      expect(result).toEqual(mockTasks);
      expect(result.length).toBe(3);
    });

    it('should return all tasks when query is null/undefined', () => {
      expect(filterTasks(mockTasks, null as any)).toEqual(mockTasks);
      expect(filterTasks(mockTasks, undefined as any)).toEqual(mockTasks);
    });

    it('should return all tasks when query is only whitespace', () => {
      const result = filterTasks(mockTasks, '   ');
      expect(result).toEqual(mockTasks);
    });

    it('should match "book" case-insensitively to "Book flights"', () => {
      const result = filterTasks(mockTasks, 'book');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Book flights');
    });

    it('should match substring anywhere in title', () => {
      const result = filterTasks(mockTasks, 'report');
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('report');
    });

    it('should not match unrelated substrings', () => {
      const result = filterTasks(mockTasks, 'xyz');
      expect(result).toHaveLength(0);
    });

    it('should match special characters literally', () => {
      const tasksWithSpecial: Task[] = [
        { id: '1', title: 'test@email.com', description: '' },
        { id: '2', title: 'regular task', description: '' },
      ];
      const result = filterTasks(tasksWithSpecial, '@');
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('@');
    });

    it('should handle empty task list', () => {
      const result = filterTasks([], 'query');
      expect(result).toEqual([]);
    });

    it('should handle large task list (1000 items) efficiently', () => {
      const largeTasks: Task[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        title: i % 2 === 0 ? 'Book item' : 'Report item',
        description: '',
      }));

      const start = performance.now();
      const result = filterTasks(largeTasks, 'book');
      const duration = performance.now() - start;

      expect(result).toHaveLength(500);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should not mutate original task list', () => {
      const tasksCopy = JSON.parse(JSON.stringify(mockTasks));
      filterTasks(mockTasks, 'book');
      expect(mockTasks).toEqual(tasksCopy);
    });

    it('should return new array instance', () => {
      const result = filterTasks(mockTasks, '');
      expect(result).not.toBe(mockTasks);
      expect(result).toEqual(mockTasks);
    });

    it('should handle very long task titles', () => {
      const longTitle = 'a'.repeat(1000);
      const tasksWithLong: Task[] = [
        { id: '1', title: longTitle, description: '' },
      ];
      const result = filterTasks(tasksWithLong, 'aaaa');
      expect(result).toHaveLength(1);
    });
  });

  describe('matchesQuery', () => {
    it('should return true when query is empty', () => {
      const result = matchesQuery(mockTasks[0], '');
      expect(result).toBe(true);
    });

    it('should return true when task title contains query', () => {
      const result = matchesQuery(mockTasks[0], 'book');
      expect(result).toBe(true);
    });

    it('should return false when task title does not contain query', () => {
      const result = matchesQuery(mockTasks[0], 'xyz');
      expect(result).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(matchesQuery(mockTasks[0], 'BOOK')).toBe(true);
      expect(matchesQuery(mockTasks[0], 'BoOk')).toBe(true);
    });
  });
});
