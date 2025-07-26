import React, { useRef } from 'react';
import { FiUpload, FiFileText, FiCalendar } from 'react-icons/fi';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  selectedFile?: File;
  icon?: React.ReactNode;
  required?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept,
  onFileSelect,
  selectedFile,
  icon,
  required = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="file-upload">
      <label className="file-upload-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <div 
        className={`file-upload-area ${selectedFile ? 'has-file' : ''}`}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          style={{ display: 'none' }}
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
