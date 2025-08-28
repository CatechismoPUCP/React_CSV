import React, { useState, useEffect } from 'react';
import { DashboardOverview } from './DashboardOverview';
import { DailyLessonCard } from './DailyLessonCard';
import { CourseData, DailyLessonData } from '../../../types/course';
import { useCourseState } from '../../../hooks/useCourseState';
import { courseStorageService } from '../../../services/courseStorageService';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  FiGrid, 
  FiList, 
  FiCalendar, 
  FiSearch,
  FiSettings
} from 'react-icons/fi';
import styles from './CourseDashboard.module.css';

interface CourseDashboardProps {
  course: CourseData;
  onEditCourse?: () => void;
  onNavigateToDay?: (date: string) => void;
}

type ViewMode = 'overview' | 'calendar' | 'list';
type FilterMode = 'all' | 'pending' | 'completed' | 'processing' | 'error';

export const CourseDashboard: React.FC<CourseDashboardProps> = ({
  course,
  onEditCourse,
  onNavigateToDay,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyDataMap, setDailyDataMap] = useState<Map<string, DailyLessonData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const { saveDailyData, error, clearError } = useCourseState();

  // Load daily data for all course lessons
  useEffect(() => {
    const loadDailyData = async () => {
      setIsLoading(true);
      try {
        const dataMap = new Map<string, DailyLessonData>();
        
        for (const lesson of course.schedule) {
          const dailyData = await courseStorageService.getDailyData(course.courseId, lesson.date);
          if (dailyData) {
            dataMap.set(lesson.date, dailyData);
          }
        }
        
        setDailyDataMap(dataMap);
      } catch (error) {
        console.error('Error loading daily data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDailyData();
  }, [course.courseId, course.schedule]);

  const handleUploadCSV = async (date: string, session: 'morning' | 'afternoon', file: File) => {
    try {
      await courseStorageService.saveCsvFile(course.courseId, date, session, file);
      
      // Update or create daily data
      let dailyData = dailyDataMap.get(date);
      if (!dailyData) {
        dailyData = {
          courseId: course.courseId,
          date,
          csvFiles: {},
          manualAdjustments: [],
          documents: {},
          status: 'pending',
        };
      }

      const storedFile = {
        filename: file.name,
        data: await file.arrayBuffer(),
        uploadedAt: new Date().toISOString(),
        size: file.size,
      };

      dailyData.csvFiles[session] = storedFile;
      
      await saveDailyData(dailyData);
      setDailyDataMap(new Map(dailyDataMap.set(date, dailyData)));
    } catch (error) {
      console.error('Error uploading CSV:', error);
    }
  };

  const handleProcessLesson = async (date: string) => {
    // This will be implemented with the batch processor
    console.log('Processing lesson for date:', date);
  };

  const handleEditAttendance = (date: string) => {
    if (onNavigateToDay) {
      onNavigateToDay(date);
    }
  };

  const handleGenerateDocument = async (date: string) => {
    // This will be implemented with the batch processor
    console.log('Generating document for date:', date);
  };

  const handleDownloadDocument = async (date: string, type: 'moduloB' | 'absenceReport') => {
    const dailyData = dailyDataMap.get(date);
    if (!dailyData?.documents[type]) return;

    const documentData = dailyData.documents[type]!;
    const blob = new Blob([documentData.data], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentData.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLessons = course.schedule.filter(lesson => {
    const dailyData = dailyDataMap.get(lesson.date);
    
    // Filter by status
    if (filterMode !== 'all') {
      const status = dailyData?.status || 'pending';
      if (status !== filterMode) return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesDate = format(parseISO(lesson.date), 'dd/MM/yyyy').includes(searchLower);
      const matchesSubject = lesson.subject?.toLowerCase().includes(searchLower);
      const matchesType = lesson.lessonType.toLowerCase().includes(searchLower);
      
      if (!matchesDate && !matchesSubject && !matchesType) return false;
    }

    return true;
  });

  const sortedLessons = [...filteredLessons].sort((a, b) => {
    return a.date.localeCompare(b.date);
  });

  const dailyDataArray = Array.from(dailyDataMap.values());

  return (
    <div className={styles.courseDashboard}>
      <div className={styles.dashboardHeader}>
        <div className={styles.headerInfo}>
          <h1>{course.courseInfo.name}</h1>
          <div className={styles.courseMeta}>
            <span>
              {format(parseISO(course.courseInfo.startDate), 'd MMM', { locale: it })} - 
              {format(parseISO(course.courseInfo.endDate), 'd MMM yyyy', { locale: it })}
            </span>
            <span>•</span>
            <span>{course.participants.length} partecipanti</span>
            <span>•</span>
            <span>{course.schedule.length} lezioni</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={onEditCourse}
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            <FiSettings /> Impostazioni
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p>{error}</p>
          <button onClick={clearError} className={styles.btnClose}>×</button>
        </div>
      )}

      <div className={styles.dashboardControls}>
        <div className={styles.viewControls}>
          <button
            onClick={() => setViewMode('overview')}
            className={`${styles.btnView} ${viewMode === 'overview' ? styles.active : ''}`}
          >
            <FiGrid /> Overview
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`${styles.btnView} ${viewMode === 'calendar' ? styles.active : ''}`}
          >
            <FiCalendar /> Calendario
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`${styles.btnView} ${viewMode === 'list' ? styles.active : ''}`}
          >
            <FiList /> Lista
          </button>
        </div>

        {viewMode !== 'overview' && (
          <div className={styles.filterControls}>
            <div className={styles.searchBox}>
              <FiSearch />
              <input
                type="text"
                placeholder="Cerca per data, argomento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className={styles.filterSelect}
            >
              <option value="all">Tutte le lezioni</option>
              <option value="pending">In attesa</option>
              <option value="processing">In elaborazione</option>
              <option value="completed">Completate</option>
              <option value="error">Con errori</option>
            </select>
          </div>
        )}
      </div>

      <div className={styles.dashboardContent}>
        {viewMode === 'overview' && (
          <DashboardOverview
            course={course}
            dailyData={dailyDataArray}
            onNavigateToDay={onNavigateToDay}
          />
        )}

        {(viewMode === 'calendar' || viewMode === 'list') && (
          <div className={`${styles.lessonsContainer} ${styles[viewMode]}`}>
            {sortedLessons.length > 0 ? (
              sortedLessons.map((lesson) => (
                <DailyLessonCard
                  key={lesson.date}
                  lesson={lesson}
                  dailyData={dailyDataMap.get(lesson.date)}
                  onUploadCSV={handleUploadCSV}
                  onProcessLesson={handleProcessLesson}
                  onEditAttendance={handleEditAttendance}
                  onGenerateDocument={handleGenerateDocument}
                  onDownloadDocument={handleDownloadDocument}
                  isLoading={isLoading}
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <FiCalendar />
                <h3>Nessuna lezione trovata</h3>
                <p>Modifica i filtri per vedere più risultati</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
