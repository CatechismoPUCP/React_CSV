import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

interface ErrorMessageProps {
  error: string;
  onClose: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onClose }) => {
  return (
    <div className="error-message">
      <FiAlertCircle size={20} />
      <span>{error}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
};
