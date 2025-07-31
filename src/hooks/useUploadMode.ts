import { useState, useCallback } from 'react';

export type UploadMode = 'manual' | 'fast';

export const useUploadMode = () => {
  const [uploadMode, setUploadMode] = useState<UploadMode>('manual');

  const toggleMode = useCallback(() => {
    setUploadMode(prev => prev === 'manual' ? 'fast' : 'manual');
  }, []);

  const setManualMode = useCallback(() => {
    setUploadMode('manual');
  }, []);

  const setFastMode = useCallback(() => {
    setUploadMode('fast');
  }, []);

  return {
    uploadMode,
    setUploadMode,
    toggleMode,
    setManualMode,
    setFastMode,
    isManualMode: uploadMode === 'manual',
    isFastMode: uploadMode === 'fast',
  };
};
