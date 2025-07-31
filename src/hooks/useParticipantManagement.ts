import { useState, useCallback } from 'react';
import { ProcessedParticipant } from '../types';

export const useParticipantManagement = (
  initialParticipants: ProcessedParticipant[],
  onParticipantsChange: (participants: ProcessedParticipant[]) => void
) => {
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<number | null>(null);

  const togglePresence = useCallback((index: number) => {
    const updatedParticipants = [...initialParticipants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      isPresent: !updatedParticipants[index].isPresent
    };
    onParticipantsChange(updatedParticipants);
  }, [initialParticipants, onParticipantsChange]);

  const removeParticipant = useCallback((index: number) => {
    const updatedParticipants = initialParticipants.filter((_, i) => i !== index);
    onParticipantsChange(updatedParticipants);
  }, [initialParticipants, onParticipantsChange]);

  const moveParticipant = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= initialParticipants.length) return;
    
    const updatedParticipants = [...initialParticipants];
    const [movedParticipant] = updatedParticipants.splice(fromIndex, 1);
    updatedParticipants.splice(toIndex, 0, movedParticipant);
    onParticipantsChange(updatedParticipants);
  }, [initialParticipants, onParticipantsChange]);

  const moveUp = useCallback((index: number) => {
    moveParticipant(index, index - 1);
  }, [moveParticipant]);

  const moveDown = useCallback((index: number) => {
    moveParticipant(index, index + 1);
  }, [moveParticipant]);

  const toggleMergeMode = useCallback(() => {
    setMergeMode(!mergeMode);
    setSelectedForMerge(null);
  }, [mergeMode]);

  const cancelMerge = useCallback(() => {
    setMergeMode(false);
    setSelectedForMerge(null);
  }, []);

  const mergeParticipants = useCallback((targetIndex: number, sourceIndex: number) => {
    const updatedParticipants = [...initialParticipants];
    const target = updatedParticipants[targetIndex];
    const source = updatedParticipants[sourceIndex];

    // Merge the source into the target
    const mergedParticipant: ProcessedParticipant = {
      ...target,
      aliases: [
        ...(target.aliases || []),
        {
          name: source.name,
          connectionsList: [...source.allConnections.morning, ...source.allConnections.afternoon]
            .map(conn => `${conn.joinTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}-${conn.leaveTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
            .join('; ')
        },
        ...(source.aliases || [])
      ]
    };

    // Update the target and remove the source
    updatedParticipants[targetIndex] = mergedParticipant;
    updatedParticipants.splice(sourceIndex, 1);

    onParticipantsChange(updatedParticipants);
    setMergeMode(false);
    setSelectedForMerge(null);
  }, [initialParticipants, onParticipantsChange]);

  const handleMergeSelection = useCallback((clickedIndex: number) => {
    if (selectedForMerge === null) {
      // First click: select the target participant
      setSelectedForMerge(clickedIndex);
    } else {
      // Second click: merge the clicked participant into the selected one
      mergeParticipants(selectedForMerge, clickedIndex);
    }
  }, [selectedForMerge, mergeParticipants]);

  return {
    mergeMode,
    selectedForMerge,
    togglePresence,
    removeParticipant,
    moveUp,
    moveDown,
    toggleMergeMode,
    cancelMerge,
    handleMergeSelection,
  };
};
