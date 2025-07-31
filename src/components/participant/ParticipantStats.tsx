import React from 'react';
import { ProcessedParticipant } from '../../types';
import { FiUsers, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';

interface ParticipantStatsProps {
  participants: ProcessedParticipant[];
  organizer?: ProcessedParticipant;
}

export const ParticipantStats: React.FC<ParticipantStatsProps> = ({
  participants,
  organizer,
}) => {
  const presentCount = participants.filter(p => p.isPresent).length;
  const absentCount = participants.length - presentCount;
  const totalParticipants = participants.length + (organizer ? 1 : 0);

  return (
    <div className="participant-stats">
      <div className="stats-grid">
        <div className="stat-item">
          <FiUsers className="stat-icon" />
          <div className="stat-content">
            <span className="stat-number">{totalParticipants}</span>
            <span className="stat-label">Totale</span>
          </div>
        </div>
        
        <div className="stat-item present">
          <FiCheckCircle className="stat-icon" />
          <div className="stat-content">
            <span className="stat-number">{presentCount + (organizer ? 1 : 0)}</span>
            <span className="stat-label">Presenti</span>
          </div>
        </div>
        
        <div className="stat-item absent">
          <FiXCircle className="stat-icon" />
          <div className="stat-content">
            <span className="stat-number">{absentCount}</span>
            <span className="stat-label">Assenti</span>
          </div>
        </div>
      </div>

      {absentCount > 0 && (
        <div className="absence-warning">
          <FiAlertTriangle className="warning-icon" />
          <span>
            Ricorda: assenze superiori a 15 minuti devono essere giustificate
          </span>
        </div>
      )}
    </div>
  );
};
