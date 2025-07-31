import React from 'react';
import { FiInfo } from 'react-icons/fi';

interface CourseInfoFormProps {
  courseId: string;
  setCourseId: (id: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
}

export const CourseInfoForm: React.FC<CourseInfoFormProps> = ({
  courseId,
  setCourseId,
  subject,
  setSubject,
}) => {
  return (
    <div className="course-info-form">
      <div className="form-header">
        <FiInfo className="form-icon" />
        <h3>Informazioni Corso</h3>
      </div>
      
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="courseId">ID Corso</label>
          <input
            id="courseId"
            type="text"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="es. CORSO_001"
            className="form-input"
          />
          <span className="field-hint">
            Identificativo univoco del corso (opzionale)
          </span>
        </div>
        
        <div className="form-field">
          <label htmlFor="subject">Materia</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="es. Matematica, Italiano, Storia..."
            className="form-input"
            required
          />
          <span className="field-hint">
            Nome della materia o argomento della lezione
          </span>
        </div>
      </div>
    </div>
  );
};
