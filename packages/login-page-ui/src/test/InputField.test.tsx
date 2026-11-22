/**
 * EPMCDMETST-71978: Input Field Component Tests
 * 
 * Unit tests for InputField component
 * Tests: rendering, events, accessibility, error display
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputField } from '../InputField';

describe('InputField Component', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render email input field', () => {
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render password input field', () => {
      render(
        <InputField
          type="password"
          name="password"
          label="Password"
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Password');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should display required indicator', () => {
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value=""
          onChange={mockOnChange}
          required={true}
        />
      );

      const requiredSpan = screen.getByText('*');
      expect(requiredSpan).toBeInTheDocument();
    });
  });

  describe('Events', () => {
    it('should call onChange when input value changes', async () => {
      const user = userEvent.setup();
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Email') as HTMLInputElement;
      await user.type(input, 'test@example.com');

      expect(mockOnChange).toHaveBeenCalledWith('test@example.com');
    });

    it('should call onBlur when input loses focus', () => {
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value=""
          onChange={mockOnChange}
          onBlur={mockOnBlur}
        />
      );

      const input = screen.getByLabelText('Email');
      fireEvent.blur(input);

      expect(mockOnBlur).toHaveBeenCalled();
    });
  });

  describe('Password Toggle', () => {
    it('should show/hide password on toggle button click', () => {
      const { rerender } = render(
        <InputField
          type="password"
          name="password"
          label="Password"
          value="test123"
          onChange={mockOnChange}
          showPasswordToggle={true}
        />
      );

      const toggleButton = screen.getByRole('button', {
        name: /show password/i,
      });
      expect(toggleButton).toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(screen.getByRole('button', { name: /hide password/i }));
    });
  });

  describe('Error Display', () => {
    it('should display error message', () => {
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value="invalid"
          onChange={mockOnChange}
          error="Invalid email format"
        />
      );

      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    it('should have invalid class when error exists', () => {
      const { container } = render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value="invalid"
          onChange={mockOnChange}
          error="Invalid email format"
        />
      );

      const input = container.querySelector('.is-invalid');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value=""
          onChange={mockOnChange}
          error="Invalid email"
        />
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute(
        'aria-describedby',
        'email-error'
      );
    });

    it('should announce error to screen readers', () => {
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value="invalid"
          onChange={mockOnChange}
          error="Invalid email format"
        />
      );

      const error = screen.getByRole('alert');
      expect(error).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(
        <InputField
          type="email"
          name="email"
          label="Email"
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const input = screen.getByLabelText('Email') as HTMLInputElement;
      expect(input).toBeDisabled();
    });
  });
});
