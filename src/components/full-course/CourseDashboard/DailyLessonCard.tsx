import React, { useState } from 'react';
import { DailyLessonData, LessonSchedule } from '../../../types/course';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  FiUpload, 
  FiDownload, 
  FiEdit, 
  FiCheck, 
  FiClock, 
  FiAlertCircle, 
  FiPlay,
  FiFileText,
  FiUsers,
  FiCalendar
} from 'react-icons/fi';
import styles from './DailyLessonCard.module.css';

interface DailyLessonCardProps {
  lesson: LessonSchedule;
  dailyData?: DailyLessonData;
  onUploadCSV?: (date: string, session: 'morning' | 'afternoon', file: File) => void;
  onProcessLesson?: (date: string) => void;
  onEditAttendance?: (date: string) => void;
  onGenerateDocument?: (date: string) => void;
  onDownloadDocument?: (date: string, type: 'moduloB' | 'absenceReport') => void;
  isLoading?: boolean;
}

export const DailyLessonCard: React.FC<DailyLessonCardProps> = ({
  lesson,
  dailyData,
  onUploadCSV,
  onProcessLesson,
  onEditAttendance,
  onGenerateDocument,
  onDownloadDocument,
  isLoading = false,
}) => {
  const [dragOver, setDragOver] = useState<'morning' | 'afternoon' | null>(null);

  const lessonDate = parseISO(lesson.date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === lesson.date;
  // const isPast = isToday ? false : isBefore(lessonDate, new Date());

  const getStatusColor = () => {
    if (!dailyData) return 'pending';
    return dailyData.status;
  };

  const getStatusIcon = () => {
    const status = getStatusColor();
    switch (status) {
      case 'completed':
        return <FiCheck />;
      case 'processing':
        return <FiClock />;
      case 'error':
        return <FiAlertCircle />;
      default:
        return <FiCalendar />;
    }
  };

  const handleFileUpload = (session: 'morning' | 'afternoon', file: File) => {
    if (onUploadCSV) {
      onUploadCSV(lesson.date, session, file);
    }
  };

  const handleDrop = (e: React.DragEvent, session: 'morning' | 'afternoon') => {
    e.preventDefault();
    setDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileUpload(session, csvFile);
    }
  };

  const handleDragOver = (e: React.DragEvent, session: 'morning' | 'afternoon') => {
    e.preventDefault();
    setDragOver(session);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const canProcess = dailyData && (dailyData.csvFiles.morning || dailyData.csvFiles.afternoon);
  const hasProcessedData = dailyData?.processedData;
  const hasDocuments = dailyData?.documents.moduloB;

  return (
    <div className={`${styles.dailyLessonCard} ${styles[getStatusColor()]} ${isToday ? styles.today : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.dateInfo}>
          <div className={styles.datePrimary}>
            {format(lessonDate, 'EEEE d', { locale: it })}
          </div>
          <div className={styles.dateSecondary}>
            {format(lessonDate, 'MMMM yyyy', { locale: it })}
          </div>
        </div>
        
        <div className={styles.statusBadge}>
          <div className={styles.statusIcon}>
            {getStatusIcon()}
          </div>
          <span className="status-text">
            {getStatusColor() === 'completed' && 'Completata'}
            {getStatusColor() === 'processing' && 'Elaborazione'}
            {getStatusColor() === 'error' && 'Errore'}
            {getStatusColor() === 'pending' && 'In Attesa'}
          </span>
        </div>
      </div>

      <div className={styles.cardContent}>
        {/* Lesson Info */}
        <div className={styles.lessonInfo}>
          <div className={styles.lessonType}>
            {lesson.lessonType === 'online' && '💻 Online'}
            {lesson.lessonType === 'presence' && '🏢 Presenza'}
            {lesson.lessonType === 'hybrid' && '🔄 Ibrido'}
          </div>
          {lesson.subject && (
            <div className={styles.lessonSubject}>{lesson.subject}</div>
          )}
        </div>

        {/* Sessions */}
        <div className={styles.sessionsContainer}>
          {lesson.sessions.morning && (
            <div className={styles.sessionCard}>
              <div className={styles.sessionHeader}>
                <span className={styles.sessionTitle}>Mattina</span>
                <span className={styles.sessionTime}>
                  {lesson.sessions.morning.startTime} - {lesson.sessions.morning.endTime}
                </span>
              </div>
              
              <div 
                className={`${styles.uploadZone} ${dragOver === 'morning' ? styles.dragOver : ''} ${dailyData?.csvFiles.morning ? styles.hasFile : ''}`}
                onDrop={(e) => handleDrop(e, 'morning')}
                onDragOver={(e) => handleDragOver(e, 'morning')}
                onDragLeave={handleDragLeave}
              >
                {dailyData?.csvFiles.morning ? (
                  <div className="file-info">
                    <FiFileText />
                    <span>{dailyData.csvFiles.morning.filename}</span>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <FiUpload />
                    <span>Trascina CSV o clicca per caricare</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('morning', file);
                      }}
                      style={{ display: 'none' }}
                      id={`morning-${lesson.date}`}
                    />
                    <label className={styles.uploadLabel} htmlFor={`morning-upload-${lesson.date}`} />
                  </div>
                )}
              </div>
            </div>
          )}

          {lesson.sessions.afternoon && (
            <div className="session-card">
              <div className="session-header">
                <span className="session-title">Pomeriggio</span>
                <span className="session-time">
                  {lesson.sessions.afternoon.startTime} - {lesson.sessions.afternoon.endTime}
                </span>
              </div>
              
              <div 
                className={`upload-zone ${dragOver === 'afternoon' ? 'drag-over' : ''} ${dailyData?.csvFiles.afternoon ? 'has-file' : ''}`}
                onDrop={(e) => handleDrop(e, 'afternoon')}
                onDragOver={(e) => handleDragOver(e, 'afternoon')}
                onDragLeave={handleDragLeave}
              >
                {dailyData?.csvFiles.afternoon ? (
                  <div className="file-info">
                    <FiFileText />
                    <span>{dailyData.csvFiles.afternoon.filename}</span>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <FiUpload />
                    <span>Trascina CSV o clicca per caricare</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('afternoon', file);
                      }}
                      style={{ display: 'none' }}
                      id={`afternoon-${lesson.date}`}
                    />
                    <label htmlFor={`afternoon-${lesson.date}`} className="upload-label" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Processed Data Summary */}
        {hasProcessedData && dailyData?.processedData && (
          <div className="processed-summary">
            <div className="summary-item">
              <FiUsers />
              <span>{dailyData.processedData.participants.length} partecipanti</span>
            </div>
            <div className="summary-item">
              <FiClock />
              <span>{dailyData.processedData.lessonHours.join(', ')} ore</span>
            </div>
          </div>
        )}

        {/* Manual Adjustments */}
        {dailyData?.manualAdjustments && dailyData.manualAdjustments.length > 0 && (
          <div className="adjustments-info">
            <FiEdit />
            <span>{dailyData.manualAdjustments.length} modifiche manuali</span>
          </div>
        )}
      </div>

      <div className="card-actions">
        {canProcess && !hasProcessedData && (
          <button
            onClick={() => onProcessLesson?.(lesson.date)}
            disabled={isLoading}
            className="btn btn-primary"
          >
            <FiPlay /> Elabora
          </button>
        )}

        {hasProcessedData && (
          <button
            onClick={() => onEditAttendance?.(lesson.date)}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            <FiEdit /> Modifica
          </button>
        )}

        {hasProcessedData && !hasDocuments && (
          <button
            onClick={() => onGenerateDocument?.(lesson.date)}
            disabled={isLoading}
            className="btn btn-success"
          >
            <FiFileText /> Genera Doc
          </button>
        )}

        {hasDocuments && (
          <button
            onClick={() => onDownloadDocument?.(lesson.date, 'moduloB')}
            disabled={isLoading}
            className="btn btn-download"
          >
            <FiDownload /> Scarica
          </button>
        )}
      </div>

    </div>
  );
};
