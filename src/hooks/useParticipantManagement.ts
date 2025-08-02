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

    // Combine all connections from both participants
    const combinedMorningConnections = [
      ...target.allConnections.morning,
      ...source.allConnections.morning
    ].sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());

    const combinedAfternoonConnections = [
      ...target.allConnections.afternoon,
      ...source.allConnections.afternoon
    ].sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());

    // Combine all sessions from both participants
    const combinedMorningSessions = [
      ...target.sessions.morning,
      ...source.sessions.morning
    ].sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());

    const combinedAfternoonSessions = [
      ...target.sessions.afternoon,
      ...source.sessions.afternoon
    ].sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());

    // Calculate new absence minutes based on combined connections
    const allCombinedConnections = [...combinedMorningConnections, ...combinedAfternoonConnections];
    const totalConnectedMinutes = allCombinedConnections.reduce((total, conn) => {
      return total + Math.max(0, (conn.leaveTime.getTime() - conn.joinTime.getTime()) / (1000 * 60));
    }, 0);
    
    // Calculate actual lesson duration based on the original participants' data
    // Use the minimum absence minutes from both participants as the baseline
    const targetOriginalAbsence = target.totalAbsenceMinutes;
    const sourceOriginalAbsence = source.totalAbsenceMinutes;
    
    // If one participant was completely absent (999+ minutes), use the other's calculation
    let newAbsenceMinutes: number;
    if (targetOriginalAbsence >= 999 && sourceOriginalAbsence < 999) {
      // Target was absent, use source's presence calculation
      newAbsenceMinutes = sourceOriginalAbsence;
    } else if (sourceOriginalAbsence >= 999 && targetOriginalAbsence < 999) {
      // Source was absent, use target's presence calculation
      newAbsenceMinutes = targetOriginalAbsence;
    } else if (targetOriginalAbsence >= 999 && sourceOriginalAbsence >= 999) {
      // Both were absent, keep as absent
      newAbsenceMinutes = 999;
    } else {
      // Both have connections, calculate based on combined time
      // Use the better (lower) absence time of the two
      newAbsenceMinutes = Math.min(targetOriginalAbsence, sourceOriginalAbsence);
    }

    // Create merged participant with combined data
    const mergedParticipant: ProcessedParticipant = {
      ...target,
      // Update connection data with combined connections
      allConnections: {
        morning: combinedMorningConnections,
        afternoon: combinedAfternoonConnections
      },
      sessions: {
        morning: combinedMorningSessions,
        afternoon: combinedAfternoonSessions
      },
      // Update timing data based on combined connections
      morningFirstJoin: combinedMorningConnections.length > 0 ? combinedMorningConnections[0].joinTime : target.morningFirstJoin,
      morningLastLeave: combinedMorningConnections.length > 0 ? combinedMorningConnections[combinedMorningConnections.length - 1].leaveTime : target.morningLastLeave,
      afternoonFirstJoin: combinedAfternoonConnections.length > 0 ? combinedAfternoonConnections[0].joinTime : target.afternoonFirstJoin,
      afternoonLastLeave: combinedAfternoonConnections.length > 0 ? combinedAfternoonConnections[combinedAfternoonConnections.length - 1].leaveTime : target.afternoonLastLeave,
      // Update absence calculation
      totalAbsenceMinutes: newAbsenceMinutes,
      isPresent: newAbsenceMinutes <= 15, // Present if absent 15 minutes or less
      isAbsent: newAbsenceMinutes > 15,
      // Merge aliases
      aliases: [
        ...(target.aliases || []),
        {
          name: source.name,
          connectionsList: [...source.allConnections.morning, ...source.allConnections.afternoon]
            .map(conn => `${conn.joinTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}-${conn.leaveTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
            .join('; ')
        },
        // Include all aliases from the source participant (handles already merged participants)
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
