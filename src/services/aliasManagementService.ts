import {
  FullCourseParticipantInfo,
  AliasSuggestion,
  AliasMapping,
} from '../types/course';

// ============================================================================
// CONSTANTS
// ============================================================================

const HIGH_CONFIDENCE_THRESHOLD = 0.80;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.65;
const LOW_CONFIDENCE_THRESHOLD = 0.55;

const CONTAINMENT_WEIGHT = 0.4;
const LEVENSHTEIN_WEIGHT = 0.3;
const TOKEN_WEIGHT = 0.3;
const ABBREVIATION_BOOST_MAX = 0.20;

/** Minimum token length to consider in token matching */
const MIN_TOKEN_LENGTH = 1;

// ============================================================================
// ALIAS MANAGEMENT SERVICE
// ============================================================================

/**
 * Service for managing participant aliases and automatic name matching.
 *
 * This service provides:
 * - Automatic detection of similar participant names
 * - Multi-metric similarity scoring:
 *   - Containment matching (substring detection)
 *   - Levenshtein distance (edit distance)
 *   - Token-based similarity (word matching)
 * - Confidence-based auto-merging
 * - Alias mapping application
 *
 * @remarks
 * Uses a weighted combination of three similarity algorithms to handle
 * different name variations (abbreviations, typos, middle names, etc.)
 *
 * @example
 * ```ts
 * const suggestions = aliasService.detectAliases(participants);
 * // Returns: [{ mainName: "giorgio s.", suggestedAliases: ["Giorgio santambrogio"], ... }]
 *
 * const { mergedParticipants } = aliasService.applyAliasMappings(participants, suggestions);
 * ```
 */
export class AliasManagementService {
  // ============================================================================
  // ALIAS DETECTION
  // ============================================================================

  /**
   * Analyzes participants and suggests aliases based on name similarity.
   *
   * Compares all participants pairwise to find similar names. Names with
   * similarity above LOW_CONFIDENCE_THRESHOLD are suggested as potential aliases.
   * Names with similarity above HIGH_CONFIDENCE_THRESHOLD are automatically merged.
   *
   * @param participants - Array of participants to analyze
   * @returns Array of alias suggestions with confidence scores
   *
   * @example
   * ```ts
   * const participants = [
   *   { primaryName: "giorgio s.", ... },
   *   { primaryName: "Giorgio santambrogio", ... }
   * ];
   * const suggestions = service.detectAliases(participants);
   * // Returns suggestion with confidence ~0.9, auto-merged
   * ```
   */
  detectAliases(participants: FullCourseParticipantInfo[]): AliasSuggestion[] {
    const suggestions: AliasSuggestion[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];

      if (this.shouldSkipParticipant(participant, processed)) {
        continue;
      }

      const similarParticipants = this.findSimilarParticipants(
        participant,
        participants,
        i,
        processed
      );

      if (similarParticipants.length > 0) {
        const suggestion = this.createAliasSuggestion(participant, similarParticipants);
        suggestions.push(suggestion);

        if (suggestion.autoMerged) {
          this.markParticipantsAsProcessed(processed, participant, similarParticipants);
        }
      }
    }

