import { useState, useEffect } from 'react';
import { FileService } from '../services/fileService';

export const useTemplateLoader = () => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDefaultTemplate = async () => {
      setIsLoading(true);
      try {
        const file = await FileService.loadDefaultTemplate();
        if (file) {
          setTemplateFile(file);
        }
      } catch (error) {
        console.log('Failed to load default template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultTemplate();
  }, []);

  return {
    templateFile,
    setTemplateFile,
    isLoading,
  };
};
