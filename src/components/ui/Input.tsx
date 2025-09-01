/**
 * Input component placeholder - to be implemented in UI story
 */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Placeholder - will be implemented in future stories
export const Input = (props: InputProps) => <input {...props} />;
