import {
  parseZoomCSV,
  processParticipants,
  analyzeCSVPeriod
} from '../utils/csvParser';
import { getTestCSV } from './testUtils';

// Helper to load test CSV files
const loadTestCSV = getTestCSV;

describe('csvParser', () => {
  describe('parseZoomCSV', () => {
    it('should parse valid morning CSV correctly', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const participants = parseZoomCSV(csv);

      expect(participants.length).toBe(5); // 1 organizer + 4 participants (Luca has 2 sessions)
      expect(participants[0].isOrganizer).toBe(true);
      expect(participants[0].name).toBe('Prof. Mario Rossi');
    });

    it('should parse valid afternoon CSV correctly', () => {
      const csv = loadTestCSV('afternoon-valid.csv');
      const participants = parseZoomCSV(csv);

      expect(participants.length).toBe(4);
      expect(participants[0].isOrganizer).toBe(true);
    });

    it('should clean participant names (remove organizer suffix)', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const participants = parseZoomCSV(csv);

      expect(participants[0].name).toBe('Prof. Mario Rossi');
      expect(participants[0].name).not.toContain('Organizzatore');
    });

    it('should parse date/time correctly (DD/MM/YYYY format)', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const participants = parseZoomCSV(csv);

      const firstParticipant = participants[0];
      expect(firstParticipant.joinTime.getDate()).toBe(8); // 08/07/2025
      expect(firstParticipant.joinTime.getMonth()).toBe(6); // July (0-indexed)
      expect(firstParticipant.joinTime.getFullYear()).toBe(2025);
      expect(firstParticipant.joinTime.getHours()).toBe(9); // 09:00 AM
    });

    it('should handle AM/PM time conversion correctly', () => {
      const csv = loadTestCSV('afternoon-valid.csv');
      const participants = parseZoomCSV(csv);

      const firstParticipant = participants[0];
      expect(firstParticipant.joinTime.getHours()).toBe(14); // 02:00 PM = 14:00
    });

    it('should throw error for CSV without participant header', () => {
      const csv = loadTestCSV('invalid-missing-headers.csv');
      expect(() => parseZoomCSV(csv)).toThrow('impossibile trovare la sezione partecipanti');
    });

    it('should filter out participants without names', () => {
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
,test@test.it,08/07/2025 09:00:00 AM,08/07/2025 10:00:00 AM,60,No
Valid Name,valid@test.it,08/07/2025 09:00:00 AM,08/07/2025 10:00:00 AM,60,No`;

      const participants = parseZoomCSV(csvContent);
      expect(participants.length).toBe(1);
      expect(participants[0].name).toBe('Valid Name');
    });
  });

  describe('processParticipants', () => {
    it('should calculate attendance correctly for full attendance', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const participants = parseZoomCSV(csv);

      const { participants: processed, organizer } = processParticipants(participants, []);

      expect(organizer).not.toBeNull();
      expect(organizer?.name).toBe('Prof. Mario Rossi');

      // Maria Verdi has full attendance (240 minutes, no gaps)
      const maria = processed.find(p => p.name === 'Maria Verdi');
      expect(maria).toBeDefined();
      expect(maria!.isPresent).toBe(true);
      expect(maria!.totalAbsenceMinutes).toBeLessThanOrEqual(14);
    });

    it('should detect absences based on 45-minute rule (>14 minutes absence)', () => {
      const csv = loadTestCSV('morning-with-absences.csv');
      const participants = parseZoomCSV(csv);

      const { participants: processed } = processParticipants(participants, []);

      // Paolo Gialli: 09:00-09:30 (30 min), gap 09:30-10:00 (30 min), 10:00-12:00 (120 min)
      // Total gap = 30 minutes > 14 minutes => should be marked as absent
      const paolo = processed.find(p => p.name === 'Paolo Gialli');
      expect(paolo).toBeDefined();
      expect(paolo!.totalAbsenceMinutes).toBeGreaterThan(14);
      expect(paolo!.isPresent).toBe(false);
    });

    it('should mark as absent if total session time < 45 minutes per hour', () => {
      const csv = loadTestCSV('morning-with-absences.csv');
      const participants = parseZoomCSV(csv);

      const { participants: processed } = processParticipants(participants, []);

      // Carlo Viola: only 40 minutes total (09:00-09:40) out of 4 hours
      // Should be marked as absent (< 45 minutes per hour on average)
      const carlo = processed.find(p => p.name === 'Carlo Viola');
      expect(carlo).toBeDefined();
      expect(carlo!.totalAbsenceMinutes).toBeGreaterThan(14);
    });

    it('should handle multiple sessions from same participant', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const participants = parseZoomCSV(csv);

      const { participants: processed } = processParticipants(participants, []);

      // Luca Neri has 2 sessions with a small gap
      const luca = processed.find(p => p.name === 'Luca Neri');
      expect(luca).toBeDefined();
      expect(luca!.sessions.morning.length).toBe(2);
      expect(luca!.morningFirstJoin).toBeDefined();
      expect(luca!.morningLastLeave).toBeDefined();
    });

    it('should ignore gaps <= 1.5 minutes (connection issues)', () => {
      // Create test data with small gap
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No
Student A,student@test.it,08/07/2025 09:00:00 AM,08/07/2025 10:00:00 AM,60,No
Student A,student@test.it,08/07/2025 10:01:00 AM,08/07/2025 01:00:00 PM,179,No`;

      const participants = parseZoomCSV(csvContent);
      const { participants: processed } = processParticipants(participants, []);

      const student = processed.find(p => p.name === 'Student A');
      expect(student).toBeDefined();
      // Gap is only 1 minute, should be ignored
      expect(student!.totalAbsenceMinutes).toBeLessThanOrEqual(1.5);
      expect(student!.isPresent).toBe(true);
    });

    it('should combine morning and afternoon sessions', () => {
      const morningCSV = loadTestCSV('morning-valid.csv');
      const afternoonCSV = loadTestCSV('afternoon-valid.csv');

      const morningParticipants = parseZoomCSV(morningCSV);
      const afternoonParticipants = parseZoomCSV(afternoonCSV);

      const { participants: processed, organizer } = processParticipants(
        morningParticipants,
        afternoonParticipants
      );

      expect(organizer).not.toBeNull();
      expect(organizer?.sessions.morning.length).toBeGreaterThan(0);
      expect(organizer?.sessions.afternoon.length).toBeGreaterThan(0);

      // Check that participants appear in both sessions
      const giovanni = processed.find(p => p.name === 'Giovanni Bianchi');
      expect(giovanni).toBeDefined();
      expect(giovanni!.sessions.morning.length).toBeGreaterThan(0);
      expect(giovanni!.sessions.afternoon.length).toBeGreaterThan(0);
      expect(giovanni!.morningFirstJoin).toBeDefined();
      expect(giovanni!.afternoonFirstJoin).toBeDefined();
    });

    it('should sort participants alphabetically by name', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const participants = parseZoomCSV(csv);

      const { participants: processed } = processParticipants(participants, []);

      for (let i = 0; i < processed.length - 1; i++) {
        expect(processed[i].name.localeCompare(processed[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should exclude organizer from participants list', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const participants = parseZoomCSV(csv);

      const { participants: processed, organizer } = processParticipants(participants, []);

      expect(organizer).not.toBeNull();
      expect(organizer?.name).toBe('Prof. Mario Rossi');

      // Organizer should not be in participants list
      const organizerInList = processed.find(p => p.name === 'Prof. Mario Rossi');
      expect(organizerInList).toBeUndefined();
    });
  });

  describe('analyzeCSVPeriod', () => {
    it('should detect morning period correctly', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const analysis = analyzeCSVPeriod(csv);

      expect(analysis.period).toBe('morning');
      expect(analysis.participantCount).toBeGreaterThan(0);
      expect(analysis.firstJoinTime.getHours()).toBeLessThan(13);
    });

    it('should detect afternoon period correctly', () => {
      const csv = loadTestCSV('afternoon-valid.csv');
      const analysis = analyzeCSVPeriod(csv);

      expect(analysis.period).toBe('afternoon');
      expect(analysis.participantCount).toBeGreaterThan(0);
      expect(analysis.firstJoinTime.getHours()).toBeGreaterThanOrEqual(13);
    });

    it('should use 13:00 as discriminant (lunch break)', () => {
      // Create CSV with first join at exactly 13:00
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 01:00:00 PM,08/07/2025 06:00:00 PM,300,No`;

      const analysis = analyzeCSVPeriod(csvContent);
      expect(analysis.period).toBe('afternoon'); // >= 13:00 is afternoon
    });

    it('should return unknown period for invalid CSV', () => {
      const csv = loadTestCSV('invalid-no-participants.csv');
      const analysis = analyzeCSVPeriod(csv);

      expect(analysis.period).toBe('unknown');
      expect(analysis.participantCount).toBe(0);
    });

    it('should calculate first join and last leave times correctly', () => {
      const csv = loadTestCSV('morning-valid.csv');
      const analysis = analyzeCSVPeriod(csv);

      expect(analysis.firstJoinTime).toBeDefined();
      expect(analysis.lastLeaveTime).toBeDefined();
      expect(analysis.lastLeaveTime.getTime()).toBeGreaterThan(analysis.firstJoinTime.getTime());
    });
  });

  describe('Attendance Edge Cases', () => {
    it('should handle participant present only in morning', () => {
      const morningCSV = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No
Morning Only,morning@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No`;

      const afternoonCSV = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 02:00:00 PM,08/07/2025 06:00:00 PM,240,No`;

      const morning = parseZoomCSV(morningCSV);
      const afternoon = parseZoomCSV(afternoonCSV);

      const { participants } = processParticipants(morning, afternoon);

      const morningOnly = participants.find(p => p.name === 'Morning Only');
      expect(morningOnly).toBeDefined();
      expect(morningOnly!.sessions.morning.length).toBeGreaterThan(0);
      expect(morningOnly!.sessions.afternoon.length).toBe(0);
      // Should not count afternoon as absence if only morning present
      expect(morningOnly!.isPresent).toBe(true);
    });

    it('should handle late arrival (after 9:30)', () => {
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No
Late Student,late@test.it,08/07/2025 09:40:00 AM,08/07/2025 01:00:00 PM,200,No`;

      const participants = parseZoomCSV(csvContent);
      const { participants: processed } = processParticipants(participants, []);

      const late = processed.find(p => p.name === 'Late Student');
      expect(late).toBeDefined();
      // Late arrival should still be counted if total time is sufficient
      expect(late!.morningFirstJoin?.getHours()).toBe(9);
      expect(late!.morningFirstJoin?.getMinutes()).toBe(40);
    });

    it('should handle early departure', () => {
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No
Early Leaver,early@test.it,08/07/2025 09:00:00 AM,08/07/2025 12:15:00 PM,195,No`;

      const participants = parseZoomCSV(csvContent);
      const { participants: processed } = processParticipants(participants, []);

      const early = processed.find(p => p.name === 'Early Leaver');
      expect(early).toBeDefined();
      expect(early!.morningLastLeave?.getHours()).toBe(12);
      expect(early!.morningLastLeave?.getMinutes()).toBe(15);
    });
  });
});
