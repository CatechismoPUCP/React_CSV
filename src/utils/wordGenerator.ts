import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { LessonData, WordTemplateData, ProcessedParticipant, LessonType } from '../types';

export const generateWordDocument = async (
  lessonData: LessonData,
  templateFile: File
): Promise<void> => {
  try {
    // Read template file
    const templateBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(templateBuffer);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      },
      nullGetter: function() {
        return '';
      },
      errorLogging: false
    });
    
    // Prepare template data
    const templateData = prepareTemplateData(lessonData);
    
    console.log('Template data:', templateData);
    
    // Render document
    doc.render(templateData);
    

    
    // Generate output
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // Generate filename with course ID (if provided)
    const dateStr = format(lessonData.date, 'yyyy_MM_dd');
    let filename = `modello B fad_${dateStr}.docx`;
    if (lessonData.courseId) {
      filename = `modello B fad_${lessonData.courseId}_${dateStr}.docx`;
    }
    
    // Save file
    saveAs(output, filename);
  } catch (error: any) {
    console.error('Errore durante la generazione del documento Word:', error);
    
    // More detailed error logging
    if (error.properties && error.properties.errors) {
      console.error('Template errors:', error.properties.errors);
      const errorMessages = error.properties.errors.map((err: any) => 
        `${err.message} at ${err.properties?.id || 'unknown location'}`
      ).join(', ');
      throw new Error(`Errori nel template Word: ${errorMessages}`);
    }
    
    throw new Error('Errore durante la generazione del documento Word. Verifica che il template contenga i placeholder corretti.');
  }
};

