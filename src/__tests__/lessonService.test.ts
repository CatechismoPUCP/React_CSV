import { LessonService } from '../services/lessonService';
import { ProcessedParticipant, LessonType } from '../types';
import { LESSON_HOURS } from '../constants';

// Helper to create test participant
const createParticipant = (
  name: string,
  morningConnections: Array<{ joinTime: Date; leaveTime: Date }> = [],
  afternoonConnections: Array<{ joinTime: Date; leaveTime: Date }> = []
): ProcessedParticipant => ({
  name,
  email: `${name.toLowerCase().replace(' ', '.')}@test.it`,
  totalAbsenceMinutes: 0,
  isPresent: true,
  isOrganizer: false,
  allConnections: {
    morning: morningConnections,
    afternoon: afternoonConnections
  },
  sessions: {
    morning: [],
    afternoon: []
  }
});

describe('LessonService', () => {
  describe('calculateDynamicLessonHours', () => {
    describe('Morning Only Lessons', () => {
      it('should calculate hours for morning lesson (9-13)', () => {
        const participant = createParticipant('Test User', [
          {
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 13, 0)
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'morning'
        );

        expect(hours).toContain(9);
        expect(hours).toContain(10);
        expect(hours).toContain(11);
        expect(hours).toContain(12);
        expect(hours).toContain(13);
        expect(hours.length).toBe(5);
      });

      it('should respect LESSON_HOURS.MORNING boundaries (9-13)', () => {
        const participant = createParticipant('Test User', [
          {
            joinTime: new Date(2025, 6, 8, 8, 30), // Before 9:00
            leaveTime: new Date(2025, 6, 8, 13, 30) // After 13:00
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'morning'
        );

        // Should start at 9 and end at 13 (within MORNING bounds)
        expect(hours[0]).toBe(LESSON_HOURS.MORNING.START);
        expect(hours[hours.length - 1]).toBe(LESSON_HOURS.MORNING.END);
        expect(hours).not.toContain(8);
        expect(hours).not.toContain(14);
      });

      it('should handle late arrival in morning', () => {
        const participant = createParticipant('Test User', [
          {
            joinTime: new Date(2025, 6, 8, 10, 30), // Late arrival
            leaveTime: new Date(2025, 6, 8, 13, 0)
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'morning'
        );

        expect(hours).toContain(10);
        expect(hours).toContain(11);
        expect(hours).toContain(12);
        expect(hours).toContain(13);
        expect(hours).not.toContain(9); // Should not include hour 9
      });
    });

    describe('Afternoon Only Lessons', () => {
      it('should calculate hours for afternoon lesson (14-18)', () => {
        const participant = createParticipant('Test User', [], [
          {
            joinTime: new Date(2025, 6, 8, 14, 0),
            leaveTime: new Date(2025, 6, 8, 18, 0)
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'afternoon'
        );

        expect(hours).toContain(14);
        expect(hours).toContain(15);
        expect(hours).toContain(16);
        expect(hours).toContain(17);
        expect(hours).toContain(18);
        expect(hours.length).toBe(5);
      });

      it('should respect LESSON_HOURS.AFTERNOON boundaries (14-18)', () => {
        const participant = createParticipant('Test User', [], [
          {
            joinTime: new Date(2025, 6, 8, 13, 30), // Before 14:00
            leaveTime: new Date(2025, 6, 8, 19, 0) // After 18:00
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'afternoon'
        );

        expect(hours[0]).toBe(LESSON_HOURS.AFTERNOON.START);
        expect(hours[hours.length - 1]).toBe(LESSON_HOURS.AFTERNOON.END);
        expect(hours).not.toContain(13);
        expect(hours).not.toContain(19);
      });
    });

    describe('Full Day Lessons (Both)', () => {
      it('should calculate hours for both morning and afternoon', () => {
        const participant = createParticipant('Test User',
          [{
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 13, 0)
          }],
          [{
            joinTime: new Date(2025, 6, 8, 14, 0),
            leaveTime: new Date(2025, 6, 8, 18, 0)
          }]
        );

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'both'
        );

        // Should include morning hours (9-13)
        expect(hours).toContain(9);
        expect(hours).toContain(13);

        // Should include afternoon hours (14-18)
        expect(hours).toContain(14);
        expect(hours).toContain(18);

        // Should NOT include lunch break (13:00-14:00 is break)
        expect(hours.length).toBe(10); // 5 morning + 5 afternoon
      });

      it('should handle gaps in attendance', () => {
        const participant = createParticipant('Test User',
          [{
            joinTime: new Date(2025, 6, 8, 10, 0), // Missing hour 9
            leaveTime: new Date(2025, 6, 8, 12, 0) // Missing hour 13
          }],
          [{
            joinTime: new Date(2025, 6, 8, 15, 0), // Missing hour 14
            leaveTime: new Date(2025, 6, 8, 17, 0) // Missing hour 18
          }]
        );

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'both'
        );

        // Only hours when participant was present
        expect(hours).toContain(10);
        expect(hours).toContain(11);
        expect(hours).toContain(12);
        expect(hours).toContain(15);
        expect(hours).toContain(16);
        expect(hours).toContain(17);

        // Missing hours should not be included
        expect(hours).not.toContain(9);
        expect(hours).not.toContain(13);
        expect(hours).not.toContain(14);
        expect(hours).not.toContain(18);
      });
    });

    describe('Fast Mode Lessons', () => {
      it('should include all hours with any participant presence', () => {
        const participant = createParticipant('Test User',
          [{
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 11, 0)
          }],
          [{
            joinTime: new Date(2025, 6, 8, 16, 0),
            leaveTime: new Date(2025, 6, 8, 18, 0)
          }]
        );

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'fast'
        );

        // Fast mode should include hours based on actual attendance
        expect(hours).toContain(9);
        expect(hours).toContain(10);
        expect(hours).toContain(11);
        expect(hours).toContain(16);
        expect(hours).toContain(17);
        expect(hours).toContain(18);
      });

      it('should handle single session in fast mode', () => {
        const participant = createParticipant('Test User',
          [{
            joinTime: new Date(2025, 6, 8, 10, 30),
            leaveTime: new Date(2025, 6, 8, 12, 30)
          }]
        );

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'fast'
        );

        expect(hours).toContain(10);
        expect(hours).toContain(11);
        expect(hours).toContain(12);
      });
    });

    describe('Multiple Participants', () => {
      it('should combine hours from all participants', () => {
        const participant1 = createParticipant('User 1', [
          {
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 11, 0)
          }
        ]);

        const participant2 = createParticipant('User 2', [
          {
            joinTime: new Date(2025, 6, 8, 11, 0),
            leaveTime: new Date(2025, 6, 8, 13, 0)
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant1, participant2],
          null,
          'morning'
        );

        // Should include hours covered by either participant
        expect(hours).toContain(9);
        expect(hours).toContain(10);
        expect(hours).toContain(11);
        expect(hours).toContain(12);
        expect(hours).toContain(13);
      });

      it('should include organizer hours', () => {
        const participant = createParticipant('Student', [
          {
            joinTime: new Date(2025, 6, 8, 10, 0),
            leaveTime: new Date(2025, 6, 8, 12, 0)
          }
        ]);

        const organizer = createParticipant('Organizer', [
          {
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 13, 0)
          }
        ]);
        organizer.isOrganizer = true;

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          organizer,
          'morning'
        );

        // Should include organizer's full range (9-13)
        expect(hours).toContain(9);
        expect(hours).toContain(13);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty participants list', () => {
        const hours = LessonService.calculateDynamicLessonHours(
          [],
          null,
          'morning'
        );

        expect(hours).toEqual([]);
      });

      it('should handle participant with no connections', () => {
        const participant = createParticipant('Test User');

        const hours = LessonService.calculateDynamicLessonHours(
          [participant],
          null,
          'morning'
        );

        expect(hours).toEqual([]);
      });

      it('should return sorted hours', () => {
        const participant1 = createParticipant('User 1', [], [
          {
            joinTime: new Date(2025, 6, 8, 16, 0),
            leaveTime: new Date(2025, 6, 8, 18, 0)
          }
        ]);

        const participant2 = createParticipant('User 2', [
          {
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 11, 0)
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant1, participant2],
          null,
          'both'
        );

        // Hours should be sorted
        for (let i = 0; i < hours.length - 1; i++) {
          expect(hours[i]).toBeLessThan(hours[i + 1]);
        }
      });

      it('should deduplicate hours', () => {
        const participant1 = createParticipant('User 1', [
          {
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 11, 0)
          }
        ]);

        const participant2 = createParticipant('User 2', [
          {
            joinTime: new Date(2025, 6, 8, 9, 0),
            leaveTime: new Date(2025, 6, 8, 11, 0)
          }
        ]);

        const hours = LessonService.calculateDynamicLessonHours(
          [participant1, participant2],
          null,
          'morning'
        );

        // Each hour should appear only once
        const uniqueHours = new Set(hours);
        expect(uniqueHours.size).toBe(hours.length);
      });
    });
  });

  describe('validateLessonRequirements', () => {
    const mockTemplate = new File([], 'template.docx');
    const mockCSV = new File([], 'data.csv');

    it('should require template and subject', () => {
      const error = LessonService.validateLessonRequirements(
        'morning',
        mockCSV,
        null,
        null,
        ''
      );

      expect(error).toBe('MISSING_TEMPLATE_OR_SUBJECT');
    });

    it('should require subject even with template', () => {
      const error = LessonService.validateLessonRequirements(
        'morning',
        mockCSV,
        null,
        mockTemplate,
        ''
      );

      expect(error).toBe('MISSING_TEMPLATE_OR_SUBJECT');
    });

    it('should validate morning lesson requires morning file', () => {
      const error = LessonService.validateLessonRequirements(
        'morning',
        null,
        null,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBe('MISSING_MORNING_FILE');
    });

    it('should validate afternoon lesson requires afternoon file', () => {
      const error = LessonService.validateLessonRequirements(
        'afternoon',
        null,
        null,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBe('MISSING_AFTERNOON_FILE');
    });

    it('should validate both lesson requires both files', () => {
      const error = LessonService.validateLessonRequirements(
        'both',
        mockCSV,
        null,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBe('MISSING_BOTH_FILES');
    });

    it('should validate fast mode requires at least one file', () => {
      const error = LessonService.validateLessonRequirements(
        'fast',
        null,
        null,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBe('MISSING_FAST_FILES');
    });

    it('should pass validation for valid morning lesson', () => {
      const error = LessonService.validateLessonRequirements(
        'morning',
        mockCSV,
        null,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBeNull();
    });

    it('should pass validation for valid afternoon lesson', () => {
      const error = LessonService.validateLessonRequirements(
        'afternoon',
        null,
        mockCSV,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBeNull();
    });

    it('should pass validation for valid both lesson', () => {
      const error = LessonService.validateLessonRequirements(
        'both',
        mockCSV,
        mockCSV,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBeNull();
    });

    it('should pass validation for fast mode with only morning file', () => {
      const error = LessonService.validateLessonRequirements(
        'fast',
        mockCSV,
        null,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBeNull();
    });

    it('should pass validation for fast mode with only afternoon file', () => {
      const error = LessonService.validateLessonRequirements(
        'fast',
        null,
        mockCSV,
        mockTemplate,
        'Test Subject'
      );

      expect(error).toBeNull();
    });
  });
});
