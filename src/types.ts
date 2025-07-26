export interface ZoomParticipant {
  name: string;
  email: string;
  joinTime: Date;
  leaveTime: Date;
  duration: number;
  isGuest: boolean;
}

export interface ProcessedParticipant {
  name: string;
  email: string;
  morningFirstJoin?: Date;
  morningLastLeave?: Date;
  afternoonFirstJoin?: Date;
  afternoonLastLeave?: Date;
  totalAbsenceMinutes: number;
  isPresent: boolean;
  sessions: {
    morning: ZoomParticipant[];
    afternoon: ZoomParticipant[];
  };
}

export interface LessonData {
  date: Date;
  subject: string;
  courseId: string;
  participants: ProcessedParticipant[];
  lessonType: 'morning' | 'afternoon' | 'both';
  startTime?: Date;
  endTime?: Date;
}

export interface WordTemplateData {
  day: string;
  month: string;
  year: string;
  orariolezione: string;
  argomento: string;
  nome1?: string;
  nome2?: string;
  nome3?: string;
  nome4?: string;
  nome5?: string;
  MattOraIn1?: string;
  MattOraIn2?: string;
  MattOraIn3?: string;
  MattOraIn4?: string;
  MattOraIn5?: string;
  MattOraOut1?: string;
  MattOraOut2?: string;
  MattOraOut3?: string;
  MattOraOut4?: string;
  MattOraOut5?: string;
  PomeOraIn1?: string;
  PomeOraIn2?: string;
  PomeOraIn3?: string;
  PomeOraIn4?: string;
  PomeOraIn5?: string;
  PomeOraOut1?: string;
  PomeOraOut2?: string;
  PomeOraOut3?: string;
  PomeOraOut4?: string;
  PomeOraOut5?: string;
  presenza1?: string;
  presenza2?: string;
  presenza3?: string;
  presenza4?: string;
  presenza5?: string;
}

export type LessonType = 'morning' | 'afternoon' | 'both';
