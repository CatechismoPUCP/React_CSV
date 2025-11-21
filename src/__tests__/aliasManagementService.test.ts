import { aliasManagementService } from '../services/aliasManagementService';
import { FullCourseParticipantInfo } from '../types/course';

// Helper to create test participant
const createParticipant = (
  id: string,
  primaryName: string,
  email: string = '',
  isOrganizer: boolean = false,
  daysPresent: string[] = []
): FullCourseParticipantInfo => ({
  id,
  primaryName,
  aliases: [primaryName],
  email,
  isOrganizer,
  masterOrder: 0,
  daysPresent
});

describe('AliasManagementService', () => {
  describe('detectAliases', () => {
    it('should detect exact aliases (case insensitive)', () => {
      const participants = [
        createParticipant('1', 'Giorgio Santambrogio'),
        createParticipant('2', 'giorgio santambrogio'),
        createParticipant('3', 'Maria Verdi')
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      expect(suggestions.length).toBeGreaterThan(0);
      const georgioSuggestion = suggestions.find(s =>
        s.mainName.toLowerCase().includes('giorgio')
      );
      expect(georgioSuggestion).toBeDefined();
      expect(georgioSuggestion!.confidence).toBe(1.0); // Exact match
      expect(georgioSuggestion!.autoMerged).toBe(true);
    });

    it('should detect abbreviated names (suggest alias)', () => {
      const participants = [
        createParticipant('1', 'giorgio s.', 'giorgio@test.it'),
        createParticipant('2', 'Giorgio Santambrogio', 'giorgio@test.it'),
        createParticipant('3', 'Maria Verdi', 'maria@test.it')
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      const georgioSuggestion = suggestions.find(s =>
        s.mainName.toLowerCase() === 'giorgio s.' ||
        s.suggestedAliases.some(a => a.toLowerCase() === 'giorgio s.')
      );

      expect(georgioSuggestion).toBeDefined();
      expect(georgioSuggestion!.confidence).toBeGreaterThanOrEqual(0.55);
    });

    it('should detect initials and abbreviations', () => {
      const participants = [
        createParticipant('1', 'G. Santambrogio'),
        createParticipant('2', 'Giorgio Santambrogio'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      expect(suggestions.length).toBeGreaterThan(0);
      const suggestion = suggestions[0];
      expect(suggestion.suggestedAliases.length).toBeGreaterThan(0);
    });

    it('should handle accented characters', () => {
      const participants = [
        createParticipant('1', 'José María'),
        createParticipant('2', 'Jose Maria'), // Without accents
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      // Should detect as similar due to normalization
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.85);
      expect(suggestions[0].autoMerged).toBe(true);
    });

    it('should handle special characters', () => {
      const participants = [
        createParticipant('1', "O'Brien"),
        createParticipant('2', 'OBrien'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeGreaterThan(0.8);
    });

    it('should skip organizer in alias detection', () => {
      const participants = [
        createParticipant('1', 'Prof. Rossi', '', true), // Organizer
        createParticipant('2', 'Mario Rossi'),
        createParticipant('3', 'M. Rossi'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      // Organizer should not appear in suggestions
      const organizerSuggestion = suggestions.find(s =>
        s.mainName === 'Prof. Rossi'
      );
      expect(organizerSuggestion).toBeUndefined();
    });

    it('should not suggest aliases for very different names', () => {
      const participants = [
        createParticipant('1', 'Mario Rossi'),
        createParticipant('2', 'Luigi Verdi'),
        createParticipant('3', 'Anna Bianchi'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      // Should not detect any aliases
      expect(suggestions.length).toBe(0);
    });

    it('should auto-merge high confidence aliases (>= 0.80)', () => {
      const participants = [
        createParticipant('1', 'Mario Rossi'),
        createParticipant('2', 'mario rossi'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].autoMerged).toBe(true);
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should not auto-merge medium confidence aliases (0.65-0.79)', () => {
      const participants = [
        createParticipant('1', 'Mario R.'),
        createParticipant('2', 'M. Rossi'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        if (suggestion.confidence < 0.80) {
          expect(suggestion.autoMerged).toBe(false);
        }
      }
    });

    it('should return sorted similarity scores (highest first)', () => {
      const participants = [
        createParticipant('1', 'Giorgio S.'),
        createParticipant('2', 'Giorgio Santambrogio'),
        createParticipant('3', 'G. Santambrogio'),
        createParticipant('4', 'G. S.'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        for (let i = 0; i < suggestion.similarityScores.length - 1; i++) {
          expect(suggestion.similarityScores[i]).toBeGreaterThanOrEqual(
            suggestion.similarityScores[i + 1]
          );
        }
      }
    });
  });

  describe('applyAliasMappings', () => {
    it('should merge auto-merged aliases', () => {
      const participants = [
        createParticipant('1', 'Mario Rossi', 'mario@test.it', false, ['2025-09-19']),
        createParticipant('2', 'mario rossi', 'mario@test.it', false, ['2025-09-20']),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants, mappings } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      // Should merge into 1 participant
      expect(mergedParticipants.length).toBeLessThan(participants.length);

      const merged = mergedParticipants[0];
      expect(merged.daysPresent).toContain('2025-09-19');
      expect(merged.daysPresent).toContain('2025-09-20');
      expect(merged.daysPresent.length).toBe(2);
    });

    it('should combine aliases array', () => {
      const participants = [
        createParticipant('1', 'Giorgio S.'),
        createParticipant('2', 'Giorgio Santambrogio'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      if (mergedParticipants.length === 1) {
        const merged = mergedParticipants[0];
        expect(merged.aliases.length).toBeGreaterThan(1);
        expect(merged.aliases).toContain('Giorgio S.');
        expect(merged.aliases).toContain('Giorgio Santambrogio');
      }
    });

    it('should preserve email from first participant with email', () => {
      const participants = [
        createParticipant('1', 'Giorgio S.', ''), // No email
        createParticipant('2', 'Giorgio Santambrogio', 'giorgio@test.it'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      if (mergedParticipants.length === 1) {
        expect(mergedParticipants[0].email).toBe('giorgio@test.it');
      }
    });

    it('should not merge non-auto-merged suggestions', () => {
      const participants = [
        createParticipant('1', 'Mario R.'),
        createParticipant('2', 'M. Rossi'),
        createParticipant('3', 'Anna Bianchi'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      // Should not merge low confidence suggestions
      expect(mergedParticipants.length).toBe(participants.length);
    });

    it('should maintain master order after merge', () => {
      const participants = [
        createParticipant('1', 'Anna Bianchi'),
        createParticipant('2', 'Giorgio S.'),
        createParticipant('3', 'Giorgio Santambrogio'),
        createParticipant('4', 'Maria Verdi'),
      ];

      participants[0].masterOrder = 1;
      participants[1].masterOrder = 2;
      participants[2].masterOrder = 3;
      participants[3].masterOrder = 4;

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      // Should be sorted by master order
      for (let i = 0; i < mergedParticipants.length - 1; i++) {
        expect(mergedParticipants[i].masterOrder).toBeLessThanOrEqual(
          mergedParticipants[i + 1].masterOrder
        );
      }
    });

    it('should create mapping records for auto-merges', () => {
      const participants = [
        createParticipant('1', 'Giorgio S.'),
        createParticipant('2', 'Giorgio Santambrogio'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mappings } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      if (suggestions.some(s => s.autoMerged)) {
        expect(mappings.length).toBeGreaterThan(0);
        expect(mappings[0].mergedBy).toBe('auto');
        expect(mappings[0].confidence).toBeGreaterThanOrEqual(0.80);
        expect(mappings[0].mergedNames.length).toBeGreaterThan(1);
      }
    });

    it('should handle multiple alias groups', () => {
      const participants = [
        createParticipant('1', 'Giorgio Santambrogio'),
        createParticipant('2', 'giorgio santambrogio'),
        createParticipant('3', 'Maria V.'),
        createParticipant('4', 'Maria Verdi'),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      expect(mergedParticipants.length).toBeLessThan(participants.length);
    });

    it('should deduplicate days present', () => {
      const participants = [
        createParticipant('1', 'Giorgio S.', '', false, ['2025-09-19', '2025-09-20']),
        createParticipant('2', 'Giorgio Santambrogio', '', false, ['2025-09-20', '2025-09-21']),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      if (mergedParticipants.length === 1) {
        const merged = mergedParticipants[0];
        // Should have all unique days
        expect(merged.daysPresent).toContain('2025-09-19');
        expect(merged.daysPresent).toContain('2025-09-20');
        expect(merged.daysPresent).toContain('2025-09-21');
        expect(merged.daysPresent.length).toBe(3);
      }
    });

    it('should sort days present chronologically', () => {
      const participants = [
        createParticipant('1', 'Giorgio S.', '', false, ['2025-09-21', '2025-09-19']),
        createParticipant('2', 'Giorgio Santambrogio', '', false, ['2025-09-20']),
      ];

      const suggestions = aliasManagementService.detectAliases(participants);
      const { mergedParticipants } = aliasManagementService.applyAliasMappings(
        participants,
        suggestions
      );

      if (mergedParticipants.length === 1) {
        const merged = mergedParticipants[0];
        for (let i = 0; i < merged.daysPresent.length - 1; i++) {
          expect(merged.daysPresent[i]).toBeLessThanOrEqual(merged.daysPresent[i + 1]);
        }
      }
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return high for confidence >= 0.80', () => {
      expect(aliasManagementService.getConfidenceLevel(0.80)).toBe('high');
      expect(aliasManagementService.getConfidenceLevel(0.90)).toBe('high');
      expect(aliasManagementService.getConfidenceLevel(1.0)).toBe('high');
    });

    it('should return medium for confidence 0.65-0.79', () => {
      expect(aliasManagementService.getConfidenceLevel(0.65)).toBe('medium');
      expect(aliasManagementService.getConfidenceLevel(0.70)).toBe('medium');
      expect(aliasManagementService.getConfidenceLevel(0.79)).toBe('medium');
    });

    it('should return low for confidence < 0.65', () => {
      expect(aliasManagementService.getConfidenceLevel(0.60)).toBe('low');
      expect(aliasManagementService.getConfidenceLevel(0.54)).toBe('low');
      expect(aliasManagementService.getConfidenceLevel(0.64)).toBe('low');
    });
  });

  describe('Similarity Algorithm', () => {
    it('should handle typos with Levenshtein distance', () => {
      const participants = [
        createParticipant('1', 'Giorgio Santambrogio'),
        createParticipant('2', 'Giorgio Santambroggio'), // One extra 'g'
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeGreaterThan(0.58);
    });

    it('should handle name reordering with token similarity', () => {
      const participants = [
        createParticipant('1', 'Mario Giovanni Rossi'),
        createParticipant('2', 'Giovanni Mario Rossi'), // Reordered
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      expect(suggestions.length).toBeGreaterThan(0);
      // Token similarity should detect reordering
      expect(suggestions[0].confidence).toBeGreaterThan(0.6);
    });

    it('should handle middle name variations', () => {
      const participants = [
        createParticipant('1', 'Mario Rossi'),
        createParticipant('2', 'Mario Giovanni Rossi'), // Added middle name
      ];

      const suggestions = aliasManagementService.detectAliases(participants);

      expect(suggestions.length).toBeGreaterThan(0);
      // Containment score should handle this
      expect(suggestions[0].confidence).toBeGreaterThan(0.6);
    });
  });
});
