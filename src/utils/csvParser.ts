import Papa from 'papaparse';
import { ZoomParticipant, ProcessedParticipant } from '../types';

export const parseZoomCSV = (csvContent: string): ZoomParticipant[] => {
  const lines = csvContent.split('\n');
  
  // Find the start of participant data (line with "Nome (nome originale)")
  let participantStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nome (nome originale)')) {
      participantStartIndex = i;
      break;
    }
  }
  
  if (participantStartIndex === -1) {
    throw new Error('Formato CSV non valido: impossibile trovare la sezione partecipanti');
  }
  
  // Extract participant data
  const participantData = lines.slice(participantStartIndex).join('\n');
  
  const result = Papa.parse(participantData, {
    header: true,
    skipEmptyLines: true,
  });
  
  if (result.errors.length > 0) {
    console.warn('Errori durante il parsing CSV:', result.errors);
  }
  
  return result.data.map((row: any) => ({
    name: cleanParticipantName(row['Nome (nome originale)'] || ''),
    email: row['E-mail'] || '',
    joinTime: parseZoomDateTime(row['Ora di ingresso']),
    leaveTime: parseZoomDateTime(row['Ora di uscita']),
    duration: parseInt(row['Durata (minuti)']) || 0,
    isGuest: row['Guest'] === 'Sì',
  })).filter(p => p.name && p.joinTime && p.leaveTime);
};

const cleanParticipantName = (name: string): string => {
  // Remove organizer info in parentheses
  return name.replace(/\s*\([^)]*\)$/, '').trim();
};

const parseZoomDateTime = (dateTimeStr: string): Date => {
  // Format: "08/07/2025 09:02:37 AM"
  if (!dateTimeStr) return new Date();
  
  try {
    // Convert to a format that Date can parse
    const [datePart, timePart, ampm] = dateTimeStr.split(' ');
    const [month, day, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    
    let hour24 = parseInt(hours);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      hour24,
      parseInt(minutes),
      parseInt(seconds)
    );
  } catch (error) {
    console.error('Errore parsing data:', dateTimeStr, error);
    return new Date();
  }
};

export const processParticipants = (
  morningParticipants: ZoomParticipant[],
  afternoonParticipants: ZoomParticipant[]
): ProcessedParticipant[] => {
  const participantMap = new Map<string, ProcessedParticipant>();
  
  // Process morning participants
  morningParticipants.forEach(participant => {
    const key = participant.name.toLowerCase();
    if (!participantMap.has(key)) {
      participantMap.set(key, {
        name: participant.name,
        email: participant.email,
        totalAbsenceMinutes: 0,
        isPresent: false,
        sessions: {
          morning: [],
          afternoon: []
        }
      });
    }
    participantMap.get(key)!.sessions.morning.push(participant);
  });
  
  // Process afternoon participants
  afternoonParticipants.forEach(participant => {
    const key = participant.name.toLowerCase();
    if (!participantMap.has(key)) {
      participantMap.set(key, {
        name: participant.name,
        email: participant.email,
        totalAbsenceMinutes: 0,
        isPresent: false,
        sessions: {
          morning: [],
          afternoon: []
        }
      });
    }
    participantMap.get(key)!.sessions.afternoon.push(participant);
  });
  
  // Calculate attendance for each participant
  const processed = Array.from(participantMap.values()).map(participant => {
    return calculateAttendance(participant);
  });
  
  return processed.sort((a, b) => a.name.localeCompare(b.name));
};

const calculateAttendance = (participant: ProcessedParticipant): ProcessedParticipant => {
  const morning = participant.sessions.morning;
  const afternoon = participant.sessions.afternoon;
  
  // Calculate morning session times
  if (morning.length > 0) {
    morning.sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
    participant.morningFirstJoin = morning[0].joinTime;
    participant.morningLastLeave = morning[morning.length - 1].leaveTime;
  }
  
  // Calculate afternoon session times
  if (afternoon.length > 0) {
    afternoon.sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
    participant.afternoonFirstJoin = afternoon[0].joinTime;
    participant.afternoonLastLeave = afternoon[afternoon.length - 1].leaveTime;
  }
  
  // Calculate total absence minutes
  let totalAbsence = 0;
  
  // Morning session absences (09:00 - 13:00)
  if (morning.length > 0) {
    totalAbsence += calculateSessionAbsences(morning, 9, 13);
  } else if (afternoon.length > 0) {
    // If only afternoon, don't count morning as absence
    totalAbsence += 0;
  } else {
    // Not present in any session
    totalAbsence = 999; // Mark as definitely absent
  }
  
  // Afternoon session absences (14:00 - 18:00)
  if (afternoon.length > 0) {
    totalAbsence += calculateSessionAbsences(afternoon, 14, 18);
  } else if (morning.length > 0) {
    // If only morning, don't count afternoon as absence
    totalAbsence += 0;
  }
  
  participant.totalAbsenceMinutes = totalAbsence;
  participant.isPresent = totalAbsence <= 14;
  
  return participant;
};

const calculateSessionAbsences = (
  sessions: ZoomParticipant[],
  startHour: number,
  endHour: number
): number => {
  if (sessions.length === 0) return 0;
  
  // Sort sessions by join time
  const sortedSessions = [...sessions].sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
  
  let totalAbsence = 0;
  
  for (let i = 0; i < sortedSessions.length - 1; i++) {
    const currentLeave = sortedSessions[i].leaveTime;
    const nextJoin = sortedSessions[i + 1].joinTime;
    
    const gapMinutes = (nextJoin.getTime() - currentLeave.getTime()) / (1000 * 60);
    
    // Only count gaps longer than 90 seconds as absences
    if (gapMinutes > 1.5) {
      totalAbsence += gapMinutes;
    }
  }
  
  return Math.round(totalAbsence);
};
