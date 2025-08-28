import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CourseData, DailyLessonData } from '../types/course';
import { courseStorageService } from '../services/courseStorageService_simple';

interface CourseState {
  // Current course data
  currentCourse: CourseData | null;
  courses: CourseData[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadCourses: () => Promise<void>;
  createCourse: (courseData: Omit<CourseData, 'courseId' | 'metadata'>) => Promise<void>;
  updateCourse: (courseData: CourseData) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  setCurrentCourse: (courseId: string | null) => Promise<void>;
  clearError: () => void;
  
  // Daily data actions
  saveDailyData: (dailyData: DailyLessonData) => Promise<void>;
  getDailyData: (courseId: string, date: string) => Promise<DailyLessonData | null>;
}

export const useCourseState = create<CourseState>()(
  persist(
    (set, get) => ({
      currentCourse: null,
      courses: [],
      isLoading: false,
      error: null,

      loadCourses: async () => {
        set({ isLoading: true, error: null });
        try {
          await courseStorageService.init();
          const courses = await courseStorageService.getAllCourses();
          set({ courses, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Errore nel caricamento dei corsi',
            isLoading: false 
          });
        }
      },

      createCourse: async (courseData) => {
        set({ isLoading: true, error: null });
        try {
          const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newCourse: CourseData = {
            ...courseData,
            courseId,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: '1.0',
              totalLessons: courseData.schedule.length,
              completedLessons: 0,
            },
          };

          await courseStorageService.saveCourse(newCourse);
          const courses = await courseStorageService.getAllCourses();
          set({ courses, currentCourse: newCourse, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Errore nella creazione del corso',
            isLoading: false 
          });
        }
      },

      updateCourse: async (courseData) => {
        set({ isLoading: true, error: null });
        try {
          await courseStorageService.saveCourse(courseData);
          const courses = await courseStorageService.getAllCourses();
          const currentCourse = get().currentCourse?.courseId === courseData.courseId 
            ? courseData 
            : get().currentCourse;
          set({ courses, currentCourse, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Errore nell\'aggiornamento del corso',
            isLoading: false 
          });
        }
      },

      deleteCourse: async (courseId) => {
        set({ isLoading: true, error: null });
        try {
          await courseStorageService.deleteCourse(courseId);
          const courses = await courseStorageService.getAllCourses();
          const currentCourse = get().currentCourse?.courseId === courseId 
            ? null 
            : get().currentCourse;
          set({ courses, currentCourse, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Errore nella cancellazione del corso',
            isLoading: false 
          });
        }
      },

      setCurrentCourse: async (courseId) => {
        if (!courseId) {
          set({ currentCourse: null });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const course = await courseStorageService.getCourse(courseId);
          set({ currentCourse: course, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Errore nel caricamento del corso',
            isLoading: false 
          });
        }
      },

      clearError: () => set({ error: null }),

      saveDailyData: async (dailyData) => {
        set({ isLoading: true, error: null });
        try {
          await courseStorageService.saveDailyData(dailyData);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Errore nel salvataggio dei dati giornalieri',
            isLoading: false 
          });
        }
      },

      getDailyData: async (courseId, date) => {
        try {
          return await courseStorageService.getDailyData(courseId, date);
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Errore nel recupero dei dati giornalieri'
          });
          return null;
        }
      },
    }),
    {
      name: 'course-state',
      partialize: (state) => ({ 
        currentCourse: state.currentCourse 
      }),
    }
  )
);
