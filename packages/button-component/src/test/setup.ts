import '@testing-library/jest-dom';

Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'none',
    appearance: ['-webkit-appearance'],
  }),
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});

jest.mock('../../components/Button/Button.module.css', () => ({
  button: 'button',
  primary: 'primary',
  secondary: 'secondary',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  loading: 'loading',
  spinner: 'spinner',
}));

