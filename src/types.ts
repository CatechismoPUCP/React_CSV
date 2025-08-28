/**
 * Represents a single Zoom participant entry from CSV data
 * Contains raw connection information for one session
 */
export interface ZoomParticipant {
  /** Full name of the participant */
  name: string;
  /** Email address of the participant */
  email: string;
  /** Timestamp when participant joined the session */
  joinTime: Date;
  /** Timestamp when participant left the session */
  leaveTime: Date;
  /** Duration of participation in minutes */
  duration: number;
  /** Whether the participant joined as a guest */
  isGuest: boolean;
  /** Whether this participant is the lesson organizer */
  isOrganizer?: boolean;
}

/**
 * Processed participant data with attendance calculations
 * Aggregates multiple Zoom sessions and calculates presence status
 */
export interface ProcessedParticipant {
  /** Full name of the participant */
  name: string;
  /** Email address of the participant */
  email: string;
  /** First join time in morning session */
  morningFirstJoin?: Date;
  /** Last leave time in morning session */
  morningLastLeave?: Date;
  /** First join time in afternoon session */
  afternoonFirstJoin?: Date;
  /** Last leave time in afternoon session */
  afternoonLastLeave?: Date;
  /** Total minutes absent during the lesson */
  totalAbsenceMinutes: number;
  /** Whether participant meets attendance requirements */
  isPresent: boolean;
  /** Explicitly marked as absent (overrides calculations) */
  isAbsent?: boolean;
  /** Whether this participant is the lesson organizer */
  isOrganizer?: boolean;
  /** All connection events organized by session */
  allConnections: {
    /** Morning session connections */
    morning: Array<{ joinTime: Date; leaveTime: Date; }>;
    /** Afternoon session connections */
    afternoon: Array<{ joinTime: Date; leaveTime: Date; }>;
  };
  /** Raw Zoom participant data organized by session */
  sessions: {
    /** Morning session participants */
    morning: ZoomParticipant[];
    /** Afternoon session participants */
    afternoon: ZoomParticipant[];
  };
  /** Alternative names/aliases for the same participant */
  aliases?: Array<{
    /** Alternative name used */
    name: string;
    /** Formatted connection list for this alias */
    connectionsList: string;
  }>;
}

/**
 * Complete lesson data structure for document generation
 * Contains all information needed to generate attendance reports
 */
export interface LessonData {
  /** Date when the lesson took place */
  date: Date;
  /** Subject or topic of the lesson */
  subject: string;
  /** Optional course identifier */
  courseId?: string;
  /** Array of processed participants (excluding organizer) */
  participants: ProcessedParticipant[];
  /** Optional lesson organizer data */
  organizer?: ProcessedParticipant;
  /** Type of lesson (morning, afternoon, both, fast) */
  lessonType: LessonType;
  /** Actual start time of the lesson */
  actualStartTime?: Date;
  /** Actual end time of the lesson */
  actualEndTime?: Date;
  /** Dynamic lesson hours calculated from participant data */
  lessonHours: number[];
}

/**
 * Data structure matching Word template placeholders
 * Contains formatted data ready for Word document generation
 * Supports up to 5 participants with morning/afternoon sessions
 */
export interface WordTemplateData {
  /** Day of the lesson (DD format) */
  day: string;
  /** Month of the lesson (MM format) */
  month: string;
  /** Year of the lesson (YYYY format) */
  year: string;
  /** Formatted lesson schedule (e.g., "09:00 - 13:00") */
  orariolezione: string;
  /** Lesson subject/topic */
  argomento: string;
  
  // Participant names (up to 5)
  /** First participant name */
  nome1?: string;
  /** Second participant name */
  nome2?: string;
  /** Third participant name */
  nome3?: string;
  /** Fourth participant name */
  nome4?: string;
  /** Fifth participant name */
  nome5?: string;
  
  // Morning session join times
  /** First participant morning join time */
  MattOraIn1?: string;
  /** Second participant morning join time */
  MattOraIn2?: string;
  /** Third participant morning join time */
  MattOraIn3?: string;
  /** Fourth participant morning join time */
  MattOraIn4?: string;
  /** Fifth participant morning join time */
  MattOraIn5?: string;
  
  // Morning session leave times
  /** First participant morning leave time */
  MattOraOut1?: string;
  /** Second participant morning leave time */
  MattOraOut2?: string;
  /** Third participant morning leave time */
  MattOraOut3?: string;
  /** Fourth participant morning leave time */
  MattOraOut4?: string;
  /** Fifth participant morning leave time */
  MattOraOut5?: string;
  
  // Afternoon session join times
  /** First participant afternoon join time */
  PomeOraIn1?: string;
  /** Second participant afternoon join time */
  PomeOraIn2?: string;
  /** Third participant afternoon join time */
  PomeOraIn3?: string;
  /** Fourth participant afternoon join time */
  PomeOraIn4?: string;
  /** Fifth participant afternoon join time */
  PomeOraIn5?: string;
  
  // Afternoon session leave times
  /** First participant afternoon leave time */
  PomeOraOut1?: string;
  /** Second participant afternoon leave time */
  PomeOraOut2?: string;
  /** Third participant afternoon leave time */
  PomeOraOut3?: string;
  /** Fourth participant afternoon leave time */
  PomeOraOut4?: string;
  /** Fifth participant afternoon leave time */
  PomeOraOut5?: string;
  
  // Presence status with detailed connection info
  /** First participant presence status and connections */
  presenza1?: string;
  /** Second participant presence status and connections */
  presenza2?: string;
  /** Third participant presence status and connections */
  presenza3?: string;
  /** Fourth participant presence status and connections */
  presenza4?: string;
  /** Fifth participant presence status and connections */
  presenza5?: string;
}

/**
 * Lesson type enumeration
 * Defines the different types of lessons supported
 */
export type LessonType = 
  /** Morning session only (typically 9:00-13:00) */
  | 'morning' 
  /** Afternoon session only (typically 14:00-18:00) */
  | 'afternoon' 
  /** Both morning and afternoon sessions */
  | 'both' 
  /** Fast mode - automatic detection of session times */
  | 'fast';

/**
 * CSV period classification
 * Used to automatically detect session timing from CSV data
 */
export type CSVPeriod = 
  /** Morning session (before 13:00) */
  | 'morning' 
  /** Afternoon session (after 13:00) */
  | 'afternoon' 
  /** Unable to determine session timing */
  | 'unknown';

/**
 * Analysis results from CSV file examination
 * Contains metadata about the session timing and participants
 */
export interface CSVAnalysis {
  /** Detected session period (morning/afternoon/unknown) */
  period: CSVPeriod;
  /** Earliest participant join time in the session */
  firstJoinTime: Date;
  /** Latest participant leave time in the session */
  lastLeaveTime: Date;
  /** Total number of participants found in CSV */
  participantCount: number;
}
