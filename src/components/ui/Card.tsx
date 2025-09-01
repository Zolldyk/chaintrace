/**
 * Card component placeholder - to be implemented in UI story
 */

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// Placeholder - will be implemented in future stories
export const Card = ({ children, className }: CardProps) => (
  <div className={className}>{children}</div>
);
