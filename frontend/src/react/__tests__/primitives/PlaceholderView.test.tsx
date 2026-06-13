import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceholderView } from '../../components/primitives/PlaceholderView';
import { Workflow } from 'lucide-react';

describe('PlaceholderView', () => {
  const defaults = { title: 'Orchestrator', description: 'Multi-step pipelines', icon: Workflow };

  it('renders title in header h2', () => {
    render(<PlaceholderView {...defaults} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Orchestrator' })).toBeDefined();
  });

  it('renders description', () => {
    render(<PlaceholderView {...defaults} />);
    expect(screen.getByText('Multi-step pipelines')).toBeDefined();
  });

  it('renders placeholder fallback content when no children provided', () => {
    render(<PlaceholderView {...defaults} />);
    // Placeholder shows an h3 with the title
    expect(screen.getByRole('heading', { level: 3, name: 'Orchestrator' })).toBeDefined();
  });

  it('does not ship mocked legacy-UI copy in fallback', () => {
    render(<PlaceholderView {...defaults} />);
    expect(screen.queryByText(/legacy UI/i)).toBeNull();
    expect(screen.queryByText(/coming in the next build/i)).toBeNull();
  });

  it('renders children instead of placeholder when provided', () => {
    render(
      <PlaceholderView {...defaults}>
        <p>Custom content</p>
      </PlaceholderView>,
    );
    expect(screen.getByText('Custom content')).toBeDefined();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });
});
