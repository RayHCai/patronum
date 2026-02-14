// Patient-specific button component (extra large, touch-friendly)
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PatientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'large' | 'medium';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

export default function PatientButton({
  children,
  onClick,
  variant = 'primary',
  size = 'large',
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = false,
}: PatientButtonProps) {
  const baseClass = size === 'large' ? 'patient-button-primary' : 'patient-button-secondary';
  const className = `${baseClass} ${fullWidth ? 'w-full' : ''}`;

  return (
    <motion.button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          Please wait...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
