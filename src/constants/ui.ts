export const UI_CONSTANTS = {
  MAX_ABSENCE_MINUTES: 15,
  MAX_PARTICIPANTS_IN_DOCUMENT: 5,
  
  LESSON_TYPE_LABELS: {
    morning: 'Solo Mattina',
    afternoon: 'Solo Pomeriggio',
    full: 'Giornata Completa'
  },
  
  LESSON_TYPE_DESCRIPTIONS: {
    morning: 'Lezione solo al mattino',
    afternoon: 'Lezione solo al pomeriggio',
    full: 'Lezione mattina e pomeriggio'
  },
  
  FILE_EXTENSIONS: {
    CSV: '.csv',
    DOCX: '.docx'
  },
  
  UPLOAD_MODES: {
    MANUAL: 'manual',
    FAST: 'fast'
  } as const,
  
  LOADING_MESSAGES: {
    PROCESSING: 'Elaborazione in corso...',
    ANALYZING: 'Analisi dei file in corso...',
    GENERATING: 'Generazione documento...'
  }
} as const;
