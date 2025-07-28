import { DATE_REGEX } from '../constants';

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
