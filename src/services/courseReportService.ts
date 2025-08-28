import { CourseData, DailyLessonData, AttendanceReport, ParticipantSummary } from '../types/course';
import { courseStorageService } from './courseStorageService';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Service for generating course reports and analytics
 */
export class CourseReportService {
  /**
   * Generate comprehensive attendance report for a course
   */
  async generateAttendanceReport(courseId: string): Promise<AttendanceReport> {
    const course = await courseStorageService.getCourse(courseId);
    if (!course) {
      throw new Error('Corso non trovato');
    }

    const allDailyData = await courseStorageService.getAllDailyDataForCourse(courseId);
    const completedLessons = allDailyData.filter(data => data.status === 'completed' && data.processedData);

    const participantSummaries = await this.generateParticipantSummaries(course, completedLessons);
    
    const totalParticipants = course.participants.filter(p => p.isActive).length;
    const totalLessons = completedLessons.length;
    const averageAttendance = this.calculateAverageAttendance(participantSummaries);

    return {
      courseId,
      generatedAt: new Date().toISOString(),
      totalParticipants,
      totalLessons,
      averageAttendance,
      participantSummaries,
    };
  }

  /**
   * Generate summary for a specific participant
   */
  async generateParticipantSummary(courseId: string, participantId: string): Promise<ParticipantSummary> {
    const course = await courseStorageService.getCourse(courseId);
    if (!course) {
      throw new Error('Corso non trovato');
    }

    const participant = course.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error('Partecipante non trovato');
    }

    const allDailyData = await courseStorageService.getAllDailyDataForCourse(courseId);
    const completedLessons = allDailyData.filter(data => data.status === 'completed' && data.processedData);

    let totalHours = 0;
    let attendedLessons = 0;
    let lastAttendance: string | undefined;

    for (const dailyData of completedLessons) {
      const processedParticipant = dailyData.processedData!.participants.find(
        p => p.email.toLowerCase() === participant.email.toLowerCase()
      );

      if (processedParticipant && processedParticipant.isPresent) {
        attendedLessons++;
        totalHours += this.calculateParticipantHours(processedParticipant, dailyData.processedData!.lessonHours);
        lastAttendance = dailyData.date;
      }
    }

    const missedLessons = completedLessons.length - attendedLessons;
    const attendancePercentage = completedLessons.length > 0 
      ? Math.round((attendedLessons / completedLessons.length) * 100)
      : 0;

