import React from 'react';
import { ProcessedParticipant, LessonType } from '../types';
import { FiClock, FiLogIn, FiLogOut, FiUser } from 'react-icons/fi';

interface ConnectionsLogProps {
  participants: ProcessedParticipant[];
  organizer?: ProcessedParticipant;
  lessonType: LessonType;
  lessonDate: Date;
}

interface ConnectionEvent {
  participantName: string;
  participantEmail: string;
  time: Date;
  type: 'join' | 'leave';
  session: 'morning' | 'afternoon';
  isOrganizer: boolean;
}

export const ConnectionsLog: React.FC<ConnectionsLogProps> = ({
  participants,
  organizer,
  lessonType,
  lessonDate
}) => {
  const getAllConnectionEvents = (): ConnectionEvent[] => {
    const events: ConnectionEvent[] = [];
    
    // Include organizer in participants for logging
    const allParticipants = organizer ? [organizer, ...participants] : participants;
    
    allParticipants.forEach(participant => {
      // Morning connections
      if (lessonType === 'morning' || lessonType === 'both') {
        participant.allConnections.morning.forEach(connection => {
          events.push({
            participantName: participant.name,
            participantEmail: participant.email,
            time: connection.joinTime,
            type: 'join',
            session: 'morning',
            isOrganizer: participant.isOrganizer || false
          });
          events.push({
            participantName: participant.name,
            participantEmail: participant.email,
            time: connection.leaveTime,
            type: 'leave',
            session: 'morning',
            isOrganizer: participant.isOrganizer || false
          });
        });
      }
      
      // Afternoon connections
      if (lessonType === 'afternoon' || lessonType === 'both') {
        participant.allConnections.afternoon.forEach(connection => {
          events.push({
            participantName: participant.name,
            participantEmail: participant.email,
            time: connection.joinTime,
            type: 'join',
            session: 'afternoon',
            isOrganizer: participant.isOrganizer || false
          });
          events.push({
            participantName: participant.name,
            participantEmail: participant.email,
            time: connection.leaveTime,
            type: 'leave',
            session: 'afternoon',
            isOrganizer: participant.isOrganizer || false
          });
        });
      }
    });
    
    // Sort by time
    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };



  const getEventIcon = (type: 'join' | 'leave') => {
    return type === 'join' ? <FiLogIn className="join-icon" /> : <FiLogOut className="leave-icon" />;
  };

  const events = getAllConnectionEvents();
  const morningEvents = events.filter(e => e.session === 'morning');
  const afternoonEvents = events.filter(e => e.session === 'afternoon');

  return (
    <div className="connections-log">
      <div className="connections-header">
        <h3>
          <FiClock className="icon" />
          Registro Completo Connessioni
        </h3>
        <p className="log-date">{formatDate(lessonDate)}</p>
        <div className="absence-rule">
          <strong>Nota:</strong> La presenza è valida per un massimo di 15 minuti di assenza consecutiva.
        </div>
      </div>

      {(lessonType === 'morning' || lessonType === 'both') && morningEvents.length > 0 && (
        <div className="session-log">
          <h4 className="session-title">
            <span className="session-badge morning">Sessione Mattina</span>
            <span className="event-count">({morningEvents.length} eventi)</span>
          </h4>
          <div className="events-list">
            {morningEvents.map((event, index) => (
              <div key={`morning-${index}`} className={`event-item ${event.type} ${event.isOrganizer ? 'organizer' : ''}`}>
                <div className="event-time">
                  {formatTime(event.time)}
                </div>
                <div className="event-icon">
                  {getEventIcon(event.type)}
                </div>
                <div className="event-details">
                  <div className="participant-info">
                    <span className="participant-name">
                      {event.participantName}
                      {event.isOrganizer && <span className="organizer-badge">Organizzatore</span>}
                    </span>
                    <span className="participant-email">{event.participantEmail}</span>
                  </div>
                  <div className="event-action">
                    {event.type === 'join' ? 'Entrato nella sessione' : 'Uscito dalla sessione'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(lessonType === 'afternoon' || lessonType === 'both') && afternoonEvents.length > 0 && (
        <div className="session-log">
          <h4 className="session-title">
            <span className="session-badge afternoon">Sessione Pomeriggio</span>
            <span className="event-count">({afternoonEvents.length} eventi)</span>
          </h4>
          <div className="events-list">
            {afternoonEvents.map((event, index) => (
              <div key={`afternoon-${index}`} className={`event-item ${event.type} ${event.isOrganizer ? 'organizer' : ''}`}>
                <div className="event-time">
                  {formatTime(event.time)}
                </div>
                <div className="event-icon">
                  {getEventIcon(event.type)}
                </div>
                <div className="event-details">
                  <div className="participant-info">
                    <span className="participant-name">
                      {event.participantName}
                      {event.isOrganizer && <span className="organizer-badge">Organizzatore</span>}
                    </span>
                    <span className="participant-email">{event.participantEmail}</span>
                  </div>
                  <div className="event-action">
                    {event.type === 'join' ? 'Entrato nella sessione' : 'Uscito dalla sessione'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="no-events">
          <FiUser className="icon" />
          <p>Nessun evento di connessione registrato</p>
        </div>
      )}
    </div>
  );
};
