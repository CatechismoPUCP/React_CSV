import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ParticipantEditor } from './components/ParticipantEditor';
import { DebugInfo } from './components/DebugInfo';
import { AttendanceDashboard } from './components/AttendanceDashboard';
import { TemplateGuide } from './components/TemplateGuide';
import { parseZoomCSV, processParticipants } from './utils/csvParser';
import { generateWordDocument } from './utils/wordGenerator';
import { ProcessedParticipant, LessonType, LessonData } from './types';

// Helper function to calculate dynamic lesson hours based on actual data
const calculateDynamicLessonHours = (
  participants: ProcessedParticipant[], 
  organizer: ProcessedParticipant | null, 
  lessonType: LessonType
): number[] => {
  const allParticipants = organizer ? [...participants, organizer] : participants;
  const hours = new Set<number>();
  
  allParticipants.forEach(participant => {
    // Add hours from morning sessions
    if (lessonType !== 'afternoon') {
      participant.allConnections.morning.forEach(connection => {
        const startHour = connection.joinTime.getHours();
        const endHour = connection.leaveTime.getHours();
        for (let h = Math.max(9, startHour); h <= Math.min(13, endHour); h++) {
          hours.add(h);
        }
      });
    }
    
    // Add hours from afternoon sessions
    if (lessonType !== 'morning') {
      participant.allConnections.afternoon.forEach(connection => {
        const startHour = connection.joinTime.getHours();
        const endHour = connection.leaveTime.getHours();
        for (let h = Math.max(14, startHour); h <= Math.min(18, endHour); h++) {
          hours.add(h);
        }
      });
    }
  });
  
  return Array.from(hours).sort((a, b) => a - b);
};
import { FiFileText, FiCalendar, FiDownload, FiAlertCircle, FiCheckCircle, FiInfo, FiHelpCircle } from 'react-icons/fi';
import './App.css';

