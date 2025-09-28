/**
 * Dynamic Framer Motion Loader
 * Lazy loads framer-motion only when animations are actually needed
 */

import * as React from 'react';
import { ComponentType, ReactNode } from 'react';

// Types for motion components
export interface MotionDivProps {
  children: ReactNode;
  className?: string;
  initial?: Record<string, unknown> | string | boolean;
  animate?: Record<string, unknown> | string;
  exit?: Record<string, unknown> | string;
  whileHover?: Record<string, unknown>;
  whileTap?: Record<string, unknown>;
  layout?: boolean;
  layoutId?: string;
  transition?: Record<string, unknown>;
  variants?: Record<string, Record<string, unknown>>;
  custom?: unknown;
  style?: React.CSSProperties;
  onClick?: () => void;
  onAnimationComplete?: () => void;
}

export interface AnimatePresenceProps {
  children: ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  initial?: boolean;
}

// Lazy motion div loader
export const loadMotionDiv = async (): Promise<ComponentType<MotionDivProps>> => {
  const { motion } = await import('framer-motion');
  return motion.div as ComponentType<MotionDivProps>;
};

// Lazy AnimatePresence loader
export const loadAnimatePresence = async (): Promise<ComponentType<AnimatePresenceProps>> => {
  const { AnimatePresence } = await import('framer-motion');
  return AnimatePresence;
};

// Combined loader for both motion and AnimatePresence
export const loadFramerMotion = async () => {
  const { motion, AnimatePresence } = await import('framer-motion');
  return { motion, AnimatePresence };
};

// Fallback components for SSR and loading states
export const StaticDiv: React.FC<MotionDivProps> = ({
  children,
  className,
  style,
  onClick,
  ...rest
} = {}) => {
  // Return a regular div, ignoring all motion props
  return React.createElement('div', {
    className,
    style,
    onClick
  }, children);
};

export const StaticPresence: ComponentType<AnimatePresenceProps> = ({
  children
} = {}) => {
  return React.createElement(React.Fragment, null, children);
};