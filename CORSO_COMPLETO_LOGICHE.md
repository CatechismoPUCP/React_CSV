# 🎓 APPLICAZIONE LOGICHE PRESENZE AL CORSO COMPLETO

Questo documento spiega come le logiche di calcolo presenze (documentate in `LOGICHE_PRESENZE.md`) vengono applicate al formato CSV del corso completo.

---

## 📄 FORMATO CSV CORSO COMPLETO

Il CSV del corso completo ha questo formato:

```csv
Argomento,Digita,ID,Nome organizzatore,E-mail organizzatore,Ora di inizio,Ora di fine,Partecipanti,Durata (minuti),...,Nome (nome originale),E-mail,Ora di ingresso,Ora di uscita,Durata (minuti),Guest,...

AI : Intelligenza Artificiale,Riunione,813 2282 7439,Andres Moles,andres.moles@akgitalia.it,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",3,241,...,Andres Moles,andres.moles@akgitalia.it,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",241,No,...
AI : Intelligenza Artificiale,Riunione,813 2282 7439,Andres Moles,andres.moles@akgitalia.it,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",3,241,...,Edoardo Sanna,,"19/09/2025 01:59:07 PM","19/09/2025 01:59:11 PM",1,Sì,...
AI : Intelligenza Artificiale,Riunione,813 2282 7439,Andres Moles,andres.moles@akgitalia.it,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",3,241,...,Edoardo Sanna,,"19/09/2025 01:59:12 PM","19/09/2025 05:58:53 PM",240,Sì,...

[riga vuota = separatore tra giorni]

AI : Intelligenza Artificiale,Riunione,813 2282 7439,Andres Moles,andres.moles@akgitalia.it,"18/09/2025 01:58:23 PM","18/09/2025 05:56:50 PM",11,239,...,Andres Moles,andres.moles@akgitalia.it,"18/09/2025 01:58:23 PM","18/09/2025 05:56:50 PM",239,No,...
...
```

### Caratteristiche

1. **Una riga per connessione**: Ogni riga rappresenta una singola connessione di un partecipante
2. **Giorni separati da righe vuote**: I giorni diversi sono separati visivamente
3. **Colonne chiave**:
   - `Ora di inizio` - Orario inizio meeting del giorno
   - `Ora di fine` - Orario fine meeting del giorno
   - `Nome (nome originale)` - Nome del partecipante
   - `Ora di ingresso` - Quando il partecipante è entrato
   - `Ora di uscita` - Quando il partecipante è uscito
   - `Guest` - "Sì" se ospite, "No" se organizzatore

---

## 🔄 FLUSSO DI ELABORAZIONE

Il sistema applica le logiche in 3 fasi:

### **FASE 1: PARSING CSV** (`fullCourseParsingService.ts`)

```
CSV Grezzo
    ↓
[parseFullCourseCSV]
    ↓
Separazione per Data (raggruppa righe per giorno)
    ↓
Creazione Strutture Dati per ogni Giorno
    ↓
ParsedFullCourseData {
  days: [
    {
      date: "2025-09-19",
      sessions: [
        { participantName: "Edoardo Sanna", joinTime: ..., leaveTime: ... },
        { participantName: "Edoardo Sanna", joinTime: ..., leaveTime: ... },
        { participantName: "giorgio s.", joinTime: ..., leaveTime: ... },
        ...
      ]
    },
    {
      date: "2025-09-18",
      sessions: [...]
    },
    ...
  ]
}
```

**Risultato FASE 1**: Dati strutturati per giorno, ma SENZA calcolo presenze.

---

### **FASE 2: GENERAZIONE DOCUMENTI** (`fullCourseDocumentGenerator.ts`)

Per ogni giorno:

