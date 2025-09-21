import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import QuestPopup from '../components/QuestPopup';

/**
 * Test suite for QuestPopup component
 *
 * Tests comprehensive popup functionality including:
 * - Rendering with quest data
 * - Modal behavior and interactions
 * - Accessibility compliance
 * - Animation states
 * - Button functionality
 */
describe('QuestPopup', () => {
  const mockOnClose = jest.fn();
  const mockOnStartQuest = jest.fn();

  const mockQuest = {
    id: 'test-quest-1',
    title: 'Character Development Challenge',
    description:
      'Complete wisdom-building activities with Hootie the Owl to develop strong character traits.',
    coins: 50,
    location: 'Central Park',
    estimatedTime: '15 minutes',
    difficulty: 'medium' as const,
  };

  const defaultProps = {
    quest: mockQuest,
    isOpen: true,
    onClose: mockOnClose,
    onStartQuest: mockOnStartQuest,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = 'unset';
  });

  /**
   * Basic rendering tests
   */
  it('renders quest popup when open', () => {
    render(<QuestPopup {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Character Development Challenge')).toBeInTheDocument();
    expect(screen.getByText(/Complete wisdom-building activities/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<QuestPopup {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders null when no quest provided', () => {
    render(<QuestPopup {...defaultProps} quest={null} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /**
   * Quest information display tests
   */
  it('displays quest metadata correctly', () => {
    render(<QuestPopup {...defaultProps} />);

    // Check coins display
    expect(screen.getByText('50')).toBeInTheDocument();

    // Check location
    expect(screen.getByText('Central Park')).toBeInTheDocument();

    // Check estimated time
    expect(screen.getByText('15 minutes')).toBeInTheDocument();

    // Check difficulty badge
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('handles optional quest properties gracefully', () => {
    const minimalQuest = {
      id: 'minimal-quest',
      title: 'Minimal Quest',
      description: 'A quest with minimal information',
      coins: 25,
    };

    render(<QuestPopup {...defaultProps} quest={minimalQuest} />);

    expect(screen.getByText('Minimal Quest')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.queryByText('Central Park')).not.toBeInTheDocument();
  });

  /**
   * Interaction tests
   */
  it('calls onClose when close button is clicked', () => {
    render(<QuestPopup {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close quest popup');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onStartQuest when start button is clicked', () => {
    render(<QuestPopup {...defaultProps} />);

    const startButton = screen.getByText('Start Quest');
    fireEvent.click(startButton);

    expect(mockOnStartQuest).toHaveBeenCalledWith('test-quest-1');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<QuestPopup {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<QuestPopup {...defaultProps} />);

    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside popup content', () => {
    render(<QuestPopup {...defaultProps} />);

    const popupContent = screen.getByRole('dialog');
    fireEvent.click(popupContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  /**
   * Accessibility tests
   */
  it('has proper ARIA attributes', () => {
    render(<QuestPopup {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'quest-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'quest-description');
  });

  it('manages body scroll correctly', () => {
    const { rerender } = render(<QuestPopup {...defaultProps} />);

    // Should prevent body scroll when open
    expect(document.body.style.overflow).toBe('hidden');

    // Should restore body scroll when closed
    rerender(<QuestPopup {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('unset');
  });

  /**
   * Difficulty color tests
   */
  it('applies correct difficulty colors', () => {
    const { rerender } = render(<QuestPopup {...defaultProps} />);

    // Medium difficulty
    expect(screen.getByText('Medium')).toHaveClass('text-yellow-400');

    // Easy difficulty
    rerender(<QuestPopup {...defaultProps} quest={{ ...mockQuest, difficulty: 'easy' }} />);
    expect(screen.getByText('Easy')).toHaveClass('text-cyber-green-400');

    // Hard difficulty
    rerender(<QuestPopup {...defaultProps} quest={{ ...mockQuest, difficulty: 'hard' }} />);
    expect(screen.getByText('Hard')).toHaveClass('text-red-400');
  });

  /**
   * Position-based rendering tests
   */
  it('applies custom position styling when provided', () => {
    const position = { x: 100, y: 200 };
    render(<QuestPopup {...defaultProps} position={position} />);

    const popup = screen.getByRole('dialog');
    // Position styling is applied via inline styles
    expect(popup).toHaveStyle({
      position: 'fixed',
      left: '100px',
      top: '200px',
    });
  });

  /**
   * Snapshot tests for visual regression
   */
  describe('Snapshot Tests', () => {
    it('matches snapshot for full quest data', () => {
      const { container } = render(<QuestPopup {...defaultProps} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for minimal quest data', () => {
      const minimalQuest = {
        id: 'minimal',
        title: 'Simple Quest',
        description: 'Basic quest description',
        coins: 10,
      };

      const { container } = render(<QuestPopup {...defaultProps} quest={minimalQuest} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for different difficulty levels', () => {
      const easyQuest = { ...mockQuest, difficulty: 'easy' as const };
      const { container } = render(<QuestPopup {...defaultProps} quest={easyQuest} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when closed', () => {
      const { container } = render(<QuestPopup {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
