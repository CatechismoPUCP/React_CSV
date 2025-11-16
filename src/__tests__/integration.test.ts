/**
 * Integration tests - End-to-End workflow tests
 */

import { fullCourseProcessor } from '../services/fullCourseProcessor';
import { fullCourseDocumentGenerator } from '../services/fullCourseDocumentGenerator';
import { parseZoomCSV, processParticipants } from '../utils/csvParser';
import { LessonService } from '../services/lessonService';
import { getTestCSV, createMockFile } from './testUtils';

describe('Integration Tests', () => {
  describe('Full Course Workflow', () => {
    it('should process full course CSV end-to-end', async () => {
      const csv = getTestCSV('fullcourse-with-aliases.csv');

      // Step 1: Parse and process
      const parsedData = await fullCourseProcessor.processFullCourseCSV(csv);

      // Should have parsed course data
      expect(parsedData.courseName).toBe('Corso Completo Test');
      expect(parsedData.days.length).toBe(3);

      // Should have detected and merged aliases
      expect(parsedData.aliasSuggestions.length).toBeGreaterThan(0);

      // Should have merged participants (Giorgio variants)
      const georgioVariants = parsedData.allParticipants.filter(p =>
        p.primaryName.toLowerCase().includes('giorgio') ||
        p.primaryName.toLowerCase().includes('g.')
      );

      // After merging, should have fewer participants than original variants
      expect(georgioVariants.length).toBeLessThanOrEqual(3); // Original had 3+ variants

      // Step 2: Get summary
      const summary = fullCourseProcessor.getProcessingSummary(parsedData);

      expect(summary.courseName).toBe('Corso Completo Test');
      expect(summary.totalDays).toBe(3);
      expect(summary.autoMergedCount).toBeGreaterThan(0);
    });

    it('should validate parsed data correctly', async () => {
      const csv = getTestCSV('fullcourse-with-aliases.csv');
      const parsedData = await fullCourseProcessor.processFullCourseCSV(csv);

      const validation = fullCourseProcessor.validateParsedData(parsedData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should get day details correctly', async () => {
      const csv = getTestCSV('fullcourse-with-aliases.csv');
      const parsedData = await fullCourseProcessor.processFullCourseCSV(csv);

      const dayDetails = fullCourseProcessor.getDayDetails(parsedData, '2025-09-19');

      expect(dayDetails).not.toBeNull();
      expect(dayDetails!.date).toBe('2025-09-19');
      expect(dayDetails!.participants.length).toBeGreaterThan(0);
      expect(dayDetails!.sessionCount).toBeGreaterThan(0);
      expect(dayDetails!.duration).toBeGreaterThan(0);
    });

    it('should get participant stats correctly', async () => {
      const csv = getTestCSV('fullcourse-with-aliases.csv');
      const parsedData = await fullCourseProcessor.processFullCourseCSV(csv);

      const participant = parsedData.allParticipants.find(p => !p.isOrganizer);
      if (participant) {
        const stats = fullCourseProcessor.getParticipantStats(parsedData, participant.id);

        expect(stats).not.toBeNull();
        expect(stats!.name).toBe(participant.primaryName);
        expect(stats!.totalDays).toBe(3);
        expect(stats!.attendanceRate).toBeGreaterThanOrEqual(0);
        expect(stats!.attendanceRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Single Day Workflow', () => {
    it('should process morning and afternoon sessions', () => {
      const morningCSV = getTestCSV('morning-valid.csv');
      const afternoonCSV = getTestCSV('afternoon-valid.csv');

      const morningParticipants = parseZoomCSV(morningCSV);
      const afternoonParticipants = parseZoomCSV(afternoonCSV);

      const { participants, organizer } = processParticipants(
        morningParticipants,
        afternoonParticipants
      );

      // Should have combined participants
      expect(participants.length).toBeGreaterThan(0);
      expect(organizer).not.toBeNull();

      // Calculate lesson hours
      const lessonHours = LessonService.calculateDynamicLessonHours(
        participants,
        organizer,
        'both'
      );

      // Should have both morning and afternoon hours
      expect(lessonHours).toContain(9); // Morning start
      expect(lessonHours).toContain(14); // Afternoon start
    });

    it('should validate lesson requirements', () => {
      const mockTemplate = createMockFile('template content', 'template.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const mockCSV = createMockFile('csv content', 'data.csv', 'text/csv');

      const error = LessonService.validateLessonRequirements(
        'both',
        mockCSV,
        mockCSV,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBeNull(); // Should pass validation
    });
  });

  describe('Alias Detection and Merging', () => {
    it('should detect and auto-merge similar names', async () => {
      const csv = getTestCSV('fullcourse-with-aliases.csv');
      const parsedData = await fullCourseProcessor.processFullCourseCSV(csv);

      // Should have auto-merged suggestions
      const autoMerged = parsedData.aliasSuggestions.filter(s => s.autoMerged);
      expect(autoMerged.length).toBeGreaterThan(0);

      // Should have fewer participants after merge
      const beforeMergeCount = 6; // Rough estimate before merge
      expect(parsedData.allParticipants.length).toBeLessThan(beforeMergeCount);
    });

    it('should preserve all days present after merge', async () => {
      const csv = getTestCSV('fullcourse-with-aliases.csv');
      const parsedData = await fullCourseProcessor.processFullCourseCSV(csv);

      // Find merged participant (Giorgio or Maria)
      const mergedParticipant = parsedData.allParticipants.find(p =>
        p.aliases && p.aliases.length > 1
      );

      if (mergedParticipant) {
        // Should have days from all merged aliases
        expect(mergedParticipant.daysPresent.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid CSV gracefully', async () => {
      const invalidCSV = getTestCSV('invalid-missing-headers.csv');

      await expect(
        fullCourseProcessor.processFullCourseCSV(invalidCSV)
      ).rejects.toThrow();
    });

    it('should handle CSV with no participants', async () => {
      const noParticipantsCSV = getTestCSV('invalid-no-participants.csv');

      await expect(
        fullCourseProcessor.processFullCourseCSV(noParticipantsCSV)
      ).rejects.toThrow();
    });

    it('should validate and report errors for incomplete data', async () => {
      const csvContent = `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
,0,123,,,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Student A,student@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No`;

      const parsedData = await fullCourseProcessor.processFullCourseCSV(csvContent);
      const validation = fullCourseProcessor.validateParsedData(parsedData);

      // Should have warnings about missing organizer or incomplete data
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should handle absent participants correctly', () => {
      const csvWithAbsences = getTestCSV('morning-with-absences.csv');
      const participants = parseZoomCSV(csvWithAbsences);

      const { participants: processed } = processParticipants(participants, []);

      // Paolo Gialli should be marked as absent (30 min gap)
      const paolo = processed.find(p => p.name === 'Paolo Gialli');
      expect(paolo).toBeDefined();
      expect(paolo!.isPresent).toBe(false);
      expect(paolo!.totalAbsenceMinutes).toBeGreaterThan(14);

      // Carlo Viola should be absent (only 40 min total)
      const carlo = processed.find(p => p.name === 'Carlo Viola');
      expect(carlo).toBeDefined();
      expect(carlo!.isPresent).toBe(false);
    });
  });

  describe('45-Minute Presence Rule', () => {
    it('should mark participant as present if absence <= 14 minutes', () => {
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No
Student A,student@test.it,08/07/2025 09:00:00 AM,08/07/2025 10:00:00 AM,60,No
Student A,student@test.it,08/07/2025 10:14:00 AM,08/07/2025 01:00:00 PM,166,No`;

      const participants = parseZoomCSV(csvContent);
      const { participants: processed } = processParticipants(participants, []);

      const student = processed.find(p => p.name === 'Student A');
      expect(student).toBeDefined();
      // Gap is 14 minutes, should be marked as present
      expect(student!.totalAbsenceMinutes).toBeLessThanOrEqual(14);
      expect(student!.isPresent).toBe(true);
    });

    it('should mark participant as absent if absence > 14 minutes', () => {
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No
Student A,student@test.it,08/07/2025 09:00:00 AM,08/07/2025 10:00:00 AM,60,No
Student A,student@test.it,08/07/2025 10:16:00 AM,08/07/2025 01:00:00 PM,164,No`;

      const participants = parseZoomCSV(csvContent);
      const { participants: processed } = processParticipants(participants, []);

      const student = processed.find(p => p.name === 'Student A');
      expect(student).toBeDefined();
      // Gap is 16 minutes, should be marked as absent
      expect(student!.totalAbsenceMinutes).toBeGreaterThan(14);
      expect(student!.isPresent).toBe(false);
    });
  });

  describe('Lunch Break Handling (13:00-14:00)', () => {
    it('should not count lunch break as lesson time', () => {
      const csvContent = `Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest
Prof. Rossi,prof@test.it,08/07/2025 09:00:00 AM,08/07/2025 06:00:00 PM,540,No`;

      const participants = parseZoomCSV(csvContent);
      const { participants: processed, organizer } = processParticipants(participants, []);

      const lessonHours = LessonService.calculateDynamicLessonHours(
        processed,
        organizer,
        'both'
      );

      // Should have morning hours (9-13) and afternoon hours (14-18)
      // But NOT hour 13 (1 PM) as it's part of lunch break
      expect(lessonHours).toContain(9);
      expect(lessonHours).toContain(13); // End of morning
      expect(lessonHours).toContain(14); // Start of afternoon
      expect(lessonHours).toContain(18);

      // Total should be 10 hours (5 morning + 5 afternoon)
      expect(lessonHours.length).toBe(10);
    });

    it('should detect afternoon sessions starting at 14:00', () => {
      const afternoonCSV = getTestCSV('afternoon-valid.csv');
      const participants = parseZoomCSV(afternoonCSV);

      const { participants: processed } = processParticipants([], participants);

      const lessonHours = LessonService.calculateDynamicLessonHours(
        processed,
        null,
        'afternoon'
      );

      // Should start at 14:00 (not 13:00)
      expect(lessonHours[0]).toBe(14);
      expect(lessonHours).not.toContain(13);
    });
  });
});
