export const LESSON_HOURS = {
  MORNING: {
    START: 9,
    END: 13,
  },
  AFTERNOON: {
    START: 14,
    END: 18,
  },
} as const;

export const FILE_TYPES = {
  CSV: '.csv',
  DOCX: '.docx',
} as const;

export const LESSON_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  BOTH: 'both',
} as const;

export const APP_STEPS = {
  UPLOAD: 'upload',
  EDIT: 'edit',
  GENERATE: 'generate',
} as const;

export const ERROR_MESSAGES = {
  MISSING_TEMPLATE_OR_SUBJECT: 'Seleziona il template Word e inserisci l\'argomento della lezione',
  MISSING_BOTH_FILES: 'Per lezioni complete, carica entrambi i file CSV',
  MISSING_MORNING_FILE: 'Carica il file CSV della mattina',
  MISSING_AFTERNOON_FILE: 'Carica il file CSV del pomeriggio',
  MISSING_TEMPLATE: 'Template Word non selezionato',
  CSV_PROCESSING_ERROR: 'Errore durante l\'elaborazione dei file CSV: ',
  DOCUMENT_GENERATION_ERROR: 'Errore durante la generazione del documento: ',
  TEMPLATE_ERROR_PREFIX: 'Errore nel template Word: ',
  TEMPLATE_ERROR_DETAILS: 'Verifica che il template contenga tutti i placeholder richiesti:\n{{day}}, {{month}}, {{year}}, {{orarioLezione}}, {{argomento}}\n{{nome1}}-{{nome5}}, {{MattOraIn1}}-{{MattOraIn5}}, ecc.\n\nConsulta TEMPLATE_GUIDE.md per maggiori dettagli.',
} as const;

export const TEMPLATE_FILENAME_PATTERN = 'modello B fad_{ID_CORSO}_{START_DATE}.docx';

export const DATE_REGEX = /(\d{4})_(\d{2})_(\d{2})/;
