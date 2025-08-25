import { DATE_REGEX } from '../constants';
import { ProcessedParticipant } from '../types';

export class DateService {
  /**
   * Extracts date from filename with format like "Mattina_2025_07_08.csv"
   */
  static extractDateFromFilename(file: File | null): Date {
    if (!file) {
      return new Date();
    }

    const dateMatch = file.name.match(DATE_REGEX);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return new Date();
  }

  /**
   * Extracts the lesson date from participants' join times. Returns the calendar day
   * (year, month, day) of the earliest join among participants and organizer.
   * If no dates are available, returns null.
   */
  static extractDateFromParticipants(
    participants: ProcessedParticipant[],
    organizer?: ProcessedParticipant | null
  ): Date | null {
    const all: Date[] = [];

    const pushDates = (p: ProcessedParticipant | undefined) => {
      if (!p) return;
      if (p.morningFirstJoin) all.push(p.morningFirstJoin);
      if (p.afternoonFirstJoin) all.push(p.afternoonFirstJoin);
    };

    participants.forEach(pushDates);
    if (organizer) pushDates(organizer);

    if (all.length === 0) return null;

    const earliest = new Date(Math.min(...all.map(d => d.getTime())));
    // Normalize to date-only (00:00:00)
    return new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
  }

  /**
   * Formats date for template filename
   */
  static formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '_');
  }

  /**
   * Gets current date formatted for template filename
   */
  static getCurrentDateForFilename(): string {
    return this.formatDateForFilename(new Date());
  }
}