const prepareTemplateData = (lessonData: LessonData): WordTemplateData => {
  const date = lessonData.date;
  
  // Prepare basic date and lesson info
  const templateData: WordTemplateData = {
    day: format(date, 'dd'),
    month: format(date, 'MM'),
    year: format(date, 'yyyy'),
    orariolezione: getScheduleText(lessonData.lessonType, lessonData.participants, lessonData.organizer, lessonData.lessonHours),
    argomento: lessonData.subject || '',
  };
  
  // Initialize all participant fields first
  for (let i = 1; i <= 5; i++) {
    templateData[`nome${i}` as keyof WordTemplateData] = '';
    templateData[`MattOraIn${i}` as keyof WordTemplateData] = '';
    templateData[`MattOraOut${i}` as keyof WordTemplateData] = '';
    templateData[`PomeOraIn${i}` as keyof WordTemplateData] = '';
    templateData[`PomeOraOut${i}` as keyof WordTemplateData] = '';
    templateData[`presenza${i}` as keyof WordTemplateData] = '';
  }
  
  // Add participant data (up to 5 participants)
  const participants = lessonData.participants.slice(0, 5);
  
  participants.forEach((participant, i) => {
    const index = i + 1;
    
    templateData[`nome${index}` as keyof WordTemplateData] = participant.name || '';
    
    // Trust the isPresent flag that was calculated during processing/merging
    // Only mark as explicitly absent if isAbsent is true OR if isPresent is false
    const isExplicitlyAbsent = participant.isAbsent || !participant.isPresent;
    
    console.log(`🔍 Participant ${participant.name}:`, {
      isPresent: participant.isPresent,
      isAbsent: participant.isAbsent,
      totalAbsenceMinutes: participant.totalAbsenceMinutes,
      isExplicitlyAbsent,
      morningConnections: participant.allConnections.morning.length,
      afternoonConnections: participant.allConnections.afternoon.length,
      aliases: participant.aliases?.length || 0
    });
    
    if (isExplicitlyAbsent) {
      // If explicitly absent, all placeholders become "ASSENTE"
      if (lessonData.lessonType !== 'afternoon') {
        templateData[`MattOraIn${index}` as keyof WordTemplateData] = 'ASSENTE';
        templateData[`MattOraOut${index}` as keyof WordTemplateData] = 'ASSENTE';
      }
      if (lessonData.lessonType !== 'morning') {
        templateData[`PomeOraIn${index}` as keyof WordTemplateData] = 'ASSENTE';
        templateData[`PomeOraOut${index}` as keyof WordTemplateData] = 'ASSENTE';
      }
      templateData[`presenza${index}` as keyof WordTemplateData] = 'ASSENTE';
    } else {
      // If present, show ALL connection times with seconds precision
      // Collect all connections including aliases
      let allMorningConnections = [...participant.allConnections.morning];
      let allAfternoonConnections = [...participant.allConnections.afternoon];
      
      // Add alias connections if they exist
      if (participant.aliases && participant.aliases.length > 0) {
        participant.aliases.forEach(alias => {
          // Parse alias connections from connectionsList string
          if (alias.connectionsList && alias.connectionsList !== '') {
            // This is a simplified approach - in a real scenario, you'd need to parse the connectionsList
            // For now, we'll assume the main participant connections already include merged data
          }
        });
      }
      
      // Morning times - show all connections separated by " - "
      if (lessonData.lessonType !== 'afternoon' && allMorningConnections.length > 0) {
        const morningInTimes = allMorningConnections
          .map(conn => formatTimeWithSeconds(conn.joinTime))
          .join(' - ');
        const morningOutTimes = allMorningConnections
          .map(conn => formatTimeWithSeconds(conn.leaveTime))
          .join(' - ');
        
        templateData[`MattOraIn${index}` as keyof WordTemplateData] = morningInTimes;
        templateData[`MattOraOut${index}` as keyof WordTemplateData] = morningOutTimes;
      }
      
      // Afternoon times - show all connections separated by " - "
      if (lessonData.lessonType !== 'morning' && allAfternoonConnections.length > 0) {
        const afternoonInTimes = allAfternoonConnections
          .map(conn => formatTimeWithSeconds(conn.joinTime))
          .join(' - ');
        const afternoonOutTimes = allAfternoonConnections
          .map(conn => formatTimeWithSeconds(conn.leaveTime))
          .join(' - ');
        
        templateData[`PomeOraIn${index}` as keyof WordTemplateData] = afternoonInTimes;
        templateData[`PomeOraOut${index}` as keyof WordTemplateData] = afternoonOutTimes;
      }
      
      // For fast mode, show both morning and afternoon
      if (lessonData.lessonType === 'fast') {
        // Morning connections
        if (allMorningConnections.length > 0) {
          const morningInTimes = allMorningConnections
            .map(conn => formatTimeWithSeconds(conn.joinTime))
            .join(' - ');
          const morningOutTimes = allMorningConnections
            .map(conn => formatTimeWithSeconds(conn.leaveTime))
            .join(' - ');
          
          templateData[`MattOraIn${index}` as keyof WordTemplateData] = morningInTimes;
          templateData[`MattOraOut${index}` as keyof WordTemplateData] = morningOutTimes;
        }
        
        // Afternoon connections
        if (allAfternoonConnections.length > 0) {
          const afternoonInTimes = allAfternoonConnections
            .map(conn => formatTimeWithSeconds(conn.joinTime))
            .join(' - ');
          const afternoonOutTimes = allAfternoonConnections
            .map(conn => formatTimeWithSeconds(conn.leaveTime))
            .join(' - ');
          
          templateData[`PomeOraIn${index}` as keyof WordTemplateData] = afternoonInTimes;
          templateData[`PomeOraOut${index}` as keyof WordTemplateData] = afternoonOutTimes;
        }
      }
      
      // Presence status with connection details (keep for debug/reference)
      const connectionsList = formatAllConnections(participant, lessonData.lessonType);
      const presenceValue = participant.isPresent ? 
        `✅ ${connectionsList}` : `❌ ${connectionsList}`;
      templateData[`presenza${index}` as keyof WordTemplateData] = presenceValue;
      console.log(`📝 Setting presenza${index} for ${participant.name}:`, presenceValue);
    }
  });
  
  console.log('📊 Complete Template Data:', templateData);
  return templateData;
};

// Round time to nearest hour for better readability
const roundToNearestHour = (date: Date): Date => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  
  if (minutes >= 30) {
    // Round up to next hour
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    // Round down to current hour
    rounded.setHours(rounded.getHours(), 0, 0, 0);
  }
  
  return rounded;
};

