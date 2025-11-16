import {
  FullCourseParticipantInfo,
  AliasSuggestion,
  AliasMapping,
} from '../types/course';

/**
 * Service for managing participant aliases and automatic name matching
 * Uses Levenshtein distance and other heuristics to detect similar names
 */
export class AliasManagementService {
  // Thresholds for automatic merging
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.70;
  private readonly LOW_CONFIDENCE_THRESHOLD = 0.60;

  /**
   * Analyze participants and suggest aliases based on name similarity
   */
  detectAliases(participants: FullCourseParticipantInfo[]): AliasSuggestion[] {
    const suggestions: AliasSuggestion[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];

      // Skip organizer and already processed
      if (participant.isOrganizer || processed.has(participant.id)) {
        continue;
      }

      const similarParticipants: Array<{
        participant: FullCourseParticipantInfo;
        similarity: number;
      }> = [];

      // Compare with all other participants
      for (let j = i + 1; j < participants.length; j++) {
        const other = participants[j];

        if (other.isOrganizer || processed.has(other.id)) {
          continue;
        }

        const similarity = this.calculateNameSimilarity(
          participant.primaryName,
          other.primaryName
        );

        // Only consider if similarity is above low threshold
        if (similarity >= this.LOW_CONFIDENCE_THRESHOLD) {
          similarParticipants.push({ participant: other, similarity });
        }
      }

      // If we found similar names, create suggestion
      if (similarParticipants.length > 0) {
        // Sort by similarity (highest first)
        similarParticipants.sort((a, b) => b.similarity - a.similarity);

        const suggestedAliases = similarParticipants.map(s => s.participant.primaryName);
        const similarityScores = similarParticipants.map(s => s.similarity);
        const maxSimilarity = Math.max(...similarityScores);

        // Auto-merge if high confidence
        const autoMerged = maxSimilarity >= this.HIGH_CONFIDENCE_THRESHOLD;

        suggestions.push({
          participantId: participant.id,
          mainName: participant.primaryName,
          suggestedAliases,
          similarityScores,
          autoMerged,
          confidence: maxSimilarity,
        });

        // Mark all as processed if auto-merged
        if (autoMerged) {
          processed.add(participant.id);
          similarParticipants.forEach(s => processed.add(s.participant.id));
        }
      }
    }

    return suggestions;
  }

  /**
   * Apply alias mappings to participants list
   * Returns merged participants list
   */
  applyAliasMappings(
    participants: FullCourseParticipantInfo[],
    suggestions: AliasSuggestion[]
  ): {
    mergedParticipants: FullCourseParticipantInfo[];
    mappings: AliasMapping[];
  } {
    const mappings: AliasMapping[] = [];
    const participantMap = new Map<string, FullCourseParticipantInfo>();

    // Initialize map with all participants
    participants.forEach(p => participantMap.set(p.id, { ...p }));

    // Apply auto-merged suggestions
    for (const suggestion of suggestions) {
      if (!suggestion.autoMerged) continue;

      const mainParticipant = participantMap.get(suggestion.participantId);
      if (!mainParticipant) continue;

      const mergedNames: string[] = [mainParticipant.primaryName];
      const mergedDays = new Set(mainParticipant.daysPresent);

      // Find and merge similar participants
      for (let i = 0; i < suggestion.suggestedAliases.length; i++) {
        const aliasName = suggestion.suggestedAliases[i];
        const similarity = suggestion.similarityScores[i];

        // Only merge if high similarity
        if (similarity < this.HIGH_CONFIDENCE_THRESHOLD) continue;

        // Find participant with this name
        const aliasParticipant = Array.from(participantMap.values()).find(
          p => p.primaryName === aliasName
        );

        if (!aliasParticipant) continue;

        // Merge data
        mergedNames.push(aliasParticipant.primaryName);
        aliasParticipant.daysPresent.forEach(day => mergedDays.add(day));

        // Use email from alias if main doesn't have one
        if (!mainParticipant.email && aliasParticipant.email) {
          mainParticipant.email = aliasParticipant.email;
        }

        // Remove merged participant
        participantMap.delete(aliasParticipant.id);
      }

      // Update main participant
      mainParticipant.aliases = mergedNames;
      mainParticipant.daysPresent = Array.from(mergedDays).sort();

      // Create mapping record
      mappings.push({
        participantId: mainParticipant.id,
        primaryName: mainParticipant.primaryName,
        mergedNames,
        mergedBy: 'auto',
        confidence: suggestion.confidence,
      });
    }

    const mergedParticipants = Array.from(participantMap.values())
      .sort((a, b) => a.masterOrder - b.masterOrder);

    return { mergedParticipants, mappings };
  }

  /**
   * Calculate name similarity using multiple heuristics
   * Returns a score between 0 (completely different) and 1 (identical)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeName(name1);
    const normalized2 = this.normalizeName(name2);

    // Exact match
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Check if one is contained in the other (e.g., "giorgio s." vs "Giorgio santambrogio")
    const containmentScore = this.calculateContainmentScore(normalized1, normalized2);

    // Levenshtein distance
    const levenshteinScore = this.calculateLevenshteinSimilarity(normalized1, normalized2);

    // Token-based similarity (individual words)
    const tokenScore = this.calculateTokenSimilarity(normalized1, normalized2);

    // Weighted average
    const similarity =
      containmentScore * 0.4 +
      levenshteinScore * 0.3 +
      tokenScore * 0.3;

    return similarity;
  }

  /**
   * Normalize name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Check if one name contains the other
   */
  private calculateContainmentScore(name1: string, name2: string): number {
    const shorter = name1.length < name2.length ? name1 : name2;
    const longer = name1.length < name2.length ? name2 : name1;

    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Check individual tokens
    const tokens1 = name1.split(/\s+/).filter(t => t.length > 1);
    const tokens2 = name2.split(/\s+/).filter(t => t.length > 1);

    let matches = 0;
    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        if (token1 === token2 || token1.includes(token2) || token2.includes(token1)) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(tokens1.length, tokens2.length);
  }

  /**
   * Calculate similarity using Levenshtein distance
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 1.0;

    return 1 - (distance / maxLength);
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calculate token-based similarity
   */
  private calculateTokenSimilarity(name1: string, name2: string): number {
    const tokens1 = new Set(name1.split(/\s+/).filter(t => t.length > 1));
    const tokens2 = new Set(name2.split(/\s+/).filter(t => t.length > 1));

    if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
    if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

    // Calculate Jaccard similarity
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD) return 'high';
    if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
    return 'low';
  }
}

// Singleton instance
export const aliasManagementService = new AliasManagementService();
