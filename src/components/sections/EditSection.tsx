import React from 'react';
import { FiDownload } from 'react-icons/fi';
import { ParticipantEditor } from '../ParticipantEditor';
import { AttendanceDashboard } from '../AttendanceDashboard';
import { DebugInfo } from '../DebugInfo';
import { ProcessedParticipant, LessonType, LessonData } from '../../types';
import { DateService } from '../../services/dateService';

interface EditSectionProps {
  participants: ProcessedParticipant[];
  organizer: ProcessedParticipant | null;
  onParticipantsChange: (participants: ProcessedParticipant[]) => void;
  setOrganizer: (organizer: ProcessedParticipant | null) => void;
  lessonType: LessonType;
  lessonHours: number[];
  morningFile: File | null;
  afternoonFile: File | null;
  subject: string;
  courseId: string;
  debugMode: boolean;
  setDebugMode: (debug: boolean) => void;
  onBack: () => void;
  onGenerateDocument: () => void;
  isGenerating: boolean;
}

export const EditSection: React.FC<EditSectionProps> = ({
  participants,
  organizer,
  onParticipantsChange,
  setOrganizer,
  lessonType,
  lessonHours,
  morningFile,
  afternoonFile,
  subject,
  courseId,
  debugMode,
  setDebugMode,
  onBack,
  onGenerateDocument,
  isGenerating,
}) => {
  const lessonDate = DateService.extractDateFromFilename(morningFile || afternoonFile);

  const lessonData: LessonData = {
    date: lessonDate,
    subject: subject,
    courseId: courseId.trim() || undefined,
    participants: participants,
    organizer: organizer || undefined,
    lessonType: lessonType,
    lessonHours: lessonHours
  };

  // Quickly set a participant as organizer, and return any previous organizer to the list
  const handleSetOrganizer = (participantIndex: number) => {
    if (participantIndex < 0 || participantIndex >= participants.length) return;

    const selected = participants[participantIndex];
    const rest = participants.filter((_, i) => i !== participantIndex);

    const newOrganizer: ProcessedParticipant = { ...selected, isOrganizer: true };

    // If there was a previous organizer, move them back into the list (without organizer flag)
    const updatedList = organizer
      ? [...rest, { ...organizer, isOrganizer: false }]
      : rest;

    onParticipantsChange(updatedList);
    setOrganizer(newOrganizer);
  };

  return (
    <div className="edit-section">
      <ParticipantEditor
        participants={participants}
        organizer={organizer || undefined}
        onParticipantsChange={onParticipantsChange}
        onSetOrganizer={handleSetOrganizer}
        lessonType={lessonType}
        lessonDate={lessonDate}
      />

      <AttendanceDashboard
        participants={participants}
        organizer={organizer || undefined}
        lessonType={lessonType}
        lessonHours={lessonHours}
        lessonDate={lessonDate}
      />

      {debugMode && (
        <DebugInfo 
          lessonData={lessonData}
          templateData={{}}
        />
      )}

      <div className="edit-actions">
        <button className="back-button" onClick={onBack}>
          Torna Indietro
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            checked={debugMode} 
            onChange={(e) => setDebugMode(e.target.checked)} 
          />
          Debug Mode
        </label>
        <button
          className="generate-button"
          onClick={onGenerateDocument}
          disabled={isGenerating}
        >
          <FiDownload size={20} />
          {isGenerating ? 'Generazione...' : 'Genera Registro Word'}
        </button>
      </div>
    </div>
  );
};
