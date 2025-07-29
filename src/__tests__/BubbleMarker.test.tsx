import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BubbleMarker from '../components/BubbleMarker';

/**
 * Test suite for BubbleMarker component
 * 
 * Tests cover:
 * - Basic rendering and sprite loading
 * - Click interactions and callbacks
 * - Hover animation behavior
 * - Accessibility features
 * - Different size variants
 */
describe('BubbleMarker', () => {
  const mockOnClick = jest.fn();
  const defaultProps = {
    attributeId: 'security',
    onClick: mockOnClick
  };

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders correctly with default props', () => {
    render(<BubbleMarker {...defaultProps} />);
    
    const marker = screen.getByRole('button');
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('aria-label', 'security attribute marker');
  });

  it('displays sprite icon with correct path', () => {
    render(<BubbleMarker {...defaultProps} />);
    
    const icon = screen.getByAltText('security attribute icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', '/icons/security-attribute.png');
  });

  it('calls onClick callback when clicked', () => {
    render(<BubbleMarker {...defaultProps} />);
    
    const marker = screen.getByRole('button');
    fireEvent.click(marker);
    
    expect(mockOnClick).toHaveBeenCalledWith('security');
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation correctly', () => {
    render(<BubbleMarker {...defaultProps} />);
    
    const marker = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(marker, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledWith('security');
    
    // Test Space key
    fireEvent.keyDown(marker, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledWith('security');
    
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <BubbleMarker {...defaultProps} size="sm" />
    );
    
    let marker = screen.getByRole('button');
    expect(marker).toHaveClass('w-10', 'h-10');
    
    rerender(<BubbleMarker {...defaultProps} size="lg" />);
    marker = screen.getByRole('button');
    expect(marker).toHaveClass('w-16', 'h-16');
  });

  it('applies position styles when position prop is provided', () => {
    const position = { x: 100, y: 200 };
    render(<BubbleMarker {...defaultProps} position={position} />);
    
    const marker = screen.getByRole('button');
    expect(marker).toHaveClass('absolute');
  });

  it('includes accessibility attributes', () => {
    render(<BubbleMarker {...defaultProps} />);
    
    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('tabIndex', '0');
    expect(marker).toHaveAttribute('aria-label', 'security attribute marker');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-marker-class';
    render(<BubbleMarker {...defaultProps} className={customClass} />);
    
    const marker = screen.getByRole('button');
    expect(marker).toHaveClass(customClass);
  });

  it('renders without onClick callback', () => {
    render(<BubbleMarker attributeId="strategy" />);
    
    const marker = screen.getByRole('button');
    expect(marker).toBeInTheDocument();
    
    // Should not throw error when clicked
    fireEvent.click(marker);
  });

  it('handles image load error gracefully', () => {
    render(<BubbleMarker {...defaultProps} />);
    
    const icon = screen.getByAltText('security attribute icon');
    
    // Simulate image load error
    fireEvent.error(icon);
    
    // Icon should be hidden when error occurs
    expect(icon).toHaveStyle('display: none');
  });

  it('applies touch manipulation for mobile optimization', () => {
    render(<BubbleMarker {...defaultProps} />);
    
    const marker = screen.getByRole('button');
    expect(marker).toHaveClass('touch-manipulation');
  });

  it('meets minimum touch target size requirements', () => {
    render(<BubbleMarker {...defaultProps} size="sm" />);
    
    const marker = screen.getByRole('button');
    expect(marker).toHaveClass('min-w-touch', 'min-h-touch');
  });

  /**
   * Snapshot tests for visual regression detection
   */
  describe('Snapshot Tests', () => {
    it('matches snapshot for default rendering', () => {
      const { container } = render(<BubbleMarker {...defaultProps} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for small size variant', () => {
      const { container } = render(
        <BubbleMarker {...defaultProps} size="sm" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for large size variant', () => {
      const { container } = render(
        <BubbleMarker {...defaultProps} size="lg" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with position and custom class', () => {
      const { container } = render(
        <BubbleMarker 
          {...defaultProps} 
          position={{ x: 50, y: 100 }} 
          className="custom-class"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});