```
FullCourseDayData (19/09/2025)
    ↓
[groupSessionsByParticipant] - Raggruppa tutte le connessioni per partecipante
    ↓
Map {
  "Edoardo Sanna" => [
    { joinTime: 01:59:07 PM, leaveTime: 01:59:11 PM },  // Connessione 1
    { joinTime: 01:59:12 PM, leaveTime: 05:58:53 PM },  // Connessione 2
  ],
  "giorgio s." => [
    { joinTime: 02:04:39 PM, leaveTime: 02:06:05 PM },  // Connessione 1
    { joinTime: 02:06:06 PM, leaveTime: 05:58:54 PM },  // Connessione 2
  ]
}
    ↓
[splitSessionsByPeriod] - Separa mattina (< 13:00) e pomeriggio (>= 14:00)
    ↓
{
  morningParticipants: [],  // Nessuna sessione < 13:00 in questo esempio
  afternoonParticipants: [
    { name: "Edoardo Sanna", joinTime: 01:59:07 PM, ... },
    { name: "Edoardo Sanna", joinTime: 01:59:12 PM, ... },
    { name: "giorgio s.", joinTime: 02:04:39 PM, ... },
    { name: "giorgio s.", joinTime: 02:06:06 PM, ... },
  ]
}
    ↓
[processParticipants] ← QUESTA È LA FUNZIONE CHIAVE!
    ↓
Applicazione di TUTTE le logiche di LOGICHE_PRESENZE.md
    ↓
{
  participants: [
    {
      name: "Edoardo Sanna",
      totalAbsenceMinutes: 0,  // Gap: 1 secondo < 1.5 min → ignorato
      isPresent: true,         // 0 ≤ 14 → PRESENTE ✅
      ...
    },
    {
      name: "giorgio s.",
      totalAbsenceMinutes: 0,  // Gap: 1 secondo < 1.5 min → ignorato
      isPresent: true,         // 0 ≤ 14 → PRESENTE ✅
      ...
    }
  ],
  organizer: { name: "Andres Moles", ... }
}
```

**Risultato FASE 2**: Partecipanti con calcolo presenze per quel giorno.

---

### **FASE 3: GENERAZIONE WORD** (`fullCourseDocumentGenerator.ts`)

```
Partecipanti Elaborati
    ↓
[prepareTemplateData] - Prepara dati per template Word
    ↓
{
  day: "19",
  month: "09",
  year: "2025",
  argomento: "AI : Intelligenza Artificiale",
  orarioLezione: "14-18",
  nome1: "Edoardo Sanna",  // Partecipante 1 (presente)
  nome2: "giorgio s.",      // Partecipante 2 (presente)
  nome3: "",                // Vuoto
  ...
}
    ↓
[Docxtemplater] - Riempie template Word
    ↓
Documento Word Generato per il 19/09/2025
```

**Risultato FASE 3**: Documento Word per quel giorno.

---

## 🎯 APPLICAZIONE REGOLE PRESENZE

Ogni regola documentata viene applicata esattamente:

### 1. Regola 45 Minuti (≤ 14 minuti assenza)

**Fonte**: `src/utils/csvParser.ts` linee 211-213

```typescript
participant.totalAbsenceMinutes = totalAbsence;
participant.isPresent = totalAbsence <= 14;
```

**Applicata a**: Ogni partecipante di ogni giorno del corso completo.

**Esempio pratico** (19/09/2025):

```
Edoardo Sanna:
  Connessione 1: 01:59:07 PM → 01:59:11 PM (4 secondi)
  Connessione 2: 01:59:12 PM → 05:58:53 PM (quasi 4 ore)

  Gap tra connessioni: 01:59:11 → 01:59:12 = 1 secondo

  Gap < 1.5 minuti → NON conteggiato come assenza
  totalAbsenceMinutes = 0
  isPresent = true (0 ≤ 14) ✅
```

---

### 2. Gap 90 Secondi (solo gap > 1.5 minuti contano)

**Fonte**: `src/utils/csvParser.ts` linee 233-238

```typescript
const gapMinutes = (nextJoin.getTime() - currentLeave.getTime()) / (1000 * 60);

// Only count gaps longer than 90 seconds as absences
if (gapMinutes > 1.5) {
  totalAbsence += gapMinutes;
}
```

**Esempio pratico** (18/09/2025, giorgio s.):

