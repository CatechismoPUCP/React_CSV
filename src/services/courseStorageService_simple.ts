import { CourseData, DailyLessonData } from '../types/course';

/**
 * Simplified Course Storage Service using localStorage
 * This is a temporary implementation for quick integration
 */
export class CourseStorageService {
  private readonly COURSES_KEY = 'course_management_courses';
  private readonly DAILY_DATA_KEY = 'course_management_daily_data';

  /**
   * Initialize the service (no-op for localStorage)
   */
  async init(): Promise<void> {
    // No initialization needed for localStorage
  }

  /**
   * Save course data
   */
  async saveCourse(course: CourseData): Promise<void> {
    try {
      const courses = await this.getAllCourses();
      const existingIndex = courses.findIndex(c => c.courseId === course.courseId);
      
      if (existingIndex >= 0) {
        courses[existingIndex] = course;
      } else {
        courses.push(course);
      }
      
      localStorage.setItem(this.COURSES_KEY, JSON.stringify(courses));
    } catch (error) {
      console.error('Failed to save course:', error);
      throw new Error('Errore nel salvataggio del corso');
    }
  }

  /**
   * Get course by ID
   */
  async getCourse(courseId: string): Promise<CourseData | null> {
    try {
      const courses = await this.getAllCourses();
      return courses.find(c => c.courseId === courseId) || null;
    } catch (error) {
      console.error('Failed to get course:', error);
      return null;
    }
  }

  /**
   * Get all courses
   */
  async getAllCourses(): Promise<CourseData[]> {
    try {
      const stored = localStorage.getItem(this.COURSES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get courses:', error);
      return [];
    }
  }

  /**
   * Delete course
   */
  async deleteCourse(courseId: string): Promise<void> {
    try {
      const courses = await this.getAllCourses();
      const filtered = courses.filter(c => c.courseId !== courseId);
      localStorage.setItem(this.COURSES_KEY, JSON.stringify(filtered));
      
      // Also delete related daily data
      const dailyData = await this.getAllDailyData();
      const filteredDaily = dailyData.filter(d => d.courseId !== courseId);
      localStorage.setItem(this.DAILY_DATA_KEY, JSON.stringify(filteredDaily));
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw new Error('Errore nella cancellazione del corso');
    }
  }

  /**
   * Save daily lesson data
   */
  async saveDailyData(dailyData: DailyLessonData): Promise<void> {
    try {
      const allDaily = await this.getAllDailyData();
      const existingIndex = allDaily.findIndex(
        d => d.courseId === dailyData.courseId && d.date === dailyData.date
      );
      
      if (existingIndex >= 0) {
        allDaily[existingIndex] = dailyData;
      } else {
        allDaily.push(dailyData);
      }
      
      localStorage.setItem(this.DAILY_DATA_KEY, JSON.stringify(allDaily));
    } catch (error) {
      console.error('Failed to save daily data:', error);
      throw new Error('Errore nel salvataggio dei dati giornalieri');
    }
  }

  /**
   * Get daily lesson data
   */
  async getDailyData(courseId: string, date: string): Promise<DailyLessonData | null> {
    try {
      const allDaily = await this.getAllDailyData();
      return allDaily.find(d => d.courseId === courseId && d.date === date) || null;
    } catch (error) {
      console.error('Failed to get daily data:', error);
      return null;
    }
  }

  /**
   * Get all daily data for a course
   */
  async getCourseDailyData(courseId: string): Promise<DailyLessonData[]> {
    try {
      const allDaily = await this.getAllDailyData();
      return allDaily.filter(d => d.courseId === courseId);
    } catch (error) {
      console.error('Failed to get course daily data:', error);
      return [];
    }
  }

  /**
   * Get all daily data
   */
  async getAllDailyData(): Promise<DailyLessonData[]> {
    try {
      const stored = localStorage.getItem(this.DAILY_DATA_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get all daily data:', error);
      return [];
    }
  }

  /**
   * Save CSV file (simplified - just store metadata)
   */
  async saveCsvFile(courseId: string, date: string, session: 'morning' | 'afternoon', file: File): Promise<void> {
    // Simplified implementation - just log for now
    console.log(`CSV file saved: ${courseId}/${date}/${session}/${file.name}`);
  }

  /**
   * Get CSV file (simplified - return null for now)
   */
  async getCsvFile(courseId: string, date: string, session: 'morning' | 'afternoon'): Promise<File | null> {
    // Simplified implementation
    return null;
  }

  /**
   * Get CSV files for a course and date
   */
  async getCsvFiles(courseId: string, date: string): Promise<{ morning?: File; afternoon?: File }> {
    // Simplified implementation
    return {};
  }

  /**
   * Export course data
   */
  async exportCourse(courseId: string): Promise<{ course: CourseData; dailyData: DailyLessonData[] }> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error('Corso non trovato');
    }
    
    const dailyData = await this.getCourseDailyData(courseId);
    return { course, dailyData };
  }

  /**
   * Import course data
   */
  async importCourse(importData: { course: CourseData; dailyData: DailyLessonData[] }): Promise<CourseData> {
    await this.saveCourse(importData.course);
    
    for (const dailyItem of importData.dailyData) {
      await this.saveDailyData(dailyItem);
    }
    
    return importData.course;
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    localStorage.removeItem(this.COURSES_KEY);
    localStorage.removeItem(this.DAILY_DATA_KEY);
  }
}

// Singleton instance
export const courseStorageService = new CourseStorageService();
