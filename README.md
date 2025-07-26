# Generatore Registro Presenza Zoom

Una webapp React TypeScript avanzata per la generazione automatica di registri di presenza giornalieri in formato Word (.docx) a partire dai report CSV di Zoom, con supporto per template personalizzati e calcolo intelligente degli orari di lezione.

## 🚀 Caratteristiche Avanzate

- **Sistema Template Standardizzato**
  - Percorso template predefinito: `modello B fad_{ID_CORSO}_{DATA_INIZIO}.docx`
  - Caricamento automatico dalla cartella pubblica
  - Generazione automatica del nome file con ID corso e data
  - Guida ai placeholder integrata

- **Gestione Corsi Avanzata**
  - Campo ID Corso obbligatorio
  - Integrazione ID Corso nel nome file generato
  - Validazione avanzata dei campi

- **Sistema di Calcolo Orari Intelligente**
  - Riconoscimento automatico orari di inizio/fine lezione
  - Arrotondamento intelligente agli orari interi (es. 17:02 → 17:00)
  - Calcolo orari di fine sessione basati sui dati effettivi
  - Supporto per lezioni mattutine e pomeridiane

- **Gestione Partecipanti**
  - Calcolo presenze con soglia 14 minuti
  - Esclusione automatica disconnessioni brevi (<90 secondi)
  - Editor drag & drop per riordinare i partecipanti
  - Supporto per assenze parziali (mattina/pomeriggio)

- **Interfaccia Utente**
  - Form intuitivo con validazione
  - Guida integrata ai template
  - Esempi di funzionamento del sistema di calcolo
  - Feedback visivo immediato
  - Design responsive e moderno

## 📋 Requisiti di Sistema

- Node.js 16 o superiore
- npm 8 o superiore
- Browser moderno (Chrome, Firefox, Edge, Safari)
- Template Word (.docx) con placeholder specifici
- File CSV Zoom esportati dalla piattaforma

## 🛠️ Installazione e Avvio

