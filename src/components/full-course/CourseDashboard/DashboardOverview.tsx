import React from 'react';
import { CourseData, DailyLessonData } from '../../../types/course';
import { format, parseISO, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { FiUsers, FiCalendar, FiCheckCircle, FiClock, FiTrendingUp, FiBook } from 'react-icons/fi';

interface DashboardOverviewProps {
  course: CourseData;
  dailyData: DailyLessonData[];
  onNavigateToDay?: (date: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  course,
  dailyData,
  onNavigateToDay,
}) => {
  const totalDays = differenceInDays(parseISO(course.courseInfo.endDate), parseISO(course.courseInfo.startDate)) + 1;
  const completedLessons = dailyData.filter(d => d.status === 'completed').length;
  const pendingLessons = dailyData.filter(d => d.status === 'pending').length;
  const processingLessons = dailyData.filter(d => d.status === 'processing').length;
  const errorLessons = dailyData.filter(d => d.status === 'error').length;
  
  const completionPercentage = course.schedule.length > 0 
    ? Math.round((completedLessons / course.schedule.length) * 100)
    : 0;

  const activeParticipants = course.participants.filter(p => p.isActive).length;

  const recentActivity = dailyData
    .filter(d => d.processedData)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const upcomingLessons = course.schedule
    .filter(lesson => {
      const lessonDate = parseISO(lesson.date);
      const today = new Date();
      return lessonDate >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <div className="dashboard-overview">
      {/* Header Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FiUsers />
          </div>
          <div className="stat-content">
            <div className="stat-value">{activeParticipants}</div>
            <div className="stat-label">Partecipanti Attivi</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiCalendar />
          </div>
          <div className="stat-content">
            <div className="stat-value">{course.schedule.length}</div>
            <div className="stat-label">Lezioni Totali</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{completedLessons}</div>
            <div className="stat-label">Completate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-value">{completionPercentage}%</div>
            <div className="stat-label">Progresso</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <h3>Progresso Corso</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="progress-labels">
          <span>Inizio: {format(parseISO(course.courseInfo.startDate), 'd MMM yyyy', { locale: it })}</span>
          <span>Fine: {format(parseISO(course.courseInfo.endDate), 'd MMM yyyy', { locale: it })}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Course Info */}
        <div className="info-card">
          <h3>Informazioni Corso</h3>
          <div className="info-content">
            <div className="info-item">
              <strong>Nome:</strong> {course.courseInfo.name}
            </div>
            <div className="info-item">
              <strong>Docente:</strong> {course.courseInfo.instructor.name}
            </div>
            <div className="info-item">
              <strong>Responsabile:</strong> {course.courseInfo.coordinator.name}
            </div>
            <div className="info-item">
              <strong>Durata:</strong> {totalDays} giorni
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="status-card">
          <h3>Stato Lezioni</h3>
          <div className="status-list">
            <div className="status-item completed">
              <div className="status-dot"></div>
              <span>Completate: {completedLessons}</span>
            </div>
            <div className="status-item pending">
              <div className="status-dot"></div>
              <span>In Attesa: {pendingLessons}</span>
            </div>
            {processingLessons > 0 && (
              <div className="status-item processing">
                <div className="status-dot"></div>
                <span>In Elaborazione: {processingLessons}</span>
              </div>
            )}
            {errorLessons > 0 && (
              <div className="status-item error">
                <div className="status-dot"></div>
                <span>Errori: {errorLessons}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-card">
          <h3>Attività Recente</h3>
          <div className="activity-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div 
                  key={activity.date} 
                  className="activity-item"
                  onClick={() => onNavigateToDay?.(activity.date)}
                >
                  <div className="activity-date">
                    {format(parseISO(activity.date), 'd MMM', { locale: it })}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">
                      Lezione del {format(parseISO(activity.date), 'd MMMM yyyy', { locale: it })}
                    </div>
                    <div className="activity-subtitle">
                      {activity.processedData?.participants.length || 0} partecipanti elaborati
                    </div>
                  </div>
                  <div className={`activity-status ${activity.status}`}>
                    {activity.status === 'completed' && <FiCheckCircle />}
                    {activity.status === 'processing' && <FiClock />}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FiBook />
                <p>Nessuna attività recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Lessons */}
        <div className="upcoming-card">
          <h3>Prossime Lezioni</h3>
          <div className="upcoming-list">
            {upcomingLessons.length > 0 ? (
              upcomingLessons.map((lesson) => (
                <div 
                  key={lesson.date} 
                  className="upcoming-item"
                  onClick={() => onNavigateToDay?.(lesson.date)}
                >
                  <div className="upcoming-date">
                    <div className="date-day">
                      {format(parseISO(lesson.date), 'd', { locale: it })}
                    </div>
                    <div className="date-month">
                      {format(parseISO(lesson.date), 'MMM', { locale: it })}
                    </div>
                  </div>
                  <div className="upcoming-content">
                    <div className="upcoming-title">
                      {lesson.subject || 'Lezione'}
                    </div>
                    <div className="upcoming-type">
                      {lesson.lessonType === 'online' && '💻 Online'}
                      {lesson.lessonType === 'presence' && '🏢 Presenza'}
                      {lesson.lessonType === 'hybrid' && '🔄 Ibrido'}
                    </div>
                    <div className="upcoming-sessions">
                      {lesson.sessions.morning && lesson.sessions.afternoon ? '2 sessioni' :
                       lesson.sessions.morning ? 'Solo mattina' : 'Solo pomeriggio'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FiCalendar />
                <p>Nessuna lezione programmata</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
