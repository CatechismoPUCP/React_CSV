import React from 'react';
import { TemplateGuide } from './components/TemplateGuide';
import { UploadSection, EditSection, SuccessSection } from './components/sections';
import { ErrorMessage, AppHeader } from './components/common';
import {
  useAppState,
  useErrorHandler,
  useFileProcessing,
  useDocumentGeneration,
  useTemplateLoader
} from './hooks';
import { APP_STEPS, ERROR_MESSAGES } from './constants';
import './App.css';


function App() {
  const appState = useAppState();
  const { error, handleError, handleTemplateError, clearError } = useErrorHandler();
  const { isProcessing, processFiles } = useFileProcessing();
  const { isGenerating, generateDocument } = useDocumentGeneration();
  const { templateFile, setTemplateFile } = useTemplateLoader();

  // Use template file from hook, but allow override from app state
  const currentTemplateFile = appState.templateFile || templateFile;

  const handleFileProcessing = async () => {
    await processFiles(
      appState.lessonType,
      appState.morningFile,
      appState.afternoonFile,
      currentTemplateFile,
      appState.subject,
      ({ participants, organizer, lessonHours }) => {
        appState.setParticipants(participants);
        appState.setOrganizer(organizer);
        appState.setLessonHours(lessonHours);
        appState.setStep(APP_STEPS.EDIT);
      },
      (errorKey) => {
        const message = ERROR_MESSAGES[errorKey as keyof typeof ERROR_MESSAGES] || errorKey;
        handleError(message);
      }
    );
  };

  const handleGenerateDocument = async () => {
    await generateDocument(
      currentTemplateFile,
      appState.subject,
      appState.courseId,
      appState.participants,
      appState.organizer,
      appState.lessonType,
      appState.lessonHours,
      appState.morningFile,
      appState.afternoonFile,
      () => appState.setStep(APP_STEPS.GENERATE),
      (errorMessage) => {
        if (errorMessage.includes('template') || errorMessage.includes('placeholder')) {
          handleTemplateError(errorMessage);
        } else {
          handleError('DOCUMENT_GENERATION_ERROR', errorMessage);
        }
      }
    );
  };

  return (
    <div className="app">
      <AppHeader />

      <main className="app-main">
        {error && (
          <ErrorMessage error={error} onClose={clearError} />
        )}

        {appState.step === APP_STEPS.UPLOAD && (
          <UploadSection
            lessonType={appState.lessonType}
            setLessonType={appState.setLessonType}
            morningFile={appState.morningFile}
            setMorningFile={appState.setMorningFile}
            afternoonFile={appState.afternoonFile}
            setAfternoonFile={appState.setAfternoonFile}
            templateFile={currentTemplateFile}
            setTemplateFile={(file) => {
              appState.setTemplateFile(file);
              setTemplateFile(file);
            }}
            courseId={appState.courseId}
            setCourseId={appState.setCourseId}
            subject={appState.subject}
            setSubject={appState.setSubject}
            onShowTemplateGuide={() => appState.setShowTemplateGuide(true)}
            onProcessFiles={handleFileProcessing}
            isProcessing={isProcessing}
          />
        )}

        {appState.step === APP_STEPS.EDIT && (
          <EditSection
            participants={appState.participants}
            organizer={appState.organizer}
            onParticipantsChange={appState.setParticipants}
            lessonType={appState.lessonType}
            lessonHours={appState.lessonHours}
            morningFile={appState.morningFile}
            afternoonFile={appState.afternoonFile}
            subject={appState.subject}
            courseId={appState.courseId}
            debugMode={appState.debugMode}
            setDebugMode={appState.setDebugMode}
            onBack={appState.resetApp}
            onGenerateDocument={handleGenerateDocument}
            isGenerating={isGenerating}
          />
        )}

        {appState.step === APP_STEPS.GENERATE && (
          <SuccessSection onNewDocument={appState.resetApp} />
        )}
      </main>
      
      <TemplateGuide 
        isOpen={appState.showTemplateGuide} 
        onClose={() => appState.setShowTemplateGuide(false)} 
      />
    </div>
  );
}

export default App;
