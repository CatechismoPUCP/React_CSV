import React from 'react';
import { FiUsers, FiX } from 'react-icons/fi';

interface MergeControlsProps {
  mergeMode: boolean;
  selectedForMerge: number | null;
  participantCount: number;
  onToggleMergeMode: () => void;
  onCancelMerge: () => void;
  canConfirm?: boolean;
  onConfirmMerge?: () => void;
}

export const MergeControls: React.FC<MergeControlsProps> = ({
  mergeMode,
  selectedForMerge,
  participantCount,
  onToggleMergeMode,
  onCancelMerge,
  canConfirm = false,
  onConfirmMerge,
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
              <span>Seleziona altri partecipanti da unire e conferma</span>
            )}
          </div>
          {onConfirmMerge && (
            <button
              onClick={onConfirmMerge}
              className="confirm-merge-btn"
              title="Conferma unione"
              disabled={!canConfirm}
            >
              Conferma Unione
            </button>
          )}
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