// Get actual session end hour based on participant data
const getActualSessionEndHour = (participants: ProcessedParticipant[], session: 'morning' | 'afternoon'): number => {
  const endTimes: Date[] = [];
  
  participants.forEach(participant => {
    if (session === 'morning' && participant.morningLastLeave) {
      endTimes.push(participant.morningLastLeave);
    } else if (session === 'afternoon' && participant.afternoonLastLeave) {
      endTimes.push(participant.afternoonLastLeave);
    }
  });
  
  if (endTimes.length === 0) {
    // Fallback to default end times (avoid 13:00 for morning)
    return session === 'morning' ? 12 : 18;
  }
  
  // Find the latest end time and round to nearest hour
  const latestEndTime = new Date(Math.max(...endTimes.map(t => t.getTime())));
  const roundedEndTime = roundToNearestHour(latestEndTime);
  let endHour = roundedEndTime.getHours();
  
  // For morning sessions, if it ends at 13:00, adjust to 12:00 (avoid lunch break)
  if (session === 'morning' && endHour === 13) {
    endHour = 12;
  }
  
  return endHour;
};



const getScheduleText = (
  lessonType: LessonType, 
  participants: ProcessedParticipant[], 
  organizer?: ProcessedParticipant, 
  lessonHours?: number[]
): string => {
  // Combine participants and organizer for analysis
  const allParticipants = organizer ? [...participants, organizer] : participants;
  
  // Use dynamic lesson hours if available
  if (lessonHours && lessonHours.length > 0) {
    const sortedHours = [...lessonHours].sort((a, b) => a - b);
    
    // Determine if it's morning, afternoon, or both based on hours
    const morningHours = sortedHours.filter(h => h >= 9 && h <= 13);
    const afternoonHours = sortedHours.filter(h => h >= 14 && h <= 18);
    
    if (morningHours.length > 0 && afternoonHours.length > 0) {
      // Both sessions - calculate actual end times based on participant data
      const morningStart = Math.min(...morningHours);
      const morningEnd = getActualSessionEndHour(allParticipants, 'morning');
      const afternoonStart = Math.min(...afternoonHours);
      const afternoonEnd = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${morningStart.toString().padStart(2, '0')}:00 - ${morningEnd.toString().padStart(2, '0')}:00 / ${afternoonStart.toString().padStart(2, '0')}:00 - ${afternoonEnd.toString().padStart(2, '0')}:00`;
    } else if (morningHours.length > 0) {
      // Morning only
      const start = Math.min(...morningHours);
      const end = getActualSessionEndHour(allParticipants, 'morning');
      return `${start.toString().padStart(2, '0')}:00 - ${end.toString().padStart(2, '0')}:00`;
    } else if (afternoonHours.length > 0) {
      // Afternoon only
      const start = Math.min(...afternoonHours);
      const end = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${start.toString().padStart(2, '0')}:00 - ${end.toString().padStart(2, '0')}:00`;
    }
  }
  
  // Fallback to original logic if no dynamic hours
  let startTime: Date | null = null;
  
  if (lessonType === 'morning' || lessonType === 'both' || lessonType === 'fast') {
    const morningStarts = allParticipants
      .filter(p => p.morningFirstJoin)
      .map(p => p.morningFirstJoin!)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (morningStarts.length > 0) {
      const earliestStart = morningStarts[0];
      const roundedStart = roundToNearestHour(earliestStart);
      // Ensure morning doesn't start before 9:00
      if (roundedStart.getHours() < 9) {
        roundedStart.setHours(9, 0, 0, 0);
      }
      startTime = roundedStart;
    }
  }
  
  if ((lessonType === 'afternoon' || lessonType === 'fast') && !startTime) {
    const afternoonStarts = allParticipants
      .filter(p => p.afternoonFirstJoin)
      .map(p => p.afternoonFirstJoin!)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (afternoonStarts.length > 0) {
      const earliestStart = afternoonStarts[0];
      const roundedStart = roundToNearestHour(earliestStart);
      // Ensure afternoon doesn't start before 14:00
      if (roundedStart.getHours() < 14) {
        roundedStart.setHours(14, 0, 0, 0);
      }
      startTime = roundedStart;
    }
  }
  
  // Format the schedule based on lesson type with actual end times
  switch (lessonType) {
    case 'morning': {
      const start = startTime ? formatTime(startTime) : '09:00';
      const end = getActualSessionEndHour(allParticipants, 'morning');
      return `${start} - ${end.toString().padStart(2, '0')}:00`;
    }
    case 'afternoon': {
      const start = startTime ? formatTime(startTime) : '14:00';
      const end = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${start} - ${end.toString().padStart(2, '0')}:00`;
    }
    case 'both': {
      const morningStart = startTime ? formatTime(startTime) : '09:00';
      const morningEnd = getActualSessionEndHour(allParticipants, 'morning');
      const afternoonEnd = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${morningStart} - ${morningEnd.toString().padStart(2, '0')}:00 / 14:00 - ${afternoonEnd.toString().padStart(2, '0')}:00`;
    }
    case 'fast': {
      // For fast mode, determine schedule based on actual data
      const hasMorning = allParticipants.some(p => p.morningFirstJoin);
      const hasAfternoon = allParticipants.some(p => p.afternoonFirstJoin);
      
      if (hasMorning && hasAfternoon) {
        // Both sessions detected
        const morningStart = startTime ? formatTime(startTime) : '09:00';
        const morningEnd = getActualSessionEndHour(allParticipants, 'morning');
        const afternoonEnd = getActualSessionEndHour(allParticipants, 'afternoon');
        return `${morningStart} - ${morningEnd.toString().padStart(2, '0')}:00 / 14:00 - ${afternoonEnd.toString().padStart(2, '0')}:00`;
      } else if (hasMorning) {
        // Only morning session
        const start = startTime ? formatTime(startTime) : '09:00';
        const end = getActualSessionEndHour(allParticipants, 'morning');
        return `${start} - ${end.toString().padStart(2, '0')}:00`;
      } else if (hasAfternoon) {
        // Only afternoon session
        const start = startTime ? formatTime(startTime) : '14:00';
        const end = getActualSessionEndHour(allParticipants, 'afternoon');
        return `${start} - ${end.toString().padStart(2, '0')}:00`;
      }
      return '';
    }
    default:
      return '';
  }
};

