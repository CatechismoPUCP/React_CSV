import React from 'react';
import { ProcessedParticipant, LessonType } from '../types';
import { FiClock, FiLogIn, FiLogOut, FiUser } from 'react-icons/fi';

/**
 * Props for the ConnectionsLog component
 */
interface ConnectionsLogProps {
  /** Array of processed participants with their connection data */
  participants: ProcessedParticipant[];
  /** Optional organizer participant data */
  organizer?: ProcessedParticipant;
  /** Type of lesson (morning, afternoon, both, or fast) */
  lessonType: LessonType;
  /** Date when the lesson took place */
  lessonDate: Date;
}

/**
 * Represents a single connection event (join or leave) in the lesson
 */
interface ConnectionEvent {
  /** Full name of the participant */
  participantName: string;
  /** Email address of the participant */
  participantEmail: string;
  /** Timestamp when the event occurred */
  time: Date;
  /** Type of connection event */
  type: 'join' | 'leave';
  /** Session period when the event occurred */
  session: 'morning' | 'afternoon';
  /** Whether this participant is the lesson organizer */
  isOrganizer: boolean;
}

/**
 * ConnectionsLog Component
 * 
 * Displays a chronological log of all participant connection events (joins and leaves)
 * during a lesson. Shows separate sections for morning and afternoon sessions.
 * 
 * Features:
 * - Chronological event timeline
 * - Session-based organization (morning/afternoon)
 * - Organizer identification
 * - Event count statistics
 * - Italian localization
 */
export const ConnectionsLog: React.FC<ConnectionsLogProps> = ({
  participants,
  organizer,
  lessonType,
  lessonDate
}) => {
  /**
   * Aggregates all connection events from participants and organizer
   * Creates a chronological list of join/leave events for display
   * 
   * @returns Array of connection events sorted by timestamp
   */
  const getAllConnectionEvents = (): ConnectionEvent[] => {
    const events: ConnectionEvent[] = [];
    
    // Combine organizer with regular participants for comprehensive logging
    const allParticipants = organizer ? [organizer, ...participants] : participants;
    
    allParticipants.forEach(participant => {
      // Process morning session connections
      if (shouldIncludeMorningSession(lessonType)) {
        participant.allConnections.morning.forEach(connection => {
          // Add join event
          events.push(createConnectionEvent(
            participant, connection.joinTime, 'join', 'morning'
          ));
          // Add leave event
          events.push(createConnectionEvent(
            participant, connection.leaveTime, 'leave', 'morning'
          ));
        });
      }
      
      // Process afternoon session connections
      if (shouldIncludeAfternoonSession(lessonType)) {
        participant.allConnections.afternoon.forEach(connection => {
          // Add join event
          events.push(createConnectionEvent(
            participant, connection.joinTime, 'join', 'afternoon'
          ));
          // Add leave event
          events.push(createConnectionEvent(
            participant, connection.leaveTime, 'leave', 'afternoon'
          ));
        });
      }
    });
    
    // Sort events chronologically for timeline display
    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  };

  /**
   * Helper function to create a connection event object
   * 
   * @param participant - The participant data
   * @param time - When the event occurred
   * @param type - Whether it's a join or leave event
   * @param session - Which session (morning/afternoon)
   * @returns Formatted connection event object
   */
  const createConnectionEvent = (
    participant: ProcessedParticipant,
    time: Date,
    type: 'join' | 'leave',
    session: 'morning' | 'afternoon'
  ): ConnectionEvent => ({
    participantName: participant.name,
    participantEmail: participant.email,
    time,
    type,
    session,
    isOrganizer: participant.isOrganizer || false
  });

  /**
   * Determines if morning session should be included based on lesson type
   */
  const shouldIncludeMorningSession = (lessonType: LessonType): boolean => {
    return lessonType === 'morning' || lessonType === 'both';
  };

  /**
   * Determines if afternoon session should be included based on lesson type
   */
  const shouldIncludeAfternoonSession = (lessonType: LessonType): boolean => {
    return lessonType === 'afternoon' || lessonType === 'both';
  };

  /**
   * Formats time in Italian locale with seconds precision
   * 
   * @param date - Date object to format
   * @returns Formatted time string (HH:MM:SS)
   */
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * Formats date in Italian locale with full details
   * 
   * @param date - Date object to format
   * @returns Formatted date string (e.g., "lunedì 8 luglio 2025")
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /**
   * Returns appropriate icon component for connection event type
   * 
   * @param type - Type of connection event
   * @returns React icon component with appropriate styling
   */
  const getEventIcon = (type: 'join' | 'leave'): JSX.Element => {
    return type === 'join' 
      ? <FiLogIn className="join-icon" /> 
      : <FiLogOut className="leave-icon" />;
  };

  // Generate and filter events by session
  const events = getAllConnectionEvents();
  const morningEvents = events.filter(e => e.session === 'morning');
  const afternoonEvents = events.filter(e => e.session === 'afternoon');

  return (
    <div className="connections-log">
      {/* Header section with title, date, and attendance rules */}
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

      {/* Morning session events */}
      {shouldIncludeMorningSession(lessonType) && morningEvents.length > 0 && (
        <SessionEventsList 
          events={morningEvents}
          sessionType="morning"
          sessionTitle="Sessione Mattina"
          formatTime={formatTime}
          getEventIcon={getEventIcon}
        />
      )}

      {/* Afternoon session events */}
      {shouldIncludeAfternoonSession(lessonType) && afternoonEvents.length > 0 && (
        <SessionEventsList 
          events={afternoonEvents}
          sessionType="afternoon"
          sessionTitle="Sessione Pomeriggio"
          formatTime={formatTime}
          getEventIcon={getEventIcon}
        />
      )}

      {/* Empty state when no events are found */}
      {events.length === 0 && (
        <EmptyEventsState />
      )}
    </div>
  );
};

/**
 * Props for the SessionEventsList component
 */
interface SessionEventsListProps {
  events: ConnectionEvent[];
  sessionType: 'morning' | 'afternoon';
  sessionTitle: string;
  formatTime: (date: Date) => string;
  getEventIcon: (type: 'join' | 'leave') => JSX.Element;
}

/**
 * Renders a list of connection events for a specific session
 * Extracted as a separate component to reduce code duplication
 */
const SessionEventsList: React.FC<SessionEventsListProps> = ({
  events,
  sessionType,
  sessionTitle,
  formatTime,
  getEventIcon
}) => (
  <div className="session-log">
    <h4 className="session-title">
      <span className={`session-badge ${sessionType}`}>{sessionTitle}</span>
      <span className="event-count">({events.length} eventi)</span>
    </h4>
    <div className="events-list">
      {events.map((event, index) => (
        <EventItem
          key={`${sessionType}-${index}`}
          event={event}
          formatTime={formatTime}
          getEventIcon={getEventIcon}
        />
      ))}
    </div>
  </div>
);

/**
 * Props for the EventItem component
 */
interface EventItemProps {
  event: ConnectionEvent;
  formatTime: (date: Date) => string;
  getEventIcon: (type: 'join' | 'leave') => JSX.Element;
}

/**
 * Renders a single connection event item
 * Shows time, icon, participant info, and action description
 */
const EventItem: React.FC<EventItemProps> = ({ event, formatTime, getEventIcon }) => (
  <div className={`event-item ${event.type} ${event.isOrganizer ? 'organizer' : ''}`}>
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
);

/**
 * Empty state component when no connection events are found
 */
const EmptyEventsState: React.FC = () => (
  <div className="no-events">
    <FiUser className="icon" />
    <p>Nessun evento di connessione registrato</p>
  </div>
);
