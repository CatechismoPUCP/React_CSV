import React from 'react';
import { FiUsers, FiX } from 'react-icons/fi';

interface MergeControlsProps {
  mergeMode: boolean;
  selectedForMerge: number | null;
  participantCount: number;
  onToggleMergeMode: () => void;
  onCancelMerge: () => void;
}

export const MergeControls: React.FC<MergeControlsProps> = ({
  mergeMode,
  selectedForMerge,
  participantCount,
  onToggleMergeMode,
  onCancelMerge,
}) => {
  return (
    <div className="merge-controls">
      {!mergeMode ? (
        <button
          onClick={onToggleMergeMode}
          className="merge-toggle-btn"
          disabled={participantCount < 2}
          title="Unisci partecipanti con nomi diversi"
        >
          <FiUsers />
          Unisci Partecipanti
        </button>
      ) : (
        <div className="merge-active">
          <div className="merge-instructions">
            {selectedForMerge === null ? (
              <span>Seleziona il partecipante principale (destinazione)</span>
            ) : (
              <span>Ora clicca su un altro partecipante per unirlo</span>
            )}
          </div>
          <button
            onClick={onCancelMerge}
            className="cancel-merge-btn"
            title="Annulla unione"
          >
            <FiX />
            Annulla
          </button>
        </div>
      )}
    </div>
  );
};
