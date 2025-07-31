import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import { LessonType } from '../../types';

interface LessonTypeSelectorProps {
  lessonType: LessonType;
  setLessonType: (type: LessonType) => void;
}

export const LessonTypeSelector: React.FC<LessonTypeSelectorProps> = ({
  lessonType,
  setLessonType,
}) => {
  const lessonOptions = [
    { value: 'morning' as LessonType, label: 'Solo Mattina', description: 'Lezione solo al mattino' },
    { value: 'afternoon' as LessonType, label: 'Solo Pomeriggio', description: 'Lezione solo al pomeriggio' },
    { value: 'both' as LessonType, label: 'Giornata Completa', description: 'Lezione mattina e pomeriggio' },
  ];

  return (
    <div className="lesson-type-selector">
      <div className="selector-header">
        <FiCalendar className="selector-icon" />
        <h3>Tipo di Lezione</h3>
      </div>
      
      <div className="lesson-options">
        {lessonOptions.map((option) => (
          <label
            key={option.value}
            className={`lesson-option ${lessonType === option.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="lessonType"
              value={option.value}
              checked={lessonType === option.value}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <div className="option-content">
              <span className="option-label">{option.label}</span>
              <span className="option-description">{option.description}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
