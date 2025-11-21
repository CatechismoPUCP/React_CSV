import { useState, useCallback } from 'react';
import { ProcessedParticipant } from '../types';
import { ParticipantService } from '../services/participantService';

export const useParticipantManagement = (
  initialParticipants: ProcessedParticipant[],
  onParticipantsChange: (participants: ProcessedParticipant[]) => void
) => {
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<number | null>(null);
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());

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
    setSelectedSources(new Set());
  }, [mergeMode]);

  const cancelMerge = useCallback(() => {
    setMergeMode(false);
    setSelectedForMerge(null);
    setSelectedSources(new Set());
  }, []);

  const confirmMerge = useCallback(() => {
    if (selectedForMerge === null || selectedSources.size === 0) return;

    let updated = [...initialParticipants];
    let anchorIndex = selectedForMerge;

    const sourcesSorted = Array.from(selectedSources).filter(i => i !== anchorIndex).sort((a, b) => a - b);
    for (const sourceIndex of sourcesSorted) {
      if (sourceIndex === anchorIndex) continue;
      const target = updated[anchorIndex];
      const source = updated[sourceIndex];
      const mergedParticipant: ProcessedParticipant = ParticipantService.mergeParticipants(target, source);
      updated[anchorIndex] = mergedParticipant;
      updated.splice(sourceIndex, 1);
      if (sourceIndex < anchorIndex) anchorIndex -= 1;
    }

    onParticipantsChange(updated);
    setMergeMode(false);
    setSelectedForMerge(null);
    setSelectedSources(new Set());
  }, [initialParticipants, onParticipantsChange, selectedForMerge, selectedSources]);

  const handleMergeSelection = useCallback((clickedIndex: number) => {
    if (!mergeMode) return;

    if (selectedForMerge === null) {
      setSelectedForMerge(clickedIndex);
    } else {
      setSelectedSources(prev => {
        const next = new Set(prev);
        if (next.has(clickedIndex)) next.delete(clickedIndex); else next.add(clickedIndex);
        return next;
      });
    }
  }, [mergeMode, selectedForMerge]);

  return {
    mergeMode,
    selectedForMerge,
    selectedSources,
    togglePresence,
    removeParticipant,
    moveUp,
    moveDown,
    toggleMergeMode,
    cancelMerge,
    handleMergeSelection,
    confirmMerge,
  };
};
