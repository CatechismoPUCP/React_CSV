import React, { useState } from 'react';
import { ProcessedParticipant } from '../types';
import { FiUsers, FiPlus, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

interface AliasManagerProps {
  participants: ProcessedParticipant[];
  onMergeParticipants: (primaryIndex: number, aliasIndices: number[]) => void;
}

interface AliasGroup {
  primaryIndex: number;
  aliasIndices: number[];
  primaryName: string;
  aliasNames: string[];
}

export const AliasManager: React.FC<AliasManagerProps> = ({
  participants,
  onMergeParticipants
}) => {
  const [aliasGroups, setAliasGroups] = useState<AliasGroup[]>([]);
  const [newGroup, setNewGroup] = useState<{
    primaryIndex: number | null;
    aliasIndices: number[];
  }>({
    primaryIndex: null,
    aliasIndices: []
  });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const getAvailableParticipants = () => {
    const usedIndices = new Set<number>();
    aliasGroups.forEach(group => {
      usedIndices.add(group.primaryIndex);
      group.aliasIndices.forEach(index => usedIndices.add(index));
    });
    
    if (newGroup.primaryIndex !== null) {
      usedIndices.add(newGroup.primaryIndex);
    }
    newGroup.aliasIndices.forEach(index => usedIndices.add(index));

    return participants
      .map((participant, index) => ({ participant, index }))
      .filter(({ index }) => !usedIndices.has(index));
  };

  const startNewGroup = () => {
    setIsCreatingGroup(true);
    setNewGroup({ primaryIndex: null, aliasIndices: [] });
  };

  const cancelNewGroup = () => {
    setIsCreatingGroup(false);
    setNewGroup({ primaryIndex: null, aliasIndices: [] });
  };

  const confirmNewGroup = () => {
    if (newGroup.primaryIndex !== null && newGroup.aliasIndices.length > 0) {
      const primaryParticipant = participants[newGroup.primaryIndex];
      const aliasNames = newGroup.aliasIndices.map(index => participants[index].name);
      
      const group: AliasGroup = {
        primaryIndex: newGroup.primaryIndex,
        aliasIndices: newGroup.aliasIndices,
        primaryName: primaryParticipant.name,
        aliasNames
      };
      
      setAliasGroups([...aliasGroups, group]);
      setIsCreatingGroup(false);
      setNewGroup({ primaryIndex: null, aliasIndices: [] });
    }
  };

  const removeGroup = (groupIndex: number) => {
    setAliasGroups(aliasGroups.filter((_, index) => index !== groupIndex));
  };

  const applyMerges = () => {
    aliasGroups.forEach(group => {
      onMergeParticipants(group.primaryIndex, group.aliasIndices);
    });
    setAliasGroups([]);
  };

  const setPrimary = (index: number) => {
    setNewGroup({ ...newGroup, primaryIndex: index });
  };

  const toggleAlias = (index: number) => {
    const isSelected = newGroup.aliasIndices.includes(index);
    if (isSelected) {
      setNewGroup({
        ...newGroup,
        aliasIndices: newGroup.aliasIndices.filter(i => i !== index)
      });
    } else {
      setNewGroup({
        ...newGroup,
        aliasIndices: [...newGroup.aliasIndices, index]
      });
    }
  };

  const availableParticipants = getAvailableParticipants();

  return (
    <div className="alias-manager">
      <div className="alias-manager-header">
        <h3>
          <FiUsers className="icon" />
          Gestione Alias Partecipanti
        </h3>
        <p className="alias-description">
          Unisci i partecipanti che hanno utilizzato nomi diversi durante la sessione.
          Tutte le connessioni e disconnessioni verranno conservate nel registro finale.
        </p>
      </div>

      {aliasGroups.length > 0 && (
        <div className="alias-groups">
          <h4>Gruppi di Alias Configurati:</h4>
          {aliasGroups.map((group, index) => (
            <div key={index} className="alias-group">
              <div className="alias-group-content">
                <strong>{group.primaryName}</strong>
                <span className="alias-arrow">←</span>
                <span className="alias-list">
                  {group.aliasNames.join(', ')}
                </span>
              </div>
              <button
                className="remove-group-btn"
                onClick={() => removeGroup(index)}
                title="Rimuovi gruppo"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          <button className="apply-merges-btn" onClick={applyMerges}>
            <FiCheck className="icon" />
            Applica Unioni
          </button>
        </div>
      )}

      {!isCreatingGroup ? (
        <button className="create-group-btn" onClick={startNewGroup}>
          <FiPlus className="icon" />
          Crea Nuovo Gruppo di Alias
        </button>
      ) : (
        <div className="new-group-creator">
          <h4>Crea Nuovo Gruppo di Alias</h4>
          
          <div className="step">
            <h5>1. Seleziona il partecipante principale:</h5>
            <div className="participant-list">
              {availableParticipants.map(({ participant, index }) => (
                <button
                  key={index}
                  className={`participant-option ${newGroup.primaryIndex === index ? 'selected primary' : ''}`}
                  onClick={() => setPrimary(index)}
                >
                  {participant.name} ({participant.email})
                </button>
              ))}
            </div>
          </div>

          {newGroup.primaryIndex !== null && (
            <div className="step">
              <h5>2. Seleziona gli alias da unire:</h5>
              <div className="participant-list">
                {availableParticipants
                  .filter(({ index }) => index !== newGroup.primaryIndex)
                  .map(({ participant, index }) => (
                    <button
                      key={index}
                      className={`participant-option ${newGroup.aliasIndices.includes(index) ? 'selected alias' : ''}`}
                      onClick={() => toggleAlias(index)}
                    >
                      {participant.name} ({participant.email})
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="new-group-actions">
            <button
              className="confirm-group-btn"
              onClick={confirmNewGroup}
              disabled={newGroup.primaryIndex === null || newGroup.aliasIndices.length === 0}
            >
              <FiCheck className="icon" />
              Conferma Gruppo
            </button>
            <button className="cancel-group-btn" onClick={cancelNewGroup}>
              <FiX className="icon" />
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
