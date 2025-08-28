# Guida Implementazione Modalità "Corso Completo"

## 📋 Overview del Sistema

La modalità "Corso Completo" estende l'app esistente per gestire corsi multi-giorno con persistenza locale, dashboard avanzate e generazione automatica documenti.

## 🎯 Prompt per l'Implementazione

**"Implementa la modalità 'Corso Completo' per l'app React CSV utilizzando un'architettura ibrida localStorage + IndexedDB. Il sistema deve gestire corsi multi-giorno con calendario, partecipanti, dashboard presenze giornaliere, generazione automatica Moduli B, gestione assenze e report completi. Riutilizza le funzioni esistenti di elaborazione CSV e generazione documenti, estendendole per supportare persistenza e batch processing."**

## 🏗️ Architettura Tecnica

### Stack Tecnologico Raccomandato
```json
{
  "dependencies": {
    "zustand": "^4.4.1",
    "idb": "^7.1.1", 
    "zod": "^3.22.4",
    "react-hook-form": "^7.45.4",
    "react-calendar": "^4.6.0",
    "date-fns": "^2.29.3"
  }
}
```

### Struttura Storage Ibrida
- **localStorage**: Metadati corso, configurazioni, cache rapido
- **IndexedDB**: File CSV raw, dati processati, documenti generati
- **Backup**: Export/Import JSON completo

## 📊 Schema Dati

### 1. Struttura Principale Corso (localStorage)
```typescript
interface CourseData {
  courseId: string;
  courseInfo: {
    name: string;
    startDate: string;
    endDate: string;
    instructor: PersonInfo;
    coordinator: PersonInfo;
  };
  participants: CourseParticipant[];
  schedule: LessonSchedule[];
  settings: CourseSettings;
  metadata: CourseMetadata;
}

interface CourseParticipant {
  id: string;
  name: string;
  email: string;
  enrollmentOrder: number;
  isActive: boolean;
}

interface LessonSchedule {
  date: string; // YYYY-MM-DD
  sessions: {
    morning?: SessionInfo;
    afternoon?: SessionInfo;
  };
  lessonType: 'online' | 'presence' | 'hybrid';
  subject?: string;
}
```

### 2. Dati Giornalieri (IndexedDB)
```typescript
interface DailyLessonData {
  courseId: string;
  date: string;
  csvFiles: {
    morning?: StoredFile;
    afternoon?: StoredFile;
  };
  processedData?: ProcessedLessonData;
  manualAdjustments: ManualAdjustment[];
  documents: GeneratedDocuments;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface StoredFile {
  filename: string;
  data: ArrayBuffer;
  uploadedAt: string;
  size: number;
}

interface ManualAdjustment {
  participantId: string;
  session: 'morning' | 'afternoon';
  originalHours: number;
  adjustedHours: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: string;
}
```

## 🔧 Servizi da Implementare

### 1. CourseStorageService
```typescript
class CourseStorageService {
  // localStorage operations
  async saveCourse(courseData: CourseData): Promise<void>
  async getCourse(courseId: string): Promise<CourseData | null>
  async getAllCourses(): Promise<CourseData[]>
  async deleteCourse(courseId: string): Promise<void>
  
  // IndexedDB operations
  async saveDailyData(dailyData: DailyLessonData): Promise<void>
  async getDailyData(courseId: string, date: string): Promise<DailyLessonData | null>
  async saveCsvFile(courseId: string, date: string, session: string, file: File): Promise<void>
  async getCsvFile(courseId: string, date: string, session: string): Promise<File | null>
  
  // Backup/Export
  async exportCourse(courseId: string): Promise<Blob>
  async importCourse(file: File): Promise<CourseData>
}
```