const formatTime = (date: Date, roundToHour: boolean = false): string => {
  if (roundToHour) {
    const rounded = roundToNearestHour(date);
    return format(rounded, 'HH:mm');
  }
  return format(date, 'HH:mm');
};

// Format time with seconds for detailed logging
const formatTimeWithSeconds = (date: Date): string => {
  return format(date, 'HH:mm:ss');
};

// Format all connections for a participant including aliases
const formatAllConnections = (participant: ProcessedParticipant, lessonType: LessonType): string => {
  
  const allConnectionsText: string[] = [];
  
  // Main participant connections
  const mainConnections: string[] = [];
  
  // Morning connections
  if ((lessonType !== 'afternoon') && participant.allConnections.morning.length > 0) {
    const morningConnections = participant.allConnections.morning
      .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
      .join('; ');
    mainConnections.push(morningConnections);
  }
  
  // Afternoon connections
  if ((lessonType !== 'morning') && participant.allConnections.afternoon.length > 0) {
    const afternoonConnections = participant.allConnections.afternoon
      .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
      .join('; ');
    mainConnections.push(afternoonConnections);
  }
  
  // For fast mode, include all connections regardless of time
  if (lessonType === 'fast') {
    const allConnections: string[] = [];
    
    if (participant.allConnections.morning.length > 0) {
      const morningConnections = participant.allConnections.morning
        .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
        .join('; ');
      allConnections.push(morningConnections);
    }
    
    if (participant.allConnections.afternoon.length > 0) {
      const afternoonConnections = participant.allConnections.afternoon
        .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
        .join('; ');
      allConnections.push(afternoonConnections);
    }
    
    // Override mainConnections for fast mode
    mainConnections.length = 0;
    mainConnections.push(...allConnections);
  }
  
  if (mainConnections.length > 0) {
    allConnectionsText.push(`${participant.name}: ${mainConnections.join(' | ')}`);
  }
  
  // Add alias connections
  if (participant.aliases && participant.aliases.length > 0) {
    participant.aliases.forEach(alias => {
      if (alias.connectionsList && alias.connectionsList !== '') {
        allConnectionsText.push(`${alias.name}: ${alias.connectionsList}`);
      }
    });
  }
  
  return allConnectionsText.length > 0 ? allConnectionsText.join(' || ') : 'Nessuna connessione';
};
