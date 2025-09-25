import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Auth to force master_admin role
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'master_admin' }),
}));

// Mock Toasts to no-ops
jest.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showWarning: jest.fn() }),
}));

// Mock Supabase client calls used by MasterMap
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'quests') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [] }),
          }),
        } as any;
      }
      // safe_spaces and events call select() and await directly
      return {
        select: async () => ({ data: [] }),
      } as any;
    },
    channel: () => ({
      on: () => ({
        on: () => ({
          on: () => ({
            subscribe: () => ({ unsubscribe: () => {} }),
          }),
        }),
      }),
    }),
  },
}));

// Mock MapView so it calls renderOverlay with no GL and doesn't touch the DOM heavily
jest.mock('@/components/MapView', () => ({
  __esModule: true,
  default: (props: any) => {
    if (props.renderOverlay) {
      try { props.renderOverlay({ /* map */ }, undefined); } catch {}
    }
    return <div data-testid="mock-map-view">Mock MapView</div>;
  },
}));

import MasterMap from '@/pages/master/tabs/MasterMap';

describe('MasterMap smoke test', () => {
  it('renders and does not crash when GL is missing (no Mapbox/MapLibre)', async () => {
    render(<MasterMap />);

  // Buttons should render
  expect(await screen.findByText(/New Quest/i)).toBeInTheDocument();
  expect(screen.getByText(/New Safe Space/i)).toBeInTheDocument();
  expect(screen.getByText(/New Event/i)).toBeInTheDocument();

    // Mocked MapView present
    expect(screen.getByTestId('mock-map-view')).toBeInTheDocument();
  });
});
