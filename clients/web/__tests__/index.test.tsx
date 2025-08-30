import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from '../pages/index';

describe('Home Page', () => {
  it('renders welcome title', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
  });
});

