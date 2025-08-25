import { useState, useCallback } from 'react';
import { ProcessedParticipant } from '../types';
import { ParticipantService } from '../services/participantService';

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
    if (targetIndex === sourceIndex) return;

    const updated = [...initialParticipants];
    const target = updated[targetIndex];
    const source = updated[sourceIndex];

    // Merge using centralized, order-independent logic
    const mergedParticipant: ProcessedParticipant = ParticipantService.mergeParticipants(target, source);

    // Update the target and remove the source
    updated[targetIndex] = mergedParticipant;
    updated.splice(sourceIndex, 1);

    onParticipantsChange(updated);

    // Keep merge mode active for multi-merge; maintain selection on the (possibly shifted) target index
    setMergeMode(true);
    setSelectedForMerge(prev => {
      if (prev === null) return null;
      let newTargetIndex = targetIndex;
      if (sourceIndex < targetIndex) newTargetIndex = targetIndex - 1;
      return newTargetIndex;
    });
  }, [initialParticipants, onParticipantsChange]);

  const handleMergeSelection = useCallback((clickedIndex: number) => {
    if (!mergeMode) return;

    if (selectedForMerge === null) {
      // First click: select the anchor participant (no hierarchy in result)
      setSelectedForMerge(clickedIndex);
    } else {
      // Second and subsequent clicks: merge the clicked participant into the selected anchor
      mergeParticipants(selectedForMerge, clickedIndex);
    }
  }, [mergeMode, selectedForMerge, mergeParticipants]);

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
