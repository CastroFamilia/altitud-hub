/**
 * Tests for the ErrorBoundary component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// A component that throws on render
function BrokenComponent() {
  throw new Error('Intentional test error');
}

function WorkingComponent() {
  return <p>Everything is fine</p>;
}

describe('ErrorBoundary', () => {
  // Suppress ALL console.error during these tests to avoid noise
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary module="Test">
        <WorkingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Everything is fine')).toBeInTheDocument();
  });

  it('catches errors and renders fallback UI with "Algo salió mal"', () => {
    render(
      <ErrorBoundary module="Test Module">
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('includes the module name in the error message', () => {
    render(
      <ErrorBoundary module="Olympia Coach">
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Olympia Coach tuvo un error inesperado/)).toBeInTheDocument();
  });

  it('renders custom fallback if provided', () => {
    render(
      <ErrorBoundary module="Test" fallback={<p>Custom fallback</p>}>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });
});