    return suggestions;
  }

  /**
   * Checks if a participant should be skipped in alias detection.
   *
   * @private
   * @param participant - Participant to check
   * @param processed - Set of already processed participant IDs
   * @returns True if participant should be skipped
   */
  private shouldSkipParticipant(
    participant: FullCourseParticipantInfo,
    processed: Set<string>
  ): boolean {
    return participant.isOrganizer || processed.has(participant.id);
  }

  /**
   * Finds all participants similar to the given participant.
   *
   * @private
   * @param participant - Participant to compare against
   * @param allParticipants - Full list of participants
   * @param startIndex - Index to start comparing from
   * @param processed - Set of processed participant IDs
   * @returns Array of similar participants with similarity scores
   */
  private findSimilarParticipants(
    participant: FullCourseParticipantInfo,
    allParticipants: FullCourseParticipantInfo[],
    startIndex: number,
    processed: Set<string>
  ): Array<{ participant: FullCourseParticipantInfo; similarity: number }> {
    const similarParticipants: Array<{
      participant: FullCourseParticipantInfo;
      similarity: number;
    }> = [];

    for (let j = startIndex + 1; j < allParticipants.length; j++) {
      const other = allParticipants[j];

      if (this.shouldSkipParticipant(other, processed)) {
        continue;
      }

      const similarity = this.calculateNameSimilarity(
        participant.primaryName,
        other.primaryName
      );

      if (similarity >= LOW_CONFIDENCE_THRESHOLD) {
        similarParticipants.push({ participant: other, similarity });
      }
    }

    return similarParticipants.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Creates an alias suggestion from similar participants.
   *
   * @private
   * @param participant - Main participant
   * @param similarParticipants - Array of similar participants with scores
   * @returns Alias suggestion object
   */
  private createAliasSuggestion(
    participant: FullCourseParticipantInfo,
    similarParticipants: Array<{ participant: FullCourseParticipantInfo; similarity: number }>
  ): AliasSuggestion {
    const suggestedAliases = similarParticipants.map(s => s.participant.primaryName);
    const similarityScores = similarParticipants.map(s => s.similarity);
    const maxSimilarity = Math.max(...similarityScores);
    const autoMerged = maxSimilarity >= HIGH_CONFIDENCE_THRESHOLD;

    return {
      participantId: participant.id,
      mainName: participant.primaryName,
      suggestedAliases,
      similarityScores,
      autoMerged,
      confidence: maxSimilarity,
    };
  }

  /**
   * Marks participants as processed to avoid duplicate suggestions.
   *
   * @private
   * @param processed - Set to add IDs to
   * @param mainParticipant - Main participant
   * @param similarParticipants - Similar participants to mark
   */
  private markParticipantsAsProcessed(
    processed: Set<string>,
    mainParticipant: FullCourseParticipantInfo,
    similarParticipants: Array<{ participant: FullCourseParticipantInfo; similarity: number }>
  ): void {
    processed.add(mainParticipant.id);
    similarParticipants.forEach(s => processed.add(s.participant.id));
  }

  // ============================================================================
  // ALIAS APPLICATION
  // ============================================================================

  /**
   * Applies alias mappings to participants list.
   *
   * Merges participants based on auto-merged suggestions:
   * - Combines aliases into a single participant
   * - Merges days present from all aliases
   * - Preserves email addresses (uses first non-empty)
   * - Maintains master ordering
   *
   * @param participants - Original participants list
   * @param suggestions - Alias suggestions from detectAliases
   * @returns Object with merged participants and mapping records
   *
   * @example
   * ```ts
   * const { mergedParticipants, mappings } = service.applyAliasMappings(
   *   participants,
   *   suggestions
   * );
   * // mergedParticipants.length < participants.length (duplicates merged)
   * // mappings contains record of all merges
   * ```
   */
  applyAliasMappings(
    participants: FullCourseParticipantInfo[],
    suggestions: AliasSuggestion[],
    options?: { forceMergeAll?: boolean }
  ): {
    mergedParticipants: FullCourseParticipantInfo[];
    mappings: AliasMapping[];
  } {
    const mappings: AliasMapping[] = [];
    const participantMap = this.initializeParticipantMap(participants);

    // Apply auto-merged suggestions
    const force = options?.forceMergeAll === true;
    for (const suggestion of suggestions) {
      if (!force && !suggestion.autoMerged) continue;

      const mapping = this.mergeSuggestion(participantMap, suggestion, force);
      if (mapping) {
        mappings.push(mapping);
      }
    }

    const mergedParticipants = this.extractSortedParticipants(participantMap);

    return { mergedParticipants, mappings };
  }

  /**
   * Initializes participant map from array.
   *
   * @private
   * @param participants - Array of participants
   * @returns Map of participant ID to participant data
   */
  private initializeParticipantMap(
    participants: FullCourseParticipantInfo[]
  ): Map<string, FullCourseParticipantInfo> {
    const map = new Map<string, FullCourseParticipantInfo>();
    participants.forEach(p => map.set(p.id, { ...p }));
    return map;
  }

  /**
   * Merges a single alias suggestion into the participant map.
   *
   * @private
   * @param participantMap - Map to merge into
   * @param suggestion - Alias suggestion to merge
   * @returns Alias mapping record, or null if merge failed
   */
  private mergeSuggestion(
    participantMap: Map<string, FullCourseParticipantInfo>,
    suggestion: AliasSuggestion,
    force: boolean
  ): AliasMapping | null {
    const mainParticipant = participantMap.get(suggestion.participantId);
    if (!mainParticipant) return null;

    const mergedNames: string[] = [mainParticipant.primaryName];
    const mergedDays = new Set(mainParticipant.daysPresent);

    // Process each suggested alias
    for (let i = 0; i < suggestion.suggestedAliases.length; i++) {
      const aliasName = suggestion.suggestedAliases[i];
      const similarity = suggestion.similarityScores[i];
      if (similarity < HIGH_CONFIDENCE_THRESHOLD && !force) continue;

      this.mergeAliasIntoMain(
        participantMap,
        mainParticipant,
        aliasName,
        mergedNames,
        mergedDays
      );
    }

    // Update main participant with merged data
    mainParticipant.aliases = mergedNames;
    mainParticipant.daysPresent = Array.from(mergedDays).sort();

    return {
      participantId: mainParticipant.id,
      primaryName: mainParticipant.primaryName,
      mergedNames,
      mergedBy: force ? 'manual' : 'auto',
      confidence: suggestion.confidence,
    };
  }

  /**
   * Merges an alias participant into the main participant.
   *
   * @private
   * @param participantMap - Participant map
   * @param mainParticipant - Main participant to merge into
   * @param aliasName - Name of alias to merge
   * @param mergedNames - Array to add merged names to
   * @param mergedDays - Set to add merged days to
   */
  private mergeAliasIntoMain(
    participantMap: Map<string, FullCourseParticipantInfo>,
    mainParticipant: FullCourseParticipantInfo,
    aliasName: string,
    mergedNames: string[],
    mergedDays: Set<string>
  ): void {
    const aliasParticipant = this.findParticipantByName(participantMap, aliasName);
    if (!aliasParticipant) return;

    // Merge data
    mergedNames.push(aliasParticipant.primaryName);
    aliasParticipant.daysPresent.forEach(day => mergedDays.add(day));

    // Use alias email if main doesn't have one
    if (!mainParticipant.email && aliasParticipant.email) {
      mainParticipant.email = aliasParticipant.email;
    }

    // Remove merged participant from map
    participantMap.delete(aliasParticipant.id);
  }

  /**
   * Finds a participant by primary name.
   *
   * @private
   * @param participantMap - Map to search
   * @param name - Primary name to find
   * @returns Participant or undefined if not found
   */
  private findParticipantByName(
    participantMap: Map<string, FullCourseParticipantInfo>,
    name: string
  ): FullCourseParticipantInfo | undefined {
    return Array.from(participantMap.values()).find(p => p.primaryName === name);
  }

  /**
   * Extracts participants from map and sorts by master order.
   *
   * @private
   * @param participantMap - Map to extract from
   * @returns Sorted array of participants
   */
  private extractSortedParticipants(
    participantMap: Map<string, FullCourseParticipantInfo>
  ): FullCourseParticipantInfo[] {
    return Array.from(participantMap.values()).sort((a, b) => a.masterOrder - b.masterOrder);
  }

  // ============================================================================
  // SIMILARITY CALCULATION
  // ============================================================================

  /**
   * Calculates name similarity using multiple heuristics.
   *
   * Combines three similarity metrics with weighted average:
   * - 40% Containment score (substring matching)
   * - 30% Levenshtein distance (edit distance)
   * - 30% Token similarity (word-based Jaccard)
   *
   * @private
   * @param name1 - First name to compare
   * @param name2 - Second name to compare
   * @returns Similarity score between 0 (completely different) and 1 (identical)
   *
   * @example
   * ```ts
   * const similarity = this.calculateNameSimilarity("giorgio s.", "Giorgio santambrogio");
   * // Returns: ~0.9 (high similarity due to containment and token match)
   * ```
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeName(name1);
    const normalized2 = this.normalizeName(name2);

    // Exact match check
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Calculate individual similarity metrics
    const containmentScore = this.calculateContainmentScore(normalized1, normalized2);
    const levenshteinScore = this.calculateLevenshteinSimilarity(normalized1, normalized2);
    const tokenScore = this.calculateTokenSimilarity(normalized1, normalized2);

    // Weighted average
    let similarity =
      containmentScore * CONTAINMENT_WEIGHT +
      levenshteinScore * LEVENSHTEIN_WEIGHT +
      tokenScore * TOKEN_WEIGHT;

    const abbrBoost = this.calculateAbbreviationBoost(normalized1, normalized2);
    similarity = Math.min(1, similarity + abbrBoost);

    return similarity;
  }

  private calculateAbbreviationBoost(n1: string, n2: string): number {
    const t1 = this.extractTokens(n1);
    const t2 = this.extractTokens(n2);

    let boost = 0;
    for (const tok1 of t1) {
      if (tok1.length === 1) {
        const match = Array.from(t2).some(tok2 => tok2.startsWith(tok1));
        if (match) boost += 0.10;
      } else if (tok1.length === 2 && tok1.endsWith('s')) {
        const base = tok1[0];
        const match = Array.from(t2).some(tok2 => tok2.startsWith(base));
        if (match) boost += 0.08;
      }
    }

    for (const tok2 of t2) {
      if (tok2.length === 1) {
        const match = Array.from(t1).some(tok1 => tok1.startsWith(tok2));
        if (match) boost += 0.10;
      } else if (tok2.length === 2 && tok2.endsWith('s')) {
        const base = tok2[0];
        const match = Array.from(t1).some(tok1 => tok1.startsWith(base));
        if (match) boost += 0.08;
      }
    }

    return Math.min(ABBREVIATION_BOOST_MAX, boost);
  }

  // ============================================================================
  // NAME NORMALIZATION
  // ============================================================================

  /**
   * Normalizes a name for comparison.
   *
   * Normalization steps:
   * 1. Convert to lowercase
   * 2. Decompose accented characters (NFD normalization)
   * 3. Remove diacritics (é → e, à → a, etc.)
   * 4. Remove special characters
   * 5. Trim whitespace
   *
   * @private
   * @param name - Name to normalize
   * @returns Normalized name string
   *
   * @example
   * ```ts
   * const normalized = this.normalizeName("José María");
   * // Returns: "jose maria"
   * ```
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, '') // Remove special characters
      .trim();
  }

  // ============================================================================
  // CONTAINMENT SCORING
  // ============================================================================

  /**
   * Calculates containment score between two names.
   *
   * Checks if one name is contained within the other, either as a substring
   * or through token matching. Useful for detecting abbreviations and
   * shortened names.
   *
   * @private
   * @param name1 - First normalized name
   * @param name2 - Second normalized name
   * @returns Containment score (0-1)
   *
   * @example
   * ```ts
   * const score = this.calculateContainmentScore("giorgio s", "giorgio santambrogio");
   * // Returns: ~0.7 ("giorgio s" is contained in longer name)
   * ```
   */
  private calculateContainmentScore(name1: string, name2: string): number {
    const shorter = name1.length < name2.length ? name1 : name2;
    const longer = name1.length < name2.length ? name2 : name1;

    // Direct substring containment
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Token-based containment
    return this.calculateTokenContainment(name1, name2);
  }

  /**
   * Calculates token-based containment score.
   *
   * @private
   * @param name1 - First name
   * @param name2 - Second name
   * @returns Token containment score
   */
  private calculateTokenContainment(name1: string, name2: string): number {
    const tokens1 = name1.split(/\s+/).filter(t => t.length >= MIN_TOKEN_LENGTH);
    const tokens2 = name2.split(/\s+/).filter(t => t.length >= MIN_TOKEN_LENGTH);

    let matches = 0;
    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        if (this.tokensMatch(token1, token2)) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(tokens1.length, tokens2.length);
  }

  /**
   * Checks if two tokens match (equal or one contains the other).
   *
   * @private
   * @param token1 - First token
   * @param token2 - Second token
   * @returns True if tokens match
   */
  private tokensMatch(token1: string, token2: string): boolean {
    return token1 === token2 || token1.includes(token2) || token2.includes(token1);
  }

  // ============================================================================
  // LEVENSHTEIN DISTANCE
  // ============================================================================

  /**
   * Calculates similarity using Levenshtein distance.
   *
   * Levenshtein distance measures the minimum number of single-character edits
   * (insertions, deletions, substitutions) needed to change one string into another.
   *
   * @private
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score (0-1), where 1 is identical
   *
   * @example
   * ```ts
   * const similarity = this.calculateLevenshteinSimilarity("kitten", "sitting");
   * // Returns: ~0.57 (3 edits needed out of 7 characters)
   * ```
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 1.0;

    return 1 - (distance / maxLength);
  }

  /**
   * Implements the Levenshtein distance algorithm.
   *
   * Uses dynamic programming to compute the minimum edit distance.
   *
   * @private
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance (number of operations)
   *
   * @example
   * ```ts
   * const distance = this.levenshteinDistance("kitten", "sitting");
   * // Returns: 3 (k→s, e→i, insert g)
   * ```
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = this.initializeLevenshteinMatrix(len1, len2);

    // Fill matrix using dynamic programming
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // deletion
          matrix[i][j - 1] + 1,       // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Initializes the Levenshtein distance matrix.
   *
   * @private
   * @param len1 - Length of first string
   * @param len2 - Length of second string
   * @returns Initialized matrix
   */
  private initializeLevenshteinMatrix(len1: number, len2: number): number[][] {
    const matrix: number[][] = [];

    // Initialize first column (deletions)
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    // Initialize first row (insertions)
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    return matrix;
  }

  // ============================================================================
  // TOKEN SIMILARITY (JACCARD)
  // ============================================================================

  /**
   * Calculates token-based similarity using Jaccard index.
   *
   * Splits names into words (tokens) and calculates the Jaccard similarity:
   * size(intersection) / size(union)
   *
   * Useful for detecting name reordering and middle name variations.
   *
   * @private
   * @param name1 - First normalized name
   * @param name2 - Second normalized name
   * @returns Jaccard similarity (0-1)
   *
   * @example
   * ```ts
   * const similarity = this.calculateTokenSimilarity("john paul smith", "smith john");
   * // Returns: 0.67 (2 common words out of 3 unique words)
   * ```
   */
  private calculateTokenSimilarity(name1: string, name2: string): number {
    const tokens1 = this.extractTokens(name1);
    const tokens2 = this.extractTokens(name2);

    if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
    if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

    // Calculate Jaccard similarity: |intersection| / |union|
    const intersection = new Set(Array.from(tokens1).filter(t => tokens2.has(t)));
    const union = new Set([...Array.from(tokens1), ...Array.from(tokens2)]);

    return intersection.size / union.size;
  }

  /**
   * Extracts tokens from a name string.
   *
   * @private
   * @param name - Name to tokenize
   * @returns Set of tokens (filtered for minimum length)
   */
  private extractTokens(name: string): Set<string> {
    return new Set(name.split(/\s+/).filter(t => t.length >= MIN_TOKEN_LENGTH));
  }

  // ============================================================================
  // CONFIDENCE UTILITIES
  // ============================================================================

  /**
   * Gets a descriptive confidence level from a numeric confidence score.
   *
   * @param confidence - Confidence score (0-1)
   * @returns Confidence level descriptor
   *
   * @example
   * ```ts
   * const level = service.getConfidenceLevel(0.9);
   * // Returns: "high"
   * ```
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'high';
    if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
    return 'low';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of AliasManagementService for application-wide use.
 *
 * @example
 * ```ts
 * import { aliasManagementService } from './aliasManagementService';
 * const suggestions = aliasManagementService.detectAliases(participants);
 * ```
 */
export const aliasManagementService = new AliasManagementService();
