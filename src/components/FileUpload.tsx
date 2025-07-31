import React, { useRef } from 'react';
import { FiUpload } from 'react-icons/fi';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  icon?: React.ReactNode;
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
}

interface MultipleFileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (files: File[]) => void;
  selectedFile?: never;
  icon?: React.ReactNode;
  required?: boolean;
  multiple: true;
  disabled?: boolean;
}

type FileUploadComponentProps = FileUploadProps | MultipleFileUploadProps;

export const FileUpload: React.FC<FileUploadComponentProps> = ({
  label,
  accept,
  onFileSelect,
  selectedFile,
  icon,
  required = false,
  multiple = false,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      if (multiple) {
        const fileArray = Array.from(files);
        (onFileSelect as (files: File[]) => void)(fileArray);
      } else {
        const file = files[0];
        if (file) {
          (onFileSelect as (file: File) => void)(file);
        }
      }
    }
  };

  return (
    <div className="file-upload">
      <label className="file-upload-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <div 
        className={`file-upload-area ${selectedFile ? 'has-file' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={disabled ? undefined : handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          multiple={multiple}
          disabled={disabled}
        />
        
        <div className="file-upload-content">
          {icon || <FiUpload size={24} />}
          <div className="file-upload-text">
            {selectedFile ? (
              <div>
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div>
                <div>Clicca per selezionare il file</div>
                <div className="file-hint">o trascina qui il file</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
