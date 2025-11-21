import { fullCourseParsingService } from '../services/fullCourseParsingService';
import { getTestCSV } from './testUtils';

// Helper to load test CSV files
const loadTestCSV = getTestCSV;

describe('FullCourseParsingService', () => {
  describe('parseFullCourseCSV', () => {
    it('should parse full course CSV with multiple days', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      expect(parsed.courseName).toBe('Corso Completo Test');
      expect(parsed.zoomMeetingId).toBe('9876543210');
      expect(parsed.organizer.name).toBe('Prof. Mario Rossi');
      expect(parsed.organizer.email).toBe('mario.rossi@test.it');
    });

    it('should group sessions by date correctly', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      // Should have 3 days (19th, 20th, 21st September)
      expect(parsed.days.length).toBe(3);
      expect(parsed.days[0].date).toBe('2025-09-19');
      expect(parsed.days[1].date).toBe('2025-09-20');
      expect(parsed.days[2].date).toBe('2025-09-21');
    });

    it('should sort days chronologically', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      for (let i = 0; i < parsed.days.length - 1; i++) {
        expect(parsed.days[i].date.localeCompare(parsed.days[i + 1].date)).toBeLessThanOrEqual(0);
      }
    });

    it('should extract all unique participants', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      // Should have organizer + unique participants
      // "giorgio s.", "Giorgio Santambrogio", "G. Santambrogio" are aliases
      // "Maria Verdi", "Maria V." are aliases
      expect(parsed.allParticipants.length).toBeGreaterThan(0);

      // Organizer should be first (masterOrder = 0)
      expect(parsed.allParticipants[0].isOrganizer).toBe(true);
      expect(parsed.allParticipants[0].masterOrder).toBe(0);
    });

    it('should track days present for each participant', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      // Find Maria Verdi (appears on all 3 days)
      const maria = parsed.allParticipants.find(p =>
        p.primaryName.toLowerCase().includes('maria')
      );

      expect(maria).toBeDefined();
      expect(maria!.daysPresent.length).toBeGreaterThan(0);
    });

    it('should calculate statistics correctly', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      expect(parsed.statistics.totalDays).toBe(3);
      expect(parsed.statistics.totalParticipants).toBeGreaterThan(0);
      expect(parsed.statistics.totalSessions).toBeGreaterThan(0);
    });

    it('should calculate date range correctly', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      expect(parsed.dateRange.start).toBe('2025-09-19');
      expect(parsed.dateRange.end).toBe('2025-09-21');
    });

    it('should create participant sessions for each day', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      // Each day should have sessions
      parsed.days.forEach(day => {
        expect(day.sessions.length).toBeGreaterThan(0);
      });
    });

    it('should track earliest start and latest end time per day', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      parsed.days.forEach(day => {
        expect(day.startTime).toBeDefined();
        expect(day.endTime).toBeDefined();
        expect(day.endTime.getTime()).toBeGreaterThan(day.startTime.getTime());
      });
    });

    it('should clean participant names (remove parentheses)', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      // Organizer name should not contain "(Organizzatore)"
      expect(parsed.organizer.name).not.toContain('(');
      expect(parsed.organizer.name).not.toContain(')');
    });

    it('should assign master order to participants', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      // Participants should be sorted by master order
      for (let i = 0; i < parsed.allParticipants.length - 1; i++) {
        expect(parsed.allParticipants[i].masterOrder).toBeLessThanOrEqual(
          parsed.allParticipants[i + 1].masterOrder
        );
      }
    });

    it('should use default course name if missing', () => {
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Student A,student@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No`;

      const parsed = fullCourseParsingService.parseFullCourseCSV(csvContent);

      expect(parsed.courseName).toBe('Corso senza nome');
    });

    it('should throw error for empty CSV', () => {
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa`;

      expect(() => fullCourseParsingService.parseFullCourseCSV(csvContent)).toThrow(
        'Nessun dato trovato nel file CSV'
      );
    });

    it('should handle participants with same name but different cases', () => {
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Corso Test,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,MARIO ROSSI,mario@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No
Corso Test,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,mario rossi,mario@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No
Corso Test,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Mario Rossi,mario@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No`;

      const parsed = fullCourseParsingService.parseFullCourseCSV(csvContent);

      // Should create separate participants (alias detection happens later)
      const marioVariations = parsed.allParticipants.filter(p =>
        p.primaryName.toLowerCase().includes('mario rossi')
      );

      expect(marioVariations.length).toBeGreaterThan(0);
    });

    it('should preserve email addresses', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      parsed.allParticipants.forEach(p => {
        if (!p.isOrganizer) {
          // Non-organizers should have email if present in CSV
          expect(typeof p.email).toBe('string');
        }
      });
    });
  });

  describe('Date and Time Parsing', () => {
    it('should parse Italian date format (DD/MM/YYYY)', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      const firstDay = parsed.days[0];
      // 19/09/2025 should be September 19, 2025
      expect(firstDay.startTime.getDate()).toBe(19);
      expect(firstDay.startTime.getMonth()).toBe(8); // 0-indexed (September = 8)
      expect(firstDay.startTime.getFullYear()).toBe(2025);
    });

    it('should handle AM/PM time correctly', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      // Morning session should start around 9 AM
      const morningDay = parsed.days.find(d => d.date === '2025-09-19');
      expect(morningDay).toBeDefined();
      expect(morningDay!.startTime.getHours()).toBeLessThan(13);

      // Afternoon session should start around 2 PM (14:00)
      const afternoonDay = parsed.days.find(d => d.date === '2025-09-21');
      expect(afternoonDay).toBeDefined();
      expect(afternoonDay!.startTime.getHours()).toBeGreaterThanOrEqual(13);
    });

    it('should auto-detect date format ambiguity', () => {
      // When both day and month are <= 12, should assume DD/MM/YYYY (Italian)
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Corso Test,0,123,Prof. Test,test@test.it,05/07/2025 09:00:00 AM,05/07/2025 01:00:00 PM,Student A,student@test.it,05/07/2025 09:00:00 AM,05/07/2025 01:00:00 PM,240,No,No`;

      const parsed = fullCourseParsingService.parseFullCourseCSV(csvContent);

      // 05/07/2025 should be 5th July (not 7th May)
      expect(parsed.days[0].startTime.getDate()).toBe(5);
      expect(parsed.days[0].startTime.getMonth()).toBe(6); // July = 6
    });
  });

  describe('Edge Cases', () => {
    it('should handle participant with no email', () => {
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Corso Test,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Student A,,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No`;

      const parsed = fullCourseParsingService.parseFullCourseCSV(csvContent);

      const student = parsed.allParticipants.find(p => p.primaryName === 'Student A');
      expect(student).toBeDefined();
      expect(student!.email).toBe('');
    });

    it('should handle single day course', () => {
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Corso Test,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Student A,student@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No`;

      const parsed = fullCourseParsingService.parseFullCourseCSV(csvContent);

      expect(parsed.days.length).toBe(1);
      expect(parsed.dateRange.start).toBe(parsed.dateRange.end);
    });

    it('should handle participant present on some days but not others', () => {
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Corso Test,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No
Corso Test,0,123,Prof. Test,test@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Student A,student@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No
Corso Test,0,123,Prof. Test,test@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,Prof. Test,test@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,240,No,No
Corso Test,0,123,Prof. Test,test@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,Student B,studentb@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,240,No,No`;

      const parsed = fullCourseParsingService.parseFullCourseCSV(csvContent);

      const studentA = parsed.allParticipants.find(p => p.primaryName === 'Student A');
      const studentB = parsed.allParticipants.find(p => p.primaryName === 'Student B');

      expect(studentA).toBeDefined();
      expect(studentB).toBeDefined();

      expect(studentA!.daysPresent).toContain('2025-09-19');
      expect(studentA!.daysPresent).not.toContain('2025-09-20');

      expect(studentB!.daysPresent).not.toContain('2025-09-19');
      expect(studentB!.daysPresent).toContain('2025-09-20');
    });

    it('should count total sessions correctly', () => {
      const csv = loadTestCSV('fullcourse-with-aliases.csv');
      const parsed = fullCourseParsingService.parseFullCourseCSV(csv);

      const totalSessions = parsed.days.reduce((sum, day) => sum + day.sessions.length, 0);
      expect(parsed.statistics.totalSessions).toBe(totalSessions);
    });
  });
});
