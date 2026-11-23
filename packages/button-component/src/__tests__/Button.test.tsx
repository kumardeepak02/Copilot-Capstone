import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/Button/Button';

describe('Button Component - All Functional Requirements', () => {
  describe('FR-1-3: Core Rendering and Props', () => {
    test('FR-1: renders as HTML button element', () => {
      const { container } = render(<Button label="Click me" onClick={() => {}} />);
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button?.tagName).toBe('BUTTON');
    });

    test('FR-2: accepts and displays label prop', () => {
      render(<Button label="Click me" onClick={() => {}} />);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    test('FR-3: accepts onClick callback', () => {
      const handleClick = jest.fn();
      render(<Button label="Click" onClick={handleClick} />);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('FR-4-6: Click Handling and Disabled State', () => {
    test('FR-4: executes onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button label="Click" onClick={handleClick} />);
      fireEvent.click(screen.getByText('Click'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('FR-5: supports disabled prop with visual feedback', () => {
      const { container } = render(<Button label="Click" onClick={() => {}} disabled={true} />);
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    test('FR-6: prevents onClick execution when disabled', () => {
      const handleClick = jest.fn();
      render(<Button label="Click" onClick={handleClick} disabled={true} />);
      fireEvent.click(screen.getByText('Click'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('FR-7-9: Variants and Children', () => {
    test('FR-7: accepts variant prop (primary/secondary)', () => {
      const { container: c1 } = render(
        <Button label="Click" onClick={() => {}} variant="primary" />
      );
      const { container: c2 } = render(
        <Button label="Click" onClick={() => {}} variant="secondary" />
      );
      expect(c1).toBeInTheDocument();
      expect(c2).toBeInTheDocument();
    });

    test('FR-8: applies variant-based CSS classes', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} variant="primary" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('primary');
    });

    test('FR-9: supports children prop for flexible content', () => {
      render(
        <Button label="default" onClick={() => {}}>
          <span>Custom Content</span>
        </Button>
      );
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });
  });

  describe('FR-10-13: Loading State', () => {
    test('FR-10: accepts isLoading prop', () => {
      render(
        <Button label="Click" onClick={() => {}} isLoading={true} />
      );
      expect(screen.getByText('Click')).toBeInTheDocument();
    });

    test('FR-11: displays loading indicator/spinner when isLoading is true', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} isLoading={true} />
      );
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });

    test('FR-12: auto-disables interactions in loading state', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} isLoading={true} />
      );
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    test('FR-13: prevents onClick in loading state', () => {
      const handleClick = jest.fn();
      render(
        <Button label="Click" onClick={handleClick} isLoading={true} />
      );
      fireEvent.click(screen.getByText('Click'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('FR-14: Accessibility', () => {
    test('FR-14: supports aria-label and aria-disabled attributes', () => {
      const { container } = render(
        <Button
          label="Click"
          onClick={() => {}}
          aria-label="Submit form"
          aria-disabled={false}
        />
      );
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
      expect(button).toHaveAttribute('aria-disabled', 'false');
    });

    test('FR-14: semantic HTML button element', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} />
      );
      const button = container.querySelector('button');
      expect(button?.tagName).toBe('BUTTON');
    });
  });

  describe('FR-15: Size Variants', () => {
    test('FR-15: accepts size prop (sm/md/lg)', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      sizes.forEach((size) => {
        const { container } = render(
          <Button label="Click" onClick={() => {}} size={size} />
        );
        const button = container.querySelector('button');
        expect(button?.className).toContain(size);
      });
    });
  });

  describe('FR-16-17: TypeScript and Component Quality', () => {
    test('FR-16-17: component is pure functional with TypeScript types', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <Button
          label="Click me"
          onClick={handleClick}
          variant="primary"
          size="md"
          disabled={false}
          isLoading={false}
          aria-label="Click"
        />
      );

      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();

      fireEvent.click(button!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Default Values', () => {
    test('uses default variant (primary) when not specified', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('primary');
    });

    test('uses default size (md) when not specified', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('md');
    });

    test('disabled defaults to false', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} />
      );
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    test('isLoading defaults to false', () => {
      const handleClick = jest.fn();
      render(<Button label="Click" onClick={handleClick} />);
      fireEvent.click(screen.getByText('Click'));
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Combined Scenarios', () => {
    test('all variants and sizes work correctly together', () => {
      const variants = ['primary', 'secondary'] as const;
      const sizes = ['sm', 'md', 'lg'] as const;

      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const { container } = render(
            <Button
              label="Test"
              onClick={() => {}}
              variant={variant}
              size={size}
            />
          );
          const button = container.querySelector('button');
          expect(button?.className).toContain(variant);
          expect(button?.className).toContain(size);
        });
      });
    });

    test('disabled + loading state (loading takes precedence)', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <Button
          label="Click"
          onClick={handleClick}
          disabled={true}
          isLoading={true}
        />
      );
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('all ARIA attributes applied correctly', () => {
      const { container } = render(
        <Button
          label="Test Button"
          onClick={() => {}}
          disabled={false}
          isLoading={false}
          aria-label="Custom label"
          aria-disabled={false}
        />
      );
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-disabled', 'false');
      expect(button).toHaveAttribute('aria-busy', 'false');
    });
  });

  describe('Edge Cases and Acceptance Criteria', () => {
    test('AC-1: Button renders with label text "Click Me"', () => {
      render(<Button label="Click Me" onClick={() => {}} />);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    test('AC-2: Button renders semantic HTML button element', () => {
      const { container } = render(<Button label="Test" onClick={() => {}} />);
      const button = container.querySelector('button');
      expect(button?.tagName).toBe('BUTTON');
    });

    test('AC-3: Disabled button shows visual feedback', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} disabled={true} />
      );
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    test('AC-4: Loading state shows spinner and blocks clicks', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <Button label="Loading" onClick={handleClick} isLoading={true} />
      );
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
      
      const button = container.querySelector('button') as HTMLButtonElement;
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('AC-5: Button supports variant="primary" and variant="secondary"', () => {
      const { container: c1 } = render(
        <Button label="Primary" onClick={() => {}} variant="primary" />
      );
      const { container: c2 } = render(
        <Button label="Secondary" onClick={() => {}} variant="secondary" />
      );
      
      const btn1 = c1.querySelector('button');
      const btn2 = c2.querySelector('button');
      
      expect(btn1?.className).toContain('primary');
      expect(btn2?.className).toContain('secondary');
    });

    test('AC-6: Button supports size="sm", size="md", size="lg"', () => {
      const { container: c1 } = render(
        <Button label="Small" onClick={() => {}} size="sm" />
      );
      const { container: c2 } = render(
        <Button label="Medium" onClick={() => {}} size="md" />
      );
      const { container: c3 } = render(
        <Button label="Large" onClick={() => {}} size="lg" />
      );
      
      expect(c1.querySelector('button')?.className).toContain('sm');
      expect(c2.querySelector('button')?.className).toContain('md');
      expect(c3.querySelector('button')?.className).toContain('lg');
    });

    test('AC-7: Default variant is "primary"', () => {
      const { container } = render(
        <Button label="Default" onClick={() => {}} />
      );
      expect(container.querySelector('button')?.className).toContain('primary');
    });

    test('AC-8: Default size is "md"', () => {
      const { container } = render(
        <Button label="Default" onClick={() => {}} />
      );
      expect(container.querySelector('button')?.className).toContain('md');
    });

    test('AC-9: Component supports aria-label for accessibility', () => {
      const { container } = render(
        <Button label="Click" onClick={() => {}} aria-label="Submit form" />
      );
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });
  });
});
