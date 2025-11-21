/**
 * Test utilities and helpers
 */

// Mock file reader for browser environment
export const createMockFile = (content: string, name: string, type: string = 'text/csv'): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

// Helper to read test CSV files from testdata directory
// Note: In real tests, we'll inline the CSV content instead of reading from fs
// since Jest runs in jsdom environment by default
export const getTestCSV = (filename: string): string => {
  // For now, we return inline content based on filename
  // This is a workaround for the browser test environment
  const testData: Record<string, string> = {
    'morning-valid.csv': `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine
Corso Test,0,1234567890,Prof. Mario Rossi,mario.rossi@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM

Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Prof. Mario Rossi (Organizzatore),mario.rossi@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No,No
Giovanni Bianchi,giovanni.bianchi@test.it,08/07/2025 09:05:00 AM,08/07/2025 12:55:00 PM,230,No,No
Maria Verdi,maria.verdi@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No,No
Luca Neri,luca.neri@test.it,08/07/2025 09:10:00 AM,08/07/2025 10:00:00 AM,50,No,No
Luca Neri,luca.neri@test.it,08/07/2025 10:05:00 AM,08/07/2025 12:50:00 PM,165,No,No`,

    'afternoon-valid.csv': `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine
Corso Test,0,1234567890,Prof. Mario Rossi,mario.rossi@test.it,08/07/2025 02:00:00 PM,08/07/2025 06:00:00 PM

Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Prof. Mario Rossi (Organizzatore),mario.rossi@test.it,08/07/2025 02:00:00 PM,08/07/2025 06:00:00 PM,240,No,No
Giovanni Bianchi,giovanni.bianchi@test.it,08/07/2025 02:05:00 PM,08/07/2025 05:55:00 PM,230,No,No
Maria Verdi,maria.verdi@test.it,08/07/2025 02:00:00 PM,08/07/2025 06:00:00 PM,240,No,No
Luca Neri,luca.neri@test.it,08/07/2025 02:00:00 PM,08/07/2025 06:00:00 PM,240,No,No`,

    'morning-with-absences.csv': `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine
Corso Test,0,1234567890,Prof. Mario Rossi,mario.rossi@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM

Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Prof. Mario Rossi (Organizzatore),mario.rossi@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM,240,No,No
Paolo Gialli,paolo.gialli@test.it,08/07/2025 09:00:00 AM,08/07/2025 09:30:00 AM,30,No,No
Paolo Gialli,paolo.gialli@test.it,08/07/2025 10:00:00 AM,08/07/2025 12:00:00 PM,120,No,No
Anna Blu,anna.blu@test.it,08/07/2025 09:00:00 AM,08/07/2025 10:00:00 AM,60,No,No
Anna Blu,anna.blu@test.it,08/07/2025 10:20:00 AM,08/07/2025 01:00:00 PM,160,No,No
Carlo Viola,carlo.viola@test.it,08/07/2025 09:00:00 AM,08/07/2025 09:40:00 AM,40,No,No`,

    'fullcourse-with-aliases.csv': `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Prof. Mario Rossi,mario.rossi@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,giorgio s.,giorgio.s@test.it,19/09/2025 09:05:00 AM,19/09/2025 12:55:00 PM,230,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,Maria Verdi,maria.verdi@test.it,19/09/2025 09:00:00 AM,19/09/2025 01:00:00 PM,240,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,Prof. Mario Rossi,mario.rossi@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,240,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,Giorgio Santambrogio,giorgio.s@test.it,20/09/2025 09:10:00 AM,20/09/2025 12:50:00 PM,220,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,20/09/2025 09:00:00 AM,20/09/2025 01:00:00 PM,Maria Verdi,maria.verdi@test.it,20/09/2025 09:05:00 AM,20/09/2025 12:55:00 PM,230,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,21/09/2025 02:00:00 PM,21/09/2025 06:00:00 PM,Prof. Mario Rossi,mario.rossi@test.it,21/09/2025 02:00:00 PM,21/09/2025 06:00:00 PM,240,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,21/09/2025 02:00:00 PM,21/09/2025 06:00:00 PM,G. Santambrogio,giorgio.s@test.it,21/09/2025 02:05:00 PM,21/09/2025 05:55:00 PM,230,No,No
Corso Completo Test,0,9876543210,Prof. Mario Rossi,mario.rossi@test.it,21/09/2025 02:00:00 PM,21/09/2025 06:00:00 PM,Maria V.,maria.verdi@test.it,21/09/2025 02:00:00 PM,21/09/2025 06:00:00 PM,240,No,No`,

    'invalid-no-participants.csv': `Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine
Corso Test,0,1234567890,Prof. Mario Rossi,mario.rossi@test.it,08/07/2025 09:00:00 AM,08/07/2025 01:00:00 PM

Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,In sala d'attesa`,

    'invalid-missing-headers.csv': `Some,Random,Headers
Value1,Value2,Value3
Value4,Value5,Value6`
  };

  if (!testData[filename]) {
    throw new Error(`Test file not found: ${filename}`);
  }

  return testData[filename];
};

// Minimal noop test to satisfy Jest when loading this file under __tests__
describe('testUtils', () => {
  it('provides CSV fixtures', () => {
    expect(typeof getTestCSV('morning-valid.csv')).toBe('string');
  });
});
