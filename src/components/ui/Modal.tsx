/**
 * Modal component placeholder - to be implemented in UI story
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Placeholder - will be implemented in future stories
export const Modal = ({ children, isOpen }: ModalProps) =>
  isOpen ? <div>{children}</div> : null;
