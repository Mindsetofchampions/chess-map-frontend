import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import FloatingBubbles from '../components/FloatingBubbles';

/**
 * Snapshot tests for FloatingBubbles component
 * 
 * Tests the rendering of CHESS attribute bubbles with their animations,
 * sprite icons, and interactive tooltips. Ensures consistent visual
 * structure across code changes.
 */
describe('FloatingBubbles', () => {
  /**
   * Basic rendering test - captures the complete component structure
   * including all 5 CHESS attribute bubbles and their positioning
   */
  it('renders all CHESS attribute bubbles correctly', () => {
    const { container } = render(<FloatingBubbles />);
    expect(container.firstChild).toMatchSnapshot();
  });

  /**
   * Test individual bubble elements are present
   * Verifies that all expected CHESS attributes are rendered
   */
  it('contains all expected CHESS attribute bubbles', () => {
    const { container } = render(<FloatingBubbles />);
    
    // Verify container structure
    expect(container.querySelector('[aria-label*="Hootie"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label*="Brenda"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label*="Gino"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label*="Hammer"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label*="MOC Badge"]')).toBeInTheDocument();
    
    // Snapshot test for individual elements
    expect(container.firstChild).toMatchSnapshot('floating-bubbles-complete');
  });

  /**
   * Test sprite image sources are correctly set
   * Ensures all character sprites have proper paths
   */
  it('renders sprite images with correct sources', () => {
    const { container } = render(<FloatingBubbles />);
    
    const sprites = container.querySelectorAll('img');
    const spriteSources = Array.from(sprites).map(img => img.getAttribute('src'));
    
    expect(spriteSources).toContain('/sprites/owl.gif/HOOTIE_WINGLIFT.gif');
    expect(spriteSources).toContain('/sprites/cat.gif/KITTY_BOUNCE.gif');
    expect(spriteSources).toContain('/sprites/dog.gif/GINO_COMPASSSPIN.gif');
    expect(spriteSources).toContain('/sprites/robot.gif/HAMMER_SWING.gif');
    expect(spriteSources).toContain('/sprites/badge.gif/BADGE_SHINE.gif');
    
    // Snapshot for sprite configuration
    expect(spriteSources).toMatchSnapshot('sprite-sources');
  });

  /**
   * Test accessibility attributes
   * Ensures proper ARIA labels and interactive elements
   */
  it('has proper accessibility attributes', () => {
    const { container } = render(<FloatingBubbles />);
    
    const buttons = container.querySelectorAll('button[role="button"]');
    expect(buttons).toHaveLength(5);
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
    
    // Snapshot for accessibility structure
    expect(container.firstChild).toMatchSnapshot('accessibility-structure');
  });
});