```
giorgio s. (18/09):
  Sessione 1: 02:02:14 PM → 02:02:20 PM
  Sessione 2: 02:02:47 PM → 02:02:47 PM (0 minuti, in sala attesa)
  Sessione 3: 02:02:53 PM → 02:07:03 PM
  Sessione 4: 02:07:18 PM → 02:09:37 PM
  Sessione 5: 02:09:52 PM → 02:16:01 PM
  Sessione 6: 02:16:02 PM → 02:17:26 PM
  Sessione 7: 02:17:26 PM → 02:20:48 PM (senza gap!)
  Sessione 8: 02:21:03 PM → 03:48:41 PM
  Sessione 9: 03:48:41 PM → 03:49:36 PM (senza gap!)
  Sessione 10: 04:08:09 PM → 04:12:35 PM
  Sessione 11: 04:12:35 PM → 05:56:50 PM (senza gap!)

Gap da calcolare:
  1→2: 27 secondi < 1.5 min → IGNORATO
  2→3: 6 secondi < 1.5 min → IGNORATO
  3→4: 15 secondi < 1.5 min → IGNORATO
  4→5: 15 secondi < 1.5 min → IGNORATO
  5→6: 1 secondo < 1.5 min → IGNORATO
  7→8: 15 secondi < 1.5 min → IGNORATO
  9→10: 18 minuti 33 secondi > 1.5 min → CONTEGGIATO ⚠️

totalAbsenceMinutes = 18.55 minuti
isPresent = false (18.55 > 14) ❌ ASSENTE
```

**Nota**: giorgio s. sarebbe marcato ASSENTE il 18/09 per il gap di 18 minuti tra le 15:49 e le 16:08.

---

### 3. Discriminante Mattina/Pomeriggio (< 13:00)

**Fonte**: `src/services/fullCourseDocumentGenerator.ts` linee 384

```typescript
const hour = session.joinTime.getHours();
if (hour < AFTERNOON_START_HOUR) {  // 13
  morningParticipants.push(session);
} else {
  afternoonParticipants.push(session);
}
```

**Applicata**: Prima di chiamare `processParticipants`, le sessioni vengono divise in mattina e pomeriggio.

**Esempio** (10/09/2025):

```
Andres Moles (Host):
  Sessione 1: 02:00:18 PM → 02:08:52 PM  → POMERIGGIO (14:00)
  Sessione 2: 02:08:52 PM → 06:02:28 PM  → POMERIGGIO (14:08)

Edoardo Sanna:
  Sessione 1: 02:02:11 PM → 02:02:45 PM  → POMERIGGIO (14:02)
  Sessione 2: 02:02:45 PM → 06:02:29 PM  → POMERIGGIO (14:02)

Tutte le sessioni sono POMERIGGIO → lessonType = 'afternoon'
```

---

### 4. Orari Lezione (9-13, 14-18)

**Fonte**: `src/constants/index.ts` linee 1-10

```typescript
export const LESSON_HOURS = {
  MORNING: { START: 9, END: 13 },
  AFTERNOON: { START: 14, END: 18 },
}
```

**Applicati**: Durante il calcolo delle assenze e delle ore dinamiche.

**Esempio**:
- Sessione dalle 14:00 alle 18:00 → 4 ore (14, 15, 16, 17, 18)
- Nel documento Word: `orarioLezione: "14-18"`

---

### 5. Calcolo Dinamico Ore Lezione

**Fonte**: `src/services/lessonService.ts` linee 8-62

```typescript
static calculateDynamicLessonHours(participants, organizer, lessonType): number[]
```

Le ore vengono calcolate in base agli orari **EFFETTIVI** di connessione dei partecipanti.

**Esempio** (19/09/2025):

```
Andres Moles: 01:58:39 PM → 05:58:54 PM
Edoardo Sanna: 01:59:12 PM → 05:58:53 PM
giorgio s.: 02:04:39 PM → 05:58:54 PM

Ore coperte:
  13:58 → ora 13
  14:00 → ora 14
  15:00 → ora 15
  16:00 → ora 16
  17:00 → ora 17
  17:58 → ora 17

lessonHours = [13, 14, 15, 16, 17]
orarioLezione = "13-17"
```

**Nota**: In questo caso include l'ora 13 perché qualcuno era connesso alle 13:58.

---

### 6. Gestione Organizzatore

