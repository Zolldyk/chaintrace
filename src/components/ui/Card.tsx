/**
 * Card component with ChainTrace Design System styling.
 *
 * @example
 * ```tsx
 * <Card className="p-6">
 *   <h2>Card Title</h2>
 *   <p>Card content goes here</p>
 * </Card>
 * ```
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Card variant styling */
  variant?: 'default' | 'outlined' | 'elevated';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'default' }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg bg-white',
          {
            'shadow-card border border-gray-200': variant === 'default',
            'border border-gray-300': variant === 'outlined',
            'shadow-card-hover': variant === 'elevated',
          },
          className
        )}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };