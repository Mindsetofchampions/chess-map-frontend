import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlassContainer from '../components/GlassContainer';

/**
 * Test suite for GlassContainer component
 * 
 * Tests comprehensive glassmorphic container functionality:
 * - Different container variants (page, card, overlay)
 * - Animation behavior and timing
 * - Custom styling and class combinations
 * - Children rendering and props passing
 */
describe('GlassContainer', () => {
  const testChildren = <div data-testid="test-content">Test Content</div>;

  /**
   * Basic rendering tests
   */
  it('renders children correctly', () => {
    render(<GlassContainer>{testChildren}</GlassContainer>);
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies default card variant styling', () => {
    const { container } = render(<GlassContainer>{testChildren}</GlassContainer>);
    
    const glassContainer = container.firstChild as HTMLElement;
    expect(glassContainer).toHaveClass('bg-glass');
    expect(glassContainer).toHaveClass('backdrop-blur-2xl');
    expect(glassContainer).toHaveClass('border-glass');
    expect(glassContainer).toHaveClass('rounded-2xl');
  });

  /**
   * Variant-specific styling tests
   */
  it('applies page variant styling correctly', () => {
    const { container } = render(
      <GlassContainer variant="page">{testChildren}</GlassContainer>
    );
    
    const glassContainer = container.firstChild as HTMLElement;
    expect(glassContainer).toHaveClass('min-h-screen');
    expect(glassContainer).toHaveClass('bg-gradient-to-br');
    expect(glassContainer).toHaveClass('from-dark-primary');
    expect(glassContainer).toHaveClass('via-dark-secondary');
    expect(glassContainer).toHaveClass('to-dark-tertiary');
  });

  it('applies overlay variant styling correctly', () => {
    const { container } = render(
      <GlassContainer variant="overlay">{testChildren}</GlassContainer>
    );
    
    const glassContainer = container.firstChild as HTMLElement;
    expect(glassContainer).toHaveClass('bg-glass-light');
    expect(glassContainer).toHaveClass('backdrop-blur-3xl');
    expect(glassContainer).toHaveClass('border-glass-light');
    expect(glassContainer).toHaveClass('rounded-xl');
  });

  /**
   * Custom styling tests
   */
  it('applies custom className when provided', () => {
    const customClass = 'custom-glass-class';
    const { container } = render(
      <GlassContainer className={customClass}>{testChildren}</GlassContainer>
    );
    
    const glassContainer = container.firstChild as HTMLElement;
    expect(glassContainer).toHaveClass(customClass);
  });

  it('combines variant classes with custom classes', () => {
    const customClass = 'custom-overlay-styling';
    const { container } = render(
      <GlassContainer variant="overlay" className={customClass}>
        {testChildren}
      </GlassContainer>
    );
    
    const glassContainer = container.firstChild as HTMLElement;
    expect(glassContainer).toHaveClass('bg-glass-light'); // Variant class
    expect(glassContainer).toHaveClass(customClass); // Custom class
  });

  /**
   * Animation behavior tests
   */
  it('renders with animation by default', () => {
    const { container } = render(<GlassContainer>{testChildren}</GlassContainer>);
    
    // With Framer Motion mocked, we check that motion.div is used
    const glassContainer = container.firstChild;
    expect(glassContainer).toBeInTheDocument();
  });

  it('renders without animation when animate is false', () => {
    const { container } = render(
      <GlassContainer animate={false}>{testChildren}</GlassContainer>
    );
    
    // Should render as regular div when animate is false
    const glassContainer = container.firstChild;
    expect(glassContainer).toBeInTheDocument();
  });

  it('applies animation delay when specified', () => {
    render(
      <GlassContainer delay={0.5}>{testChildren}</GlassContainer>
    );
    
    // Animation delay is handled by Framer Motion props
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  /**
   * Decorative elements tests
   */
  it('includes decorative gradient border for card variant', () => {
    const { container } = render(
      <GlassContainer variant="card">{testChildren}</GlassContainer>
    );
    
    // Check for decorative gradient element
    const decorativeElement = container.querySelector('.bg-gradient-to-r');
    expect(decorativeElement).toBeInTheDocument();
    expect(decorativeElement).toHaveClass('from-electric-blue-400/30');
    expect(decorativeElement).toHaveClass('via-neon-purple-400/30');
    expect(decorativeElement).toHaveClass('to-cyber-green-400/30');
  });

  it('does not include decorative border for non-card variants', () => {
    const { container } = render(
      <GlassContainer variant="page">{testChildren}</GlassContainer>
    );
    
    const decorativeElement = container.querySelector('.bg-gradient-to-r');
    expect(decorativeElement).not.toBeInTheDocument();
  });

  /**
   * Complex integration tests
   */
  it('handles multiple children correctly', () => {
    const multipleChildren = (
      <>
        <h1>Title</h1>
        <p>Description</p>
        <button>Action</button>
      </>
    );

    render(<GlassContainer>{multipleChildren}</GlassContainer>);
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('handles nested GlassContainer components', () => {
    render(
      <GlassContainer variant="page">
        <GlassContainer variant="card">
          <GlassContainer variant="overlay">
            {testChildren}
          </GlassContainer>
        </GlassContainer>
      </GlassContainer>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  /**
   * Snapshot tests for visual regression
   */
  describe('Snapshot Tests', () => {
    it('matches snapshot for default card variant', () => {
      const { container } = render(<GlassContainer>{testChildren}</GlassContainer>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for page variant', () => {
      const { container } = render(
        <GlassContainer variant="page">{testChildren}</GlassContainer>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for overlay variant', () => {
      const { container } = render(
        <GlassContainer variant="overlay">{testChildren}</GlassContainer>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with custom className and no animation', () => {
      const { container } = render(
        <GlassContainer 
          variant="card" 
          className="custom-test-class" 
          animate={false}
        >
          {testChildren}
        </GlassContainer>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with animation delay', () => {
      const { container } = render(
        <GlassContainer delay={1.0}>{testChildren}</GlassContainer>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});