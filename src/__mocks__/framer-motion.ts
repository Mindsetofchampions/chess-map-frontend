/**
 * Mock implementation of Framer Motion for testing
 */
import React from 'react';

// Mock motion components
export const motion = {
  div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => 
    React.createElement('div', { ...props, ref }, children)
  ),
  button: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => 
    React.createElement('button', { ...props, ref }, children)
  ),
  img: React.forwardRef<HTMLImageElement, any>(({ children, ...props }, ref) => 
    React.createElement('img', { ...props, ref }, children)
  ),
  aside: React.forwardRef<HTMLElement, any>(({ children, ...props }, ref) => 
    React.createElement('aside', { ...props, ref }, children)
  ),
};

// Mock AnimatePresence
export const AnimatePresence: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};

// Mock useAnimation hook
export const useAnimation = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  set: jest.fn(),
});

// Mock useMotionValue hook
export const useMotionValue = (initial: any) => ({
  get: () => initial,
  set: jest.fn(),
  on: jest.fn(),
  onChange: jest.fn(),
});

// Mock useSpring hook
export const useSpring = (value: any) => value;

// Mock useTransform hook
export const useTransform = (_value: any, _input: any, output: any) => output[0];

export default {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useSpring,
  useTransform,
};