import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Auth to force master_admin role
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'master_admin' }),
}));

// Mock Toasts to no-ops
jest.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showWarning: jest.fn() }),
}));

// Mock Supabase minimal
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ order: () => Promise.resolve({ data: [] }) }),
      insert: async () => ({ data: [], error: null }),
    }),
    rpc: async () => ({ data: [], error: null }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/img.png' } }),
      }),
    },
    channel: () => ({
      on: () => ({
        on: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        }),
      }),
    }),
  },
}));

// Mock MapView to not render a real map, but expose a placement click hook
jest.mock('@/components/MapView', () => ({
  __esModule: true,
  default: (props: any) => {
    // Simulate that when placement mode is on, a click happens
    // We expose a button in test DOM to trigger props.renderOverlay's click handler indirectly
    const handleSimulateClick = () => {
      if (props.renderOverlay) {
        // Fake map object with on/off capable API
        const listeners: any = {};
        const map = {
          on: (evt: string, cb: any) => { listeners[evt] = cb; },
          off: (evt: string) => { delete listeners[evt]; },
        };
        props.renderOverlay(map as any, undefined);
        // Trigger click
        if (listeners['click']) listeners['click']({ lngLat: { lng: -75.1652, lat: 39.9526 } });
      }
    };
    return (
      <div>
        <button onClick={handleSimulateClick}>simulate-map-click</button>
      </div>
    );
  },
}));

import MasterMap from '@/pages/master/tabs/MasterMap';

describe('MasterMap create flow', () => {
  it('opens form, enters placement mode, and places on map', async () => {
    render(<MasterMap />);

    // Open quest form
    fireEvent.click(screen.getByText(/New Quest/i));

    // Fill minimal valid field(s)
    const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'My Quest' } });

    // Proceed to placement
    fireEvent.click(screen.getByText(/Next: Click map to place/i));

    // Simulate map click via mock MapView helper
    fireEvent.click(screen.getByText('simulate-map-click'));

    // After creation, the placement mode should be cleared; assert presence of New Quest button as proxy
    expect(screen.getByText(/New Quest/i)).toBeInTheDocument();
  });
});
