import { useState } from 'react';
import { ERROR_MESSAGES } from '../constants';

export const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);

  const handleError = (errorKey: keyof typeof ERROR_MESSAGES | string, additionalInfo?: string) => {
    if (errorKey in ERROR_MESSAGES) {
      const message = ERROR_MESSAGES[errorKey as keyof typeof ERROR_MESSAGES];
      setError(additionalInfo ? `${message}${additionalInfo}` : message);
    } else {
      setError(errorKey);
    }
  };

  const handleTemplateError = (errorMessage: string) => {
    if (errorMessage.includes('template') || errorMessage.includes('placeholder')) {
      setError(
        `${ERROR_MESSAGES.TEMPLATE_ERROR_PREFIX}${errorMessage}\n\n${ERROR_MESSAGES.TEMPLATE_ERROR_DETAILS}`
      );
    } else {
      handleError('DOCUMENT_GENERATION_ERROR', errorMessage);
    }
  };

  const clearError = () => setError(null);

  return {
    error,
    handleError,
    handleTemplateError,
    clearError,
  };
};