function App() {
  const [lessonType, setLessonType] = useState<LessonType>('both');
  const [morningFile, setMorningFile] = useState<File | null>(null);
  const [afternoonFile, setAfternoonFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [courseId, setCourseId] = useState('');
  const [participants, setParticipants] = useState<ProcessedParticipant[]>([]);
  const [organizer, setOrganizer] = useState<ProcessedParticipant | null>(null);
  const [lessonHours, setLessonHours] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'edit' | 'generate'>('upload');
  const [debugMode, setDebugMode] = useState(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);

  // Auto-load the existing template file on component mount
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      try {
        // Try to fetch the existing template file
        const response = await fetch('/modello B fad_{ID_CORSO}_{START_DATE}.docx');
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], 'modello B fad_{ID_CORSO}_{START_DATE}.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
          setTemplateFile(file);
          console.log('Template file loaded automatically');
        }
      } catch (error) {
        console.log('Template file not found, user will need to select manually');
      }
    };
    loadDefaultTemplate();
  }, []);

  const handleFileProcessing = async () => {
    if (!templateFile || !subject.trim()) {
      setError('Seleziona il template Word e inserisci l\'argomento della lezione');
      return;
    }

    if (lessonType === 'both' && (!morningFile || !afternoonFile)) {
      setError('Per lezioni complete, carica entrambi i file CSV');
      return;
    }

    if (lessonType === 'morning' && !morningFile) {
      setError('Carica il file CSV della mattina');
      return;
    }

    if (lessonType === 'afternoon' && !afternoonFile) {
      setError('Carica il file CSV del pomeriggio');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let morningParticipants: any[] = [];
      let afternoonParticipants: any[] = [];

      // Parse morning CSV if needed
      if (morningFile && (lessonType === 'morning' || lessonType === 'both')) {
        const morningContent = await morningFile.text();
        morningParticipants = parseZoomCSV(morningContent);
      }

      // Parse afternoon CSV if needed
      if (afternoonFile && (lessonType === 'afternoon' || lessonType === 'both')) {
        const afternoonContent = await afternoonFile.text();
        afternoonParticipants = parseZoomCSV(afternoonContent);
      }

      // Process participants
      const { participants: processedParticipants, organizer: processedOrganizer } = processParticipants(morningParticipants, afternoonParticipants);
      
      // Calculate dynamic lesson hours based on actual data
      const dynamicLessonHours = calculateDynamicLessonHours(processedParticipants, processedOrganizer, lessonType);
      
      setParticipants(processedParticipants);
      setOrganizer(processedOrganizer);
      setLessonHours(dynamicLessonHours);
      setStep('edit');
    } catch (err) {
      setError('Errore durante l\'elaborazione dei file CSV: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!templateFile) {
      setError('Template Word non selezionato');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Extract date from filename (assuming format like "Mattina_2025_07_08.csv")
      const dateFile = morningFile || afternoonFile;
      let lessonDate = new Date();
      
      if (dateFile) {
        const dateMatch = dateFile.name.match(/(\d{4})_(\d{2})_(\d{2})/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          lessonDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }

      const lessonData: LessonData = {
        date: lessonDate,
        subject: subject.trim(),
        courseId: courseId.trim() || undefined,
        participants: participants,
        organizer: organizer || undefined,
        lessonType: lessonType,
        lessonHours: lessonHours
      };

      await generateWordDocument(lessonData, templateFile);
      setStep('generate');
    } catch (err) {
      const errorMessage = (err as Error).message;
      if (errorMessage.includes('template') || errorMessage.includes('placeholder')) {
        setError(
          `Errore nel template Word: ${errorMessage}\n\n` +
          'Verifica che il template contenga tutti i placeholder richiesti:\n' +
          '{{day}}, {{month}}, {{year}}, {{orarioLezione}}, {{argomento}}\n' +
          '{{nome1}}-{{nome5}}, {{MattOraIn1}}-{{MattOraIn5}}, ecc.\n\n' +
          'Consulta TEMPLATE_GUIDE.md per maggiori dettagli.'
        );
      } else {
        setError('Errore durante la generazione del documento: ' + errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    setStep('upload');
    setParticipants([]);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <FiFileText size={32} />
          Generatore Registro Presenza Zoom
        </h1>
        <p>Genera automaticamente registri di presenza in formato Word dai report CSV di Zoom</p>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-message">
            <FiAlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {step === 'upload' && (
          <div className="upload-section">
            <div className="lesson-type-selector">
              <h3>Tipo di Lezione</h3>
              <div className="info-box">
                <FiInfo className="icon" />
                <p><strong>Esempio:</strong> Solo l'orario di <strong>inizio lezione</strong> viene arrotondato all'ora spaccata più vicina. 
                Se la prima persona entra alle 09:15, l'orario di inizio sarà mostrato come 09:00. Gli orari individuali di ingresso/uscita rimangono esatti.</p>
              </div>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="morning"
                    checked={lessonType === 'morning'}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                  />
                  <span>Solo Mattina (09:00-13:00)</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="afternoon"
                    checked={lessonType === 'afternoon'}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                  />
                  <span>Solo Pomeriggio (14:00-18:00)</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="both"
                    checked={lessonType === 'both'}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                  />
                  <span>Entrambi (09:00-13:00 / 14:00-18:00)</span>
                </label>
              </div>
            </div>

            <div className="file-uploads">
              {(lessonType === 'morning' || lessonType === 'both') && (
                <FileUpload
                  label="File CSV Mattina"
                  accept=".csv"
                  onFileSelect={setMorningFile}
                  selectedFile={morningFile || undefined}
                  icon={<FiCalendar size={24} />}
                  required
                />
              )}

              {(lessonType === 'afternoon' || lessonType === 'both') && (
                <FileUpload
                  label="File CSV Pomeriggio"
                  accept=".csv"
                  onFileSelect={setAfternoonFile}
                  selectedFile={afternoonFile || undefined}
                  icon={<FiCalendar size={24} />}
                  required
                />
              )}

              <div className="template-section">
                <div className="template-header">
                  <FileUpload
                    label="Template Word (.docx)"
                    accept=".docx"
                    onFileSelect={setTemplateFile}
                    selectedFile={templateFile || undefined}
                    icon={<FiFileText size={24} />}
                    required
                  />
                  <button 
                    type="button" 
                    className="help-button"
                    onClick={() => setShowTemplateGuide(true)}
                    title="Guida Template"
                  >
                    <FiHelpCircle size={20} />
                    Guida Template
                  </button>
                </div>
                <div className="template-info">
                  <p><strong>Percorso standard:</strong> <code>modello B fad_{'{'}{courseId || 'ID_CORSO'}{'}'}_{'{'}{new Date().toISOString().split('T')[0].replace(/-/g, '_')}{'}'}.docx</code></p>
                </div>
              </div>
            </div>

            <div className="form-inputs">
              <div className="input-group">
                <label htmlFor="courseId">
                  ID Corso (facoltativo)
                </label>
                <input
                  id="courseId"
                  type="text"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="Es: AI2024 (se vuoto, non verrà incluso nel nome file)"
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="subject">
                  Argomento della Lezione <span className="required">*</span>
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Es: AI: Intelligenza Artificiale"
                  required
                />
              </div>
            </div>

            <button
              className="process-button"
              onClick={handleFileProcessing}
              disabled={isProcessing}
            >
              {isProcessing ? 'Elaborazione...' : 'Elabora File CSV'}
            </button>
          </div>
        )}

        {step === 'edit' && (
          <div className="edit-section">
            <ParticipantEditor
              participants={participants}
              organizer={organizer || undefined}
              onParticipantsChange={setParticipants}
              lessonType={lessonType}
            />

            <AttendanceDashboard
              participants={participants}
              organizer={organizer || undefined}
              lessonType={lessonType}
              lessonHours={lessonHours}
              lessonDate={(() => {
                // Extract date from filename (assuming format like "Mattina_2025_07_08.csv")
                const dateFile = morningFile || afternoonFile;
                if (dateFile) {
                  const dateMatch = dateFile.name.match(/(\d{4})_(\d{2})_(\d{2})/);
                  if (dateMatch) {
                    const [, year, month, day] = dateMatch;
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  }
                }
                return new Date();
              })()}
            />

            {debugMode && (
              <DebugInfo 
                lessonData={{
                  date: new Date(),
                  subject: subject,
                  courseId: courseId.trim() || undefined,
                  participants: participants,
                  organizer: organizer || undefined,
                  lessonType: lessonType,
                  lessonHours: lessonHours
                }}
                templateData={{}}
              />
            )}

            <div className="edit-actions">
              <button className="back-button" onClick={resetApp}>
                Torna Indietro
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={debugMode} 
                  onChange={(e) => setDebugMode(e.target.checked)} 
                />
                Debug Mode
              </label>
              <button
                className="generate-button"
                onClick={handleGenerateDocument}
                disabled={isProcessing}
              >
                <FiDownload size={20} />
                {isProcessing ? 'Generazione...' : 'Genera Registro Word'}
              </button>
            </div>
          </div>
        )}

        {step === 'generate' && (
          <div className="success-section">
            <div className="success-message">
              <FiCheckCircle size={48} />
              <h3>Registro Generato con Successo!</h3>
              <p>Il file Word è stato scaricato automaticamente.</p>
            </div>

            <button className="new-document-button" onClick={resetApp}>
              Genera Nuovo Registro
            </button>
          </div>
        )}
      </main>
      
      <TemplateGuide 
        isOpen={showTemplateGuide} 
        onClose={() => setShowTemplateGuide(false)} 
      />
    </div>
  );
}

export default App;