    return {
      participantId,
      name: participant.name,
      email: participant.email,
      totalHours,
      attendedLessons,
      missedLessons,
      attendancePercentage,
      lastAttendance,
    };
  }

  /**
   * Export attendance data in various formats
   */
  async exportAttendanceData(courseId: string, format: 'excel' | 'csv'): Promise<Blob> {
    const report = await this.generateAttendanceReport(courseId);
    const course = await courseStorageService.getCourse(courseId);
    
    if (!course) {
      throw new Error('Corso non trovato');
    }

    if (format === 'csv') {
      return this.exportAsCSV(course, report);
    } else {
      return this.exportAsExcel(course, report);
    }
  }

  /**
   * Generate detailed lesson attendance matrix
   */
  async generateAttendanceMatrix(courseId: string): Promise<{
    participants: Array<{ id: string; name: string; email: string; }>;
    lessons: Array<{ date: string; subject: string; }>;
    matrix: boolean[][]; // [participantIndex][lessonIndex]
  }> {
    const course = await courseStorageService.getCourse(courseId);
    if (!course) {
      throw new Error('Corso non trovato');
    }

    const allDailyData = await courseStorageService.getAllDailyDataForCourse(courseId);
    const completedLessons = allDailyData
      .filter(data => data.status === 'completed' && data.processedData)
      .sort((a, b) => a.date.localeCompare(b.date));

    const participants = course.participants
      .filter(p => p.isActive)
      .sort((a, b) => a.enrollmentOrder - b.enrollmentOrder);

    const lessons = completedLessons.map(data => ({
      date: data.date,
      subject: data.processedData!.subject,
    }));

    const matrix: boolean[][] = participants.map(participant => 
      completedLessons.map(dailyData => {
        const processedParticipant = dailyData.processedData!.participants.find(
          p => p.email.toLowerCase() === participant.email.toLowerCase()
        );
        return processedParticipant ? processedParticipant.isPresent : false;
      })
    );

    return {
      participants: participants.map(p => ({ id: p.id, name: p.name, email: p.email })),
      lessons,
      matrix,
    };
  }

  /**
   * Generate course statistics
   */
  async generateCourseStatistics(courseId: string): Promise<{
    overview: {
      totalLessons: number;
      completedLessons: number;
      totalParticipants: number;
      averageAttendance: number;
      completionRate: number;
    };
    attendance: {
      byLesson: Array<{ date: string; attendanceCount: number; attendanceRate: number; }>;
      byParticipant: Array<{ name: string; attendanceRate: number; totalHours: number; }>;
    };
    trends: {
      attendanceOverTime: Array<{ date: string; rate: number; }>;
      mostActiveParticipants: Array<{ name: string; score: number; }>;
      leastActiveParticipants: Array<{ name: string; score: number; }>;
    };
  }> {
    const course = await courseStorageService.getCourse(courseId);
    if (!course) {
      throw new Error('Corso non trovato');
    }

    const allDailyData = await courseStorageService.getAllDailyDataForCourse(courseId);
    const completedLessons = allDailyData
      .filter(data => data.status === 'completed' && data.processedData)
      .sort((a, b) => a.date.localeCompare(b.date));

    const activeParticipants = course.participants.filter(p => p.isActive);
    const participantSummaries = await this.generateParticipantSummaries(course, completedLessons);

    // Overview statistics
    const overview = {
      totalLessons: course.schedule.length,
      completedLessons: completedLessons.length,
      totalParticipants: activeParticipants.length,
      averageAttendance: this.calculateAverageAttendance(participantSummaries),
      completionRate: course.schedule.length > 0 
        ? Math.round((completedLessons.length / course.schedule.length) * 100)
        : 0,
    };

    // Attendance by lesson
    const byLesson = completedLessons.map(dailyData => {
      const presentCount = dailyData.processedData!.participants.filter(p => p.isPresent).length;
      const attendanceRate = activeParticipants.length > 0 
        ? Math.round((presentCount / activeParticipants.length) * 100)
        : 0;
      
      return {
        date: dailyData.date,
        attendanceCount: presentCount,
        attendanceRate,
      };
    });

    // Attendance by participant
    const byParticipant = participantSummaries.map(summary => ({
      name: summary.name,
      attendanceRate: summary.attendancePercentage,
      totalHours: summary.totalHours,
    }));

    // Trends
    const attendanceOverTime = byLesson.map(lesson => ({
      date: lesson.date,
      rate: lesson.attendanceRate,
    }));

    const sortedByAttendance = [...participantSummaries].sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    const mostActiveParticipants = sortedByAttendance.slice(0, 5).map(p => ({
      name: p.name,
      score: p.attendancePercentage,
    }));

    const leastActiveParticipants = sortedByAttendance.slice(-5).reverse().map(p => ({
      name: p.name,
      score: p.attendancePercentage,
    }));

    return {
      overview,
      attendance: { byLesson, byParticipant },
      trends: { attendanceOverTime, mostActiveParticipants, leastActiveParticipants },
    };
  }

  // Private helper methods

  private async generateParticipantSummaries(
    course: CourseData,
    completedLessons: DailyLessonData[]
  ): Promise<ParticipantSummary[]> {
    const summaries: ParticipantSummary[] = [];

    for (const participant of course.participants.filter(p => p.isActive)) {
      let totalHours = 0;
      let attendedLessons = 0;
      let lastAttendance: string | undefined;

      for (const dailyData of completedLessons) {
        const processedParticipant = dailyData.processedData!.participants.find(
          p => p.email.toLowerCase() === participant.email.toLowerCase()
        );

        if (processedParticipant && processedParticipant.isPresent) {
          attendedLessons++;
          totalHours += this.calculateParticipantHours(processedParticipant, dailyData.processedData!.lessonHours);
          lastAttendance = dailyData.date;
        }
      }

      const missedLessons = completedLessons.length - attendedLessons;
      const attendancePercentage = completedLessons.length > 0 
        ? Math.round((attendedLessons / completedLessons.length) * 100)
        : 0;

      summaries.push({
        participantId: participant.id,
        name: participant.name,
        email: participant.email,
        totalHours,
        attendedLessons,
        missedLessons,
        attendancePercentage,
        lastAttendance,
      });
    }

    return summaries.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
  }

  private calculateParticipantHours(participant: any, lessonHours: number[]): number {
    // Simple calculation - could be enhanced based on actual connection times
    return lessonHours.reduce((total, hours) => total + hours, 0);
  }

  private calculateAverageAttendance(summaries: ParticipantSummary[]): number {
    if (summaries.length === 0) return 0;
    
    const totalAttendance = summaries.reduce((sum, summary) => sum + summary.attendancePercentage, 0);
    return Math.round(totalAttendance / summaries.length);
  }

  private async exportAsCSV(course: CourseData, report: AttendanceReport): Promise<Blob> {
    const headers = [
      'Nome',
      'Email',
      'Ore Totali',
      'Lezioni Frequentate',
      'Lezioni Perse',
      'Percentuale Presenza',
      'Ultima Presenza'
    ];

    const rows = report.participantSummaries.map(summary => [
      summary.name,
      summary.email,
      summary.totalHours.toString(),
      summary.attendedLessons.toString(),
      summary.missedLessons.toString(),
      `${summary.attendancePercentage}%`,
      summary.lastAttendance ? format(parseISO(summary.lastAttendance), 'dd/MM/yyyy', { locale: it }) : 'Mai'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private async exportAsExcel(course: CourseData, report: AttendanceReport): Promise<Blob> {
    // For now, return CSV format - would need a library like xlsx for proper Excel export
    return this.exportAsCSV(course, report);
  }
}

// Singleton instance
export const courseReportService = new CourseReportService();
