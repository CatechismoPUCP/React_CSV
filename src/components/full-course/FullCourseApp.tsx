import React, { useState, useEffect } from 'react';
import { CourseSetup } from './CourseSetup/CourseSetup';
import { CourseDashboard } from './CourseDashboard/CourseDashboard';
import { CourseData } from '../../types/course';
import { useCourseState } from '../../hooks/useCourseState';
import { FiArrowLeft, FiLoader } from 'react-icons/fi';

interface FullCourseAppProps {
  onBackToMenu: () => void;
}

type CourseAppStep = 'course-list' | 'course-setup' | 'course-dashboard';

export const FullCourseApp: React.FC<FullCourseAppProps> = ({ onBackToMenu }) => {
  const [currentStep, setCurrentStep] = useState<CourseAppStep>('course-list');
  
  const { 
    courses, 
    currentCourse, 
    isLoading, 
    error, 
    loadCourses, 
    setCurrentCourse,
    clearError 
  } = useCourseState();

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCourseSelect = async (courseId: string) => {
    await setCurrentCourse(courseId);
    setCurrentStep('course-dashboard');
  };

  const handleNewCourse = () => {
    setCurrentStep('course-setup');
  };

  const handleCourseSetupComplete = (courseData: CourseData) => {
    setCurrentStep('course-dashboard');
  };

  const handleBackToCourseList = () => {
    setCurrentStep('course-list');
    setCurrentCourse(null);
  };

  const handleEditCourse = () => {
    setCurrentStep('course-setup');
  };

  if (isLoading && courses.length === 0) {
    return (
      <div className="loading-container">
        <FiLoader className="spinner" />
        <p>Caricamento corsi...</p>
      </div>
    );
  }

  return (
    <div className="full-course-app">
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={clearError} className="btn-close">×</button>
        </div>
      )}

      {currentStep === 'course-list' && (
        <div className="course-list-view">
          <div className="course-list-header">
            <button onClick={onBackToMenu} className="btn btn-back">
              <FiArrowLeft /> Torna al Menu
            </button>
            <h1>I Miei Corsi</h1>
            <button onClick={handleNewCourse} className="btn btn-primary">
              Nuovo Corso
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h2>Nessun corso ancora</h2>
              <p>Crea il tuo primo corso per iniziare a gestire lezioni multi-giorno</p>
              <button onClick={handleNewCourse} className="btn btn-primary btn-large">
                Crea Primo Corso
              </button>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <div 
                  key={course.courseId} 
                  className="course-card"
                  onClick={() => handleCourseSelect(course.courseId)}
                >
                  <div className="course-header">
                    <h3>{course.courseInfo.name}</h3>
                    <div className="course-status">
                      {course.metadata.completedLessons}/{course.metadata.totalLessons} lezioni
                    </div>
                  </div>
                  
                  <div className="course-info">
                    <div className="course-dates">
                      {course.courseInfo.startDate} - {course.courseInfo.endDate}
                    </div>
                    <div className="course-participants">
                      {course.participants.filter(p => p.isActive).length} partecipanti
                    </div>
                  </div>

                  <div className="course-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${(course.metadata.completedLessons / course.metadata.totalLessons) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {Math.round((course.metadata.completedLessons / course.metadata.totalLessons) * 100)}% completato
                    </span>
                  </div>

                  <div className="course-meta">
                    <div className="course-instructor">
                      Docente: {course.courseInfo.instructor.name}
                    </div>
                    <div className="course-updated">
                      Aggiornato: {new Date(course.metadata.updatedAt).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentStep === 'course-setup' && (
        <CourseSetup
          onComplete={handleCourseSetupComplete}
          onCancel={handleBackToCourseList}
          initialData={currentCourse || undefined}
        />
      )}

      {currentStep === 'course-dashboard' && currentCourse && (
        <div className="course-dashboard-view">
          <div className="dashboard-header">
            <button onClick={handleBackToCourseList} className="btn btn-back">
              <FiArrowLeft /> Tutti i Corsi
            </button>
          </div>
          <CourseDashboard
            course={currentCourse}
            onEditCourse={handleEditCourse}
          />
        </div>
      )}

      <style>{`
        .full-course-app {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          color: #6c757d;
        }

        .spinner {
          font-size: 2rem;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-banner {
          background: #f8d7da;
          color: #721c24;
          padding: 12px 20px;
          margin: 20px;
          border-radius: 6px;
          border: 1px solid #f5c6cb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner p {
          margin: 0;
        }

        .btn-close {
          background: none;
          border: none;
          color: #721c24;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .course-list-view {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .course-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .course-list-header h1 {
          margin: 0;
          color: #212529;
          font-size: 1.8rem;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .empty-state h2 {
          margin: 0 0 10px 0;
          color: #212529;
          font-size: 1.5rem;
        }

        .empty-state p {
          margin: 0 0 30px 0;
          color: #6c757d;
          font-size: 1.1rem;
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .course-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .course-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #007bff;
        }

        .course-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .course-header h3 {
          margin: 0;
          color: #212529;
          font-size: 1.2rem;
          font-weight: 600;
          flex: 1;
          margin-right: 10px;
        }

        .course-status {
          background: #e3f2fd;
          color: #0277bd;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .course-info {
          margin-bottom: 15px;
        }

        .course-dates {
          color: #495057;
          font-size: 0.9rem;
          margin-bottom: 5px;
        }

        .course-participants {
          color: #6c757d;
          font-size: 0.9rem;
        }

        .course-progress {
          margin-bottom: 15px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 5px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #28a745);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .course-meta {
          border-top: 1px solid #f1f3f4;
          padding-top: 15px;
        }

        .course-instructor {
          font-size: 0.9rem;
          color: #495057;
          margin-bottom: 5px;
        }

        .course-updated {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .course-dashboard-view {
          background: white;
        }

        .dashboard-header {
          padding: 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background-color 0.2s;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-large {
          padding: 12px 24px;
          font-size: 1rem;
        }

        .btn-back {
          background: #6c757d;
          color: white;
        }

        .btn-back:hover {
          background: #545b62;
        }

        @media (max-width: 768px) {
          .course-list-view {
            padding: 15px;
          }

          .course-list-header {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .courses-grid {
            grid-template-columns: 1fr;
          }

          .course-card {
            padding: 15px;
          }

          .course-header {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};