L'organizzatore viene identificato in due modi:

1. **Nella colonna "Nome organizzatore"** del CSV
2. **Dal campo "Guest" = "No"** (primo partecipante non guest)

**Fonte**: `src/services/fullCourseParsingService.ts` linee 150-154

```typescript
organizerName: this.cleanParticipantName(firstRow['Nome organizzatore'] || ''),
organizerEmail: firstRow['E-mail organizzatore'] || '',
```

**Caratteristiche**:
- **isOrganizer = true**
- **Escluso** dalla lista partecipanti normali
- **Incluso** nel calcolo ore lezione dinamiche
- **Mostrato separatamente** nell'interfaccia

---

## 📊 ESEMPIO COMPLETO: GIORNO 19/09/2025

### Input CSV

```csv
AI : Intelligenza Artificiale,...,Andres Moles,...,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",...,Andres Moles,...,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",241,No
AI : Intelligenza Artificiale,...,Andres Moles,...,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",...,Edoardo Sanna,,"19/09/2025 01:59:07 PM","19/09/2025 01:59:11 PM",1,Sì
AI : Intelligenza Artificiale,...,Andres Moles,...,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",...,Edoardo Sanna,,"19/09/2025 01:59:12 PM","19/09/2025 05:58:53 PM",240,Sì
AI : Intelligenza Artificiale,...,Andres Moles,...,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",...,giorgio s.,,"19/09/2025 02:04:39 PM","19/09/2025 02:06:05 PM",2,Sì
AI : Intelligenza Artificiale,...,Andres Moles,...,"19/09/2025 01:58:39 PM","19/09/2025 05:58:54 PM",...,giorgio s.,,"19/09/2025 02:06:06 PM","19/09/2025 05:58:54 PM",233,Sì
```

### FASE 1: Parsing

```javascript
{
  date: "2025-09-19",
  sessions: [
    { participantName: "Andres Moles", joinTime: 13:58, leaveTime: 17:58, isGuest: false },
    { participantName: "Edoardo Sanna", joinTime: 13:59, leaveTime: 13:59, isGuest: true },
    { participantName: "Edoardo Sanna", joinTime: 13:59, leaveTime: 17:58, isGuest: true },
    { participantName: "giorgio s.", joinTime: 14:04, leaveTime: 14:06, isGuest: true },
    { participantName: "giorgio s.", joinTime: 14:06, leaveTime: 17:58, isGuest: true },
  ]
}
```

### FASE 2: Raggruppamento per Partecipante

```javascript
Map {
  "Andres Moles" => [
    { joinTime: 13:58, leaveTime: 17:58 }
  ],
  "Edoardo Sanna" => [
    { joinTime: 13:59, leaveTime: 13:59 },  // 4 secondi
    { joinTime: 13:59, leaveTime: 17:58 }   // 4 ore
  ],
  "giorgio s." => [
    { joinTime: 14:04, leaveTime: 14:06 },  // 1 minuto
    { joinTime: 14:06, leaveTime: 17:58 }   // 3 ore 52 minuti
  ]
}
```

### FASE 3: Separazione Mattina/Pomeriggio

Tutti gli ingressi sono >= 13:00 → **SOLO POMERIGGIO**

```javascript
{
  morningParticipants: [],
  afternoonParticipants: [
    // Tutte le 5 sessioni
  ]
}
```

### FASE 4: Applicazione Logiche Presenze

```javascript
Edoardo Sanna:
  Sessione 1: 13:59:07 → 13:59:11 (4 sec)
  Sessione 2: 13:59:12 → 17:58:53 (~4 ore)

  Gap: 13:59:11 → 13:59:12 = 1 secondo < 1.5 min
  Gap IGNORATO

  totalAbsenceMinutes = 0
  isPresent = true ✅

giorgio s.:
  Sessione 1: 14:04:39 → 14:06:05 (1 min 26 sec)
  Sessione 2: 14:06:06 → 17:58:54 (~3 ore 53 min)

  Gap: 14:06:05 → 14:06:06 = 1 secondo < 1.5 min
  Gap IGNORATO

  totalAbsenceMinutes = 0
  isPresent = true ✅
```