### 2. CourseBatchProcessor
```typescript
class CourseBatchProcessor {
  // Riutilizza useFileProcessing esistente
  async processDailyFiles(
    courseId: string, 
    date: string, 
    morningFile?: File, 
    afternoonFile?: File
  ): Promise<ProcessedLessonData>
  
  // Riutilizza useDocumentGeneration esistente
  async generateDailyDocument(
    courseId: string, 
    date: string
  ): Promise<GeneratedDocument>
  
  async generateBatchDocuments(
    courseId: string, 
    dateRange: string[]
  ): Promise<GeneratedDocument[]>
  
  async generateAbsenceReport(
    courseId: string, 
    date: string
  ): Promise<GeneratedDocument>
}
```

### 3. CourseReportService
```typescript
class CourseReportService {
  async generateAttendanceReport(courseId: string): Promise<AttendanceReport>
  async generateParticipantSummary(courseId: string, participantId: string): Promise<ParticipantSummary>
  async exportAttendanceData(courseId: string, format: 'excel' | 'csv'): Promise<Blob>
}
```

## 🎨 Componenti UI da Creare

### 1. Struttura Principale
```
src/components/full-course/
├── CourseSetup/
│   ├── CourseInfoForm.tsx
│   ├── ParticipantsList.tsx
│   ├── ScheduleCalendar.tsx
│   └── CourseSettings.tsx
├── CourseDashboard/
│   ├── DashboardOverview.tsx
│   ├── DailyLessonCard.tsx
│   ├── AttendanceChart.tsx
│   └── QuickActions.tsx
├── DailyManagement/
│   ├── DailyUpload.tsx
│   ├── AttendanceEditor.tsx
│   ├── ManualAdjustments.tsx
│   └── DocumentGeneration.tsx
└── Reports/
    ├── AttendanceReport.tsx
    ├── ParticipantReport.tsx
    └── ExportOptions.tsx
```

### 2. Hook Personalizzati
```typescript
// Estende useAppState esistente
const useCourseState = () => {
  // Gestione stato corso completo
}

// Riutilizza logica esistente
const useCourseBatchProcessing = () => {
  // Wrapper per batch processing
}

const useCourseStorage = () => {
  // Gestione storage ibrido
}

const useCourseReports = () => {
  // Generazione report
}
```

## 🔄 Workflow Implementazione

### Fase 1: Setup Base (2-3 giorni)
1. **Installare dipendenze** necessarie
2. **Creare schema Zod** per validazione dati
3. **Implementare CourseStorageService** base
4. **Creare componente CourseSetup** per configurazione iniziale

### Fase 2: Dashboard e Gestione (3-4 giorni)
1. **Implementare CourseDashboard** con overview
2. **Creare DailyLessonCard** per gestione giornaliera
3. **Integrare calendario** per navigazione date
4. **Implementare upload CSV** giornaliero

### Fase 3: Processing e Documenti (2-3 giorni)
1. **Estendere useFileProcessing** per batch
2. **Implementare CourseBatchProcessor**
3. **Creare sistema generazione** documenti multipli
4. **Implementare gestione assenze**

### Fase 4: Reports e Export (2 giorni)
1. **Implementare CourseReportService**
2. **Creare componenti report**
3. **Sistema export/import** completo
4. **Testing e ottimizzazioni**

## 🔧 Integrazione con Sistema Esistente

### Riutilizzo Funzioni Esistenti
```typescript
// Da useFileProcessing.ts
const { processFiles } = useFileProcessing();

// Wrapper per batch processing
const processCourseDay = async (courseId: string, date: string) => {
  const dailyData = await courseStorage.getDailyData(courseId, date);
  
  return await processFiles(
    dailyData.lessonType,
    dailyData.csvFiles.morning,
    dailyData.csvFiles.afternoon,
    templateFile,
    subject,
    // callbacks...
  );
};
```

### Estensione Tipi Esistenti
```typescript
// Estende ProcessedParticipant
interface CourseProcessedParticipant extends ProcessedParticipant {
  courseId: string;
  totalCourseHours: number;
  attendanceDays: string[];
  absenceDays: string[];
  manualAdjustments: ManualAdjustment[];
}

// Estende LessonData
interface CourseLessonData extends LessonData {
  courseId: string;
  dayNumber: number;
  isProcessed: boolean;
  hasManualAdjustments: boolean;
}
```

