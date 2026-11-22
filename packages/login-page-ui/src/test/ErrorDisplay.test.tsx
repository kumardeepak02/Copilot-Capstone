/**
 * EPMCDMETST-71978: Error Display Component Tests
 * 
 * Unit tests for ErrorDisplay component
 * Tests: error rendering, multiple errors, accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from '../ErrorDisplay';

describe('ErrorDisplay Component', () => {
  describe('Rendering', () => {
    it('should render error messages', () => {
      render(
        <ErrorDisplay
          errors={['Invalid email format', 'Password too short']}
          visible={true}
        />
      );

      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      expect(screen.getByText('Password too short')).toBeInTheDocument();
    });

    it('should not render when visible is false', () => {
      const { container } = render(
        <ErrorDisplay
          errors={['Error message']}
          visible={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when errors array is empty', () => {
      const { container } = render(
        <ErrorDisplay errors={[]} visible={true} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Multiple Errors', () => {
    it('should display multiple error messages simultaneously', () => {
      const errors = [
        'Invalid email format',
        'Password too short',
        'Form submission failed',
      ];

      render(<ErrorDisplay errors={errors} visible={true} />);

      errors.forEach((error) => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when dismiss button is clicked', () => {
      const mockDismiss = jest.fn();

      render(
        <ErrorDisplay
          errors={['Error message']}
          visible={true}
          onDismiss={mockDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', {
        name: /dismiss/i,
      });
      fireEvent.click(dismissButton);

      expect(mockDismiss).toHaveBeenCalled();
    });

    it('should not show dismiss button when onDismiss is not provided', () => {
      render(
        <ErrorDisplay errors={['Error message']} visible={true} />
      );

      const dismissButton = screen.queryByRole('button', {
        name: /dismiss/i,
      });
      expect(dismissButton).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error region', () => {
      const { container } = render(
        <ErrorDisplay
          errors={['Error message']}
          visible={true}
        />
      );

      const errorRegion = container.querySelector('[role="region"]');
      expect(errorRegion).toHaveAttribute(
        'aria-label',
        'Error messages'
      );
      expect(errorRegion).toHaveAttribute('aria-live', 'polite');
      expect(errorRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce errors with role="alert"', () => {
      render(
        <ErrorDisplay
          errors={['Error message']}
          visible={true}
        />
      );

      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