### FASE 5: Calcolo Ore Dinamiche

```javascript
Andres Moles: 13:58 → 17:58
Edoardo Sanna: 13:59 → 17:58
giorgio s.: 14:04 → 17:58

Ore coperte: 13, 14, 15, 16, 17
lessonHours = [13, 14, 15, 16, 17]
```

### Output Finale: Documento Word

```
Data: 19/09/2025
Argomento: AI : Intelligenza Artificiale
Orario Lezione: 13-17

Partecipanti:
  1. Edoardo Sanna (PRESENTE)
  2. giorgio s. (PRESENTE)

Organizzatore: Andres Moles
```

---

## 🔍 VERIFICA CONFORMITÀ ALLE REGOLE

| Regola | Implementata | File | Funzione |
|--------|--------------|------|----------|
| ✅ Regola 45 minuti (≤ 14 min) | Sì | `csvParser.ts:212` | `calculateAttendance()` |
| ✅ Gap 90 secondi (> 1.5 min) | Sì | `csvParser.ts:236` | `calculateSessionAbsences()` |
| ✅ Discriminante 13:00 | Sì | `fullCourseDocumentGenerator.ts:384` | `splitSessionsByPeriod()` |
| ✅ Orari 9-13, 14-18 | Sì | `constants/index.ts:1` | `LESSON_HOURS` |
| ✅ Ore dinamiche | Sì | `lessonService.ts:8` | `calculateDynamicLessonHours()` |
| ✅ Organizzatore | Sì | `fullCourseParsingService.ts:150` | `extractCourseMetadata()` |
| ✅ Solo mattina → assenze solo mattina | Sì | `csvParser.ts:193` | `calculateAttendance()` |
| ✅ Solo pomeriggio → assenze solo pomeriggio | Sì | `csvParser.ts:204` | `calculateAttendance()` |
| ✅ Nessuna sessione → 999 minuti | Sì | `csvParser.ts:200` | `calculateAttendance()` |

---

## 🎯 CONCLUSIONE

**TUTTE le logiche documentate in `LOGICHE_PRESENZE.md` vengono applicate CORRETTAMENTE al corso completo.**

Il flusso è:

1. **Parser** → Separa CSV per giorni
2. **Generator** → Per ogni giorno:
   - Raggruppa sessioni per partecipante
   - Divide mattina/pomeriggio
   - **Chiama `processParticipants()`** ← Qui vengono applicate TUTTE le regole
   - Genera documento Word

La funzione `processParticipants()` è la STESSA usata per il giorno singolo, quindi **le logiche sono identiche**.

---

## 📝 NOTE IMPORTANTI

### Orari di Connessione nei Documenti Word

**Al momento, gli orari individuali di connessione/disconnessione NON vengono inseriti nel documento Word.**

Il template Word contiene solo:
- Data lezione
- Argomento
- Orario lezione (dinamico, es: "13-17")
- Nome partecipanti (solo quelli presenti)
- Organizzatore

**NON contiene**:
- Orario di ingresso individuale (es: "Edoardo Sanna entrato alle 13:59")
- Orario di uscita individuale
- Numero di gap/disconnessioni
- Minuti di assenza totale

Questo è intenzionale: il documento mostra solo **chi era presente**, non i dettagli temporali.

---

## 🔧 POSSIBILI ESTENSIONI FUTURE

Se in futuro si volesse mostrare gli orari individuali nel Word, si potrebbe:

1. Aggiungere placeholder al template:
   ```
   {{nome1}} - Ingresso: {{nome1_ingresso}} - Uscita: {{nome1_uscita}}
   ```

2. Modificare `prepareTemplateData()` per includere:
   ```typescript
   nome1_ingresso: formatTime(participant.morningFirstJoin || participant.afternoonFirstJoin),
   nome1_uscita: formatTime(participant.morningLastLeave || participant.afternoonLastLeave),
   ```

Ma per ora, il sistema si concentra su **presenza/assenza**, non sui dettagli temporali.

---

**Versione**: 1.0
**Data**: 2025-01-17
**Autore**: Sistema Compilatore FAD
**Progetto**: Zoom Attendance Generator - Full Course Mode