## 📱 Interfaccia Utente

### 1. Setup Corso
- **Form configurazione** corso (nome, date, docente, responsabile)
- **Lista partecipanti** con drag&drop per ordinamento
- **Calendario interattivo** per pianificazione lezioni
- **Impostazioni avanzate** (regole presenza, template personalizzati)

### 2. Dashboard Principale
- **Overview corso** con statistiche generali
- **Calendario navigabile** con stato giorni (completato/pending/error)
- **Cards giornaliere** con azioni rapide
- **Grafici presenza** e trend partecipazione

### 3. Gestione Giornaliera
- **Upload CSV** con preview e validazione
- **Editor presenze** con modifica manuale
- **Generazione documenti** con preview
- **Log attività** e cronologia modifiche

### 4. Reports e Export
- **Report partecipazione** per corsista
- **Statistiche corso** complete
- **Export dati** in vari formati
- **Backup/restore** configurazioni

## ⚠️ Considerazioni Tecniche

### Gestione Errori
- **Fallback storage**: localStorage se IndexedDB non disponibile
- **Recovery automatico**: Backup incrementali
- **Validazione dati**: Schema Zod per tutti gli input
- **Error boundaries**: Gestione errori UI

### Performance
- **Lazy loading**: Caricamento dati on-demand
- **Virtualizzazione**: Liste grandi partecipanti
- **Caching intelligente**: Dati frequenti in memoria
- **Batch operations**: Elaborazione asincrona

### Sicurezza
- **Validazione input**: Sanitizzazione dati utente
- **Backup crittografato**: Protezione dati sensibili
- **Audit trail**: Log modifiche importanti

## 🚀 Deployment e Distribuzione

### Build Ottimizzata
```json
{
  "scripts": {
    "build:full-course": "npm run build && npm run optimize-storage",
    "optimize-storage": "node scripts/optimize-indexeddb.js"
  }
}
```

### Preparazione Electron
- **Configurazione IPC** per storage filesystem
- **Menu nativi** per export/import
- **Notifiche desktop** per completamento batch
- **Auto-updater** per nuove versioni

## 📋 Checklist Implementazione

### Setup Iniziale
- [ ] Installare dipendenze (zustand, idb, zod, react-hook-form, react-calendar)
- [ ] Creare schema TypeScript per CourseData
- [ ] Implementare CourseStorageService base
- [ ] Setup IndexedDB con stores necessari

### Componenti Core
- [ ] CourseSetup con form configurazione
- [ ] CourseDashboard con overview
- [ ] DailyLessonCard per gestione giornaliera
- [ ] Calendario navigabile con stati

### Processing e Documenti
- [ ] Estendere useFileProcessing per batch
- [ ] Implementare CourseBatchProcessor
- [ ] Sistema generazione documenti multipli
- [ ] Gestione assenze automatica

### Reports e Export
- [ ] CourseReportService completo
- [ ] Componenti visualizzazione report
- [ ] Sistema export/import robusto
- [ ] Testing completo funzionalità

### Ottimizzazioni
- [ ] Performance tuning storage
- [ ] Error handling completo
- [ ] UI/UX polish
- [ ] Documentazione utente

## 🎯 Risultato Finale

Un sistema completo per gestione corsi multi-giorno che:
- **Riutilizza** tutta la logica esistente di elaborazione CSV
- **Estende** le funzionalità con persistenza e batch processing
- **Fornisce** interfaccia intuitiva per gestione complessa
- **Garantisce** robustezza e performance per uso professionale
- **Supporta** export in eseguibile Electron per distribuzione desktop

La modalità sarà completamente integrata nel menu principale esistente e condividerà tutti i servizi e componenti base dell'app attuale.
