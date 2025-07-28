import { TEMPLATE_FILENAME_PATTERN } from '../constants';

export class FileService {
  /**
   * Loads the default template file from public folder
   */
  static async loadDefaultTemplate(): Promise<File | null> {
    try {
      const response = await fetch('./modello B fad_{ID_CORSO}_{START_DATE}.docx');
      if (response.ok) {
        const blob = await response.blob();
        const file = new File([blob], 'modello B fad_{ID_CORSO}_{START_DATE}.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        console.log('Template file loaded automatically');
        return file;
      }
    } catch (error) {
      console.log('Template file not found, user will need to select manually');
    }
    return null;
  }

  /**
   * Reads file content as text
   */
  static async readFileAsText(file: File): Promise<string> {
    return await file.text();
  }

  /**
   * Generates template filename with course ID and date
   */
  static generateTemplateFilename(courseId?: string, date?: Date): string {
    const actualCourseId = courseId || 'ID_CORSO';
    const actualDate = date ? date.toISOString().split('T')[0].replace(/-/g, '_') : new Date().toISOString().split('T')[0].replace(/-/g, '_');
    
    return TEMPLATE_FILENAME_PATTERN
      .replace('{ID_CORSO}', actualCourseId)
      .replace('{START_DATE}', actualDate);
  }
}