### Prerequisiti
Assicurati di avere installato:
- [Node.js](https://nodejs.org/) (versione 16 o superiore)
- [npm](https://www.npmjs.com/) (incluso con Node.js)

### Passaggi di Installazione

1. **Clona il repository**
   ```bash
   git clone https://tuo-repository.git
   cd React_CSV
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Avvia l'applicazione in modalità sviluppo**
   ```bash
   npm start
   ```

4. **Accesso all'applicazione**
   Apri il browser e vai su [http://localhost:3000](http://localhost:3000)

### Build per Produzione
Per creare una versione ottimizzata per la produzione:

```bash
npm run build
```

I file ottimizzati saranno disponibili nella cartella `build/`.

## 📁 Struttura File CSV Zoom

I file CSV devono contenere:

1. **Intestazione sessione** (prime 2 righe):
```
Argomento,ID,Organizzatore,Durata (minuti),Ora di inizio,Ora di fine,Partecipanti
AI: Intelligenza Artificale,7430864126,Grazia Trainito,244,"08/07/2025 08:57:00 AM","08/07/2025 01:00:26 PM",8
```

2. **Dati partecipanti** (dalla riga con "Nome (nome originale)"):
```
Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,...
Mario Rossi,mario@email.com,"08/07/2025 09:02:37 AM","08/07/2025 12:07:54 PM",185,No,...
```

## 🧩 Guida ai Template Word

### Posizionamento Template
Inserisci il tuo file template nella cartella `public/templates/` con il formato:
```
public/
  templates/
    modello B fad_{ID_CORSO}_{DATA}.docx
es. modello B fad_ABC123_2025-07-26.docx
```

### Placeholder Supportati
Il template Word deve contenere i seguenti placeholder:

### Dati generali
- `{{day}}`, `{{month}}`, `{{year}}` - Data lezione
- `{{orarioLezione}}` - Orario (es: "09:00-13:00")
- `{{argomento}}` - Argomento della lezione

### Partecipanti (1-5)
- `{{nome1}}` - `{{nome5}}` - Nomi partecipanti
- `{{MattOraIn1}}` - `{{MattOraIn5}}` - Orari ingresso mattina
- `{{MattOraOut1}}` - `{{MattOraOut5}}` - Orari uscita mattina
- `{{PomeOraIn1}}` - `{{PomeOraIn5}}` - Orari ingresso pomeriggio
- `{{PomeOraOut1}}` - `{{PomeOraOut5}}` - Orari uscita pomeriggio
- `{{presenza1}}` - `{{presenza5}}` - Stato presenza (✅ / ❌ ASSENTE)

## 📖 Guida all'Utilizzo

### 1. Preparazione
- Assicurati di avere i file CSV Zoom esportati
- Prepara il template Word con i placeholder necessari
- Prendi nota dell'ID del corso

### 2. Configurazione Iniziale
1. **Inserisci l'ID Corso** (campo obbligatorio)
2. **Seleziona il tipo di lezione**:
   - ☀️ Solo Mattina
   - 🌙 Solo Pomeriggio
   - 🌓 Intera Giornata

### 3. Caricamento File
1. **Carica il file CSV Zoom**
   - Per lezioni mattutine: carica il file della sessione mattutina
   - Per lezioni pomeridiane: carica il file della sessione pomeridiana
   - Per giornate intere: carica entrambi i file

2. **Carica il Template Word**
   - Se presente in `public/templates/` con il formato corretto, verrà caricato automaticamente
   - Altrimenti, caricalo manualmente

### 4. Inserimento Dati
1. **Inserisci l'argomento** della lezione
2. **Verifica la data** (preimpostata alla data odierna)
3. **Elabora i file** con il pulsante dedicato

### 5. Verifica e Modifica
1. **Controlla i partecipanti** rilevati
2. **Riordina** i partecipanti con drag & drop
3. **Verifica** le presenze calcolate
4. **Apporta modifiche** manuali se necessario

### 6. Generazione Documento
1. Clicca su **Genera Documento**
2. Scarica il file Word generato
3. Verifica il contenuto generato

## ⚙️ Sistema di Calcolo Avanzato

### Regole di Calcolo Presenze
- **✅ Presente**: Assenze totali ≤ 14 minuti
- **❌ Assente**: Assenze totali > 14 minuti o non presente in nessuna sessione

### Gestione Orari
- **Arrotondamento orari**:
  - Orari di ingresso arrotondati per difetto (es. 09:02 → 09:00)
  - Orari di uscita arrotondati per eccesso (es. 12:58 → 13:00)
  - Arrotondamento al quarto d'ora più vicino

### Eccezioni e Casi Particolari
- **Disconnessioni brevi**: < 90 secondi non contano come assenze
- **Pausa pranzo**: 13:00-14:00 non viene considerata assenza
- **Sessioni parziali**:
  - Presente solo al mattino = Presente (se ≤ 14 min assenze)
  - Presente solo al pomeriggio = Presente (se ≤ 14 min assenze)
  - Assente in entrambe le sessioni = Assente

### Calcolo Automatico Orari Lezione
- **Inizio lezione mattutina**: Primo orario di ingresso tra i partecipanti (arrotondato)
- **Fine lezione mattutina**: Ultimo orario di uscita prima delle 14:00 (arrotondato)
- **Inizio lezione pomeridiana**: Primo orario di ingresso dopo le 14:00 (arrotondato)
- **Fine lezione pomeridiana**: Ultimo orario di uscita (arrotondato)

## 🏗️ Architettura e Tecnologie

### Frontend
- **React 18** - Libreria UI
- **TypeScript** - Tipizzazione statica
- **React Hooks** - Gestione stato e side effects
- **Context API** - Gestione stato globale

### Librerie Principali
- **papaparse** - Elaborazione file CSV
- **docxtemplater** + **pizzip** - Generazione documenti Word
- **react-beautiful-dnd** - Gestione drag & drop
- **date-fns** - Manipolazione date/ore
- **file-saver** - Download file lato client
- **react-icons** - Libreria icone
- **react-modal** - Finestre modali

### Strumenti di Sviluppo
- **Create React App** - Configurazione progetto
- **ESLint** + **Prettier** - Formattazione codice
- **Jest** + **React Testing Library** - Testing

## 📝 Esempi Pratici

### Esempio 1: Lezione Mattutina
```
ID Corso: ABC123
Argomento: Introduzione a React
Tipo Lezione: ☀️ Solo Mattina

PARTECIPANTI:
Nome            | Ingresso | Uscita  | Presenza
----------------|----------|---------|---------
Mario Rossi     | 09:02    | 12:58   | ✅
Luigi Verdi     | 09:15    | 10:30   | ❌ ASSENTE
Anna Neri       | 09:00    | 13:02   | ✅
```

### Esempio 2: Giornata Intera
```
ID Corso: XYZ789
Argomento: Advanced TypeScript
Tipo Lezione: 🌓 Intera Giornata

PARTECIPANTI:
Nome            | MattIn | MattOut | PomeIn | PomeOut | Presenza
----------------|--------|---------|--------|---------|---------
Carlo Bianchi   | 09:00  | 12:58   | 14:05  | 17:55   | ✅
Laura Rossi     | 09:10  | 12:30   | 14:15  | 17:30   | ✅
Marco Neri      | -      | -       | 14:00  | 18:00   | ✅ (solo pomeriggio)
Giulia Verdi    | 09:00  | 10:00   | -      | -       | ❌ ASSENTE (mattina incompleta)
```

### Esempio 3: Disconnessioni Brevi
```
ID Corso: DIS2023
Partecipante: Luca Gialli

Timeline:
- 09:00:00 - Accesso iniziale
- 10:15:30 - Disconnessione (durata 1m25s) → Non conteggiata
- 10:17:00 - Riconnessione
- 12:30:00 - Uscita

Risultato: ✅ PRESENTE (disconnessione <90s ignorata)
Marco Verdi     |           |            | 14:15     | 17:00      | ✅
Andrea Neri     |           |            |           |            | ❌ ASSENTE
```

## 🐛 Risoluzione Problemi

- **Errore parsing CSV**: Verifica formato file Zoom
- **Template non trovato**: Controlla che il file .docx contenga i placeholder corretti
- **Partecipanti mancanti**: Aggiungi manualmente gli assenti nell'editor

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT.
