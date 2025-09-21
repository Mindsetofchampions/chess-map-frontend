# 🎨 CHESS Map Color Reference Guide

## Color-Coded System Implementation

This guide documents the complete color system for sprites, bubbles, and interactive elements in the CHESS Map interface.

---

## 🌟 CHESS Attribute Colors

### Primary Educational Attributes

Each CHESS attribute has been assigned a unique, distinct color that reflects its educational purpose:

| **Attribute**   | **Character**    | **Color** | **Hex Code** | **Meaning**                    |
| --------------- | ---------------- | --------- | ------------ | ------------------------------ |
| **Character**   | Hootie the Owl   | Purple    | `#8B5CF6`    | Wisdom & Character Development |
| **Health**      | Brenda the Cat   | Green     | `#10B981`    | Health & Wellness              |
| **Exploration** | Gino the Dog     | Orange    | `#F59E0B`    | Adventure & Discovery          |
| **STEM**        | Hammer the Robot | Blue      | `#3B82F6`    | Technology & Innovation        |
| **Stewardship** | MOC Badge        | Red       | `#EF4444`    | Leadership & Responsibility    |

---

## 🎯 Interactive Element Styling

### CHESS Attribute Bubbles

- **Background**: Attribute color at 20% opacity (`${color}20`)
- **Border**: Attribute color at 60% opacity (`${color}60`)
- **Pulse Ring**: Full attribute color
- **Tooltip Learn More Button**: Attribute color theme

### Visual Examples:

```css
/* Character (Purple) Bubble */
background-color: #8b5cf620; /* 20% opacity */
border-color: #8b5cf660; /* 60% opacity */

/* Health (Green) Bubble */
background-color: #10b98120; /* 20% opacity */
border-color: #10b98160; /* 60% opacity */
```

---

## 🎨 Decorative Bubble Colors

### Flat-Colored Draggable Bubbles

Eight distinct colors for ambient decorative elements:

| **Color Name** | **Hex Code** | **RGB**            | **Usage**     |
| -------------- | ------------ | ------------------ | ------------- |
| Coral Red      | `#FF6B6B`    | rgb(255, 107, 107) | Accent bubble |
| Teal           | `#4ECDC4`    | rgb(78, 205, 196)  | Accent bubble |
| Sky Blue       | `#45B7D1`    | rgb(69, 183, 209)  | Accent bubble |
| Mint Green     | `#96CEB4`    | rgb(150, 206, 180) | Accent bubble |
| Soft Yellow    | `#FFEAA7`    | rgb(255, 234, 167) | Accent bubble |
| Plum           | `#DDA0DD`    | rgb(221, 160, 221) | Accent bubble |
| Aqua Green     | `#98D8C8`    | rgb(152, 216, 200) | Accent bubble |
| Peach          | `#FFB366`    | rgb(255, 179, 102) | Accent bubble |

---

## 🎮 Interactive Features

### Draggable Bubble Properties

- **Base Opacity**: 80% (`opacity: 0.8`)
- **Hover Opacity**: 100% (`opacity: 1`)
- **Border**: 2px white with 20% opacity
- **Shadow**: Dynamic shadow that intensifies on drag
- **Sizes**: Small (32px), Medium (48px), Large (64px)

### Animation System

- **Float Animation**: Gentle Y-axis movement (-8px to 0px)
- **Rotation**: Subtle rotation (±2 degrees)
- **Pulse Ring**: Scales from 100% to 140% with opacity fade
- **Hover Scale**: 110% scale on hover
- **Drag Scale**: 120% scale while dragging

---

## 🛡️ Accessibility & Contrast

### Color Contrast Ratios

All colors have been tested for accessibility compliance:

- **CHESS Attribute text**: High contrast against dark backgrounds
- **Interactive elements**: Meet WCAG 2.1 AA standards
- **Decorative bubbles**: Sufficient contrast for visual distinction

### Touch Optimization

- **Minimum Touch Target**: 44px × 44px for all interactive elements
- **Touch Action**: `manipulation` for improved mobile performance
- **Visual Feedback**: Immediate response to user interactions

---

## 📱 Responsive Design

### Mobile Adaptations

- **Smaller Animations**: Reduced Y-oscillation for mobile (`-10px` vs `-20px`)
- **Touch-Friendly**: Larger touch targets and optimized spacing
- **Performance**: GPU-accelerated animations for smooth performance

### Desktop Enhancements

- **Enhanced Effects**: Larger animations and more pronounced hover states
- **Precision Dragging**: Fine-tuned drag sensitivity for mouse interaction
- **Visual Hierarchy**: Clearer distinction between interactive elements

---

## 🔧 Technical Implementation

### Color System Usage

```typescript
// Import the color system
import { CHESS_COLORS } from './components/FloatingBubbles';

// Apply colors dynamically
style={{
  backgroundColor: `${CHESS_COLORS.character}20`, // 20% opacity
  borderColor: `${CHESS_COLORS.character}60`,     // 60% opacity
}}
```

### Performance Optimizations

- **GPU Acceleration**: All animations use `transform` properties
- **Efficient Re-renders**: `useCallback` for event handlers
- **Memory Management**: Proper cleanup of event listeners
- **Smooth Animations**: Spring-based transitions for natural movement

---

## 🎯 Design Philosophy

### Youth Engagement Principles

1. **Bright, Distinctive Colors**: Easy to distinguish and remember
2. **Interactive Feedback**: Immediate visual response to user actions
3. **Playful Animations**: Non-intrusive, engaging movement
4. **Clear Visual Hierarchy**: Obvious distinction between functional and decorative elements

### Educational Color Psychology

- **Purple (Character)**: Associated with wisdom, creativity, and mystery
- **Green (Health)**: Represents growth, nature, and wellness
- **Orange (Exploration)**: Energetic, adventurous, and stimulating
- **Blue (STEM)**: Trust, technology, and intellectual depth
- **Red (Stewardship)**: Leadership, responsibility, and action

---

This color system creates a cohesive, engaging, and accessible interface that enhances the CHESS Map learning experience while maintaining visual clarity and user engagement.
