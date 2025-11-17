# 📊 LOGICHE DI CALCOLO DELLE PRESENZE

Questo documento descrive in dettaglio tutte le regole e logiche utilizzate per determinare se un corsista è presente o assente in una lezione.

---

## 🎯 REGOLA PRINCIPALE: 45 MINUTI

**Un partecipante è considerato PRESENTE se ha al massimo 14 minuti di assenza totale.**

```typescript
participant.isPresent = totalAbsenceMinutes <= 14;
```

### Perché 14 minuti?
- **15 minuti** = soglia massima di assenza tollerabile (un quarto d'ora)
- **14 minuti** = threshold conservativo (≤ 14 minuti = presente)
- Questa è chiamata "regola dei 45 minuti" perché con 4 ore di lezione, il corsista deve essere presente per almeno **3 ore e 45 minuti** per essere considerato presente

### Fonte
- File: `src/utils/csvParser.ts`
- Funzione: `calculateAttendance()`
- Linea: 212

```typescript
participant.totalAbsenceMinutes = totalAbsence;
participant.isPresent = totalAbsence <= 14;
```

---

## ⏰ ORARI LEZIONE

Gli orari di riferimento per mattina e pomeriggio sono:

### Mattina
- **Inizio**: 09:00 (ore 9)
- **Fine**: 13:00 (ore 13)
- **Durata**: 4 ore

### Pomeriggio
- **Inizio**: 14:00 (ore 14)
- **Fine**: 18:00 (ore 18)
- **Durata**: 4 ore

### Lunch Break
- **13:00 - 14:00** è considerato pausa pranzo
- Questo orario NON viene conteggiato come assenza
- È usato come discriminante per separare mattina e pomeriggio

### Fonte
- File: `src/constants/index.ts`
- Linee: 1-10

```typescript
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
```

---

## 🔍 DISCRIMINANTE MATTINA/POMERIGGIO

**Regola**: Un CSV viene classificato come "mattina" o "pomeriggio" in base all'orario del primo ingresso.

- **Primo ingresso PRIMA delle 13:00** → Sessione MATTINA
- **Primo ingresso DOPO le 13:00** → Sessione POMERIGGIO

### Fonte
- File: `src/utils/csvParser.ts`
- Funzione: `analyzeCSVPeriod()`
- Linee: 268-270

```typescript
const firstJoinHour = firstJoinTime.getHours();
const period: CSVPeriod = firstJoinHour < 13 ? 'morning' : 'afternoon';
```

---

## 📏 CALCOLO ASSENZE TRA SESSIONI

Quando un partecipante si disconnette e riconnette, viene calcolato il "gap" (buco temporale) tra le due sessioni.

### Regola: Gap di 90 Secondi

**Solo i gap MAGGIORI di 90 secondi (1.5 minuti) vengono conteggiati come assenza.**

Gap ≤ 90 secondi sono considerati disconnessioni tecniche normali e vengono ignorati.

### Perché 90 secondi?
- Zoom può avere piccole disconnessioni temporanee
- Problemi di rete momentanei
- Refresh della pagina
- Cambio di device

Questi non dovrebbero penalizzare il corsista.

### Fonte
- File: `src/utils/csvParser.ts`
- Funzione: `calculateSessionAbsences()`
- Linee: 233-238

```typescript
const gapMinutes = (nextJoin.getTime() - currentLeave.getTime()) / (1000 * 60);

// Only count gaps longer than 90 seconds as absences
if (gapMinutes > 1.5) {
  totalAbsence += gapMinutes;
}
```

### Esempio Pratico

**Scenario 1: Gap piccolo (NON conta come assenza)**
```
09:00 - Entra
09:45 - Esce
09:46 - Entra (gap: 1 minuto = 60 secondi)
10:30 - Esce

Gap = 60 secondi ≤ 90 secondi → NON conteggiato
Assenza totale = 0 minuti → PRESENTE ✅
```

**Scenario 2: Gap grande (conta come assenza)**
```
09:00 - Entra
09:30 - Esce
10:00 - Entra (gap: 30 minuti = 1800 secondi)
12:00 - Esce

Gap = 30 minuti > 1.5 minuti → conteggiato
Assenza totale = 30 minuti > 14 minuti → ASSENTE ❌
```

---

## 🔄 ALGORITMO COMPLETO DI CALCOLO

### 1. Raggruppamento Sessioni

Per ogni partecipante, le sessioni vengono raggruppate per nome (case-insensitive):

```typescript
const key = participant.name.toLowerCase();
participantMap.set(key, createParticipant(participant));
```

### 2. Separazione Mattina/Pomeriggio

Le sessioni vengono separate in due array:
- `sessions.morning` - tutte le connessioni della mattina
- `sessions.afternoon` - tutte le connessioni del pomeriggio

### 3. Ordinamento per Orario

Le sessioni vengono ordinate per orario di ingresso:

```typescript
morning.sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
afternoon.sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
```

### 4. Calcolo First Join e Last Leave

```typescript
participant.morningFirstJoin = morning[0].joinTime;
participant.morningLastLeave = morning[morning.length - 1].leaveTime;

participant.afternoonFirstJoin = afternoon[0].joinTime;
participant.afternoonLastLeave = afternoon[afternoon.length - 1].leaveTime;
```

### 5. Calcolo Assenze per Sessione

Per la **mattina** (se presente):
```typescript
totalAbsence += calculateSessionAbsences(
  morning,
  LESSON_HOURS.MORNING.START,    // 9
  LESSON_HOURS.MORNING.END        // 13
);
```

Per il **pomeriggio** (se presente):
```typescript
totalAbsence += calculateSessionAbsences(
  afternoon,
  LESSON_HOURS.AFTERNOON.START,   // 14
  LESSON_HOURS.AFTERNOON.END       // 18
);
```

### 6. Gestione Casi Particolari

**Caso A: Solo mattina**
```typescript
if (morning.length > 0 && afternoon.length === 0) {
  // Calcola assenze solo per mattina
  // NON penalizza per assenza pomeriggio
  totalAbsence += calculateSessionAbsences(morning, 9, 13);
}
```

**Caso B: Solo pomeriggio**
```typescript
if (afternoon.length > 0 && morning.length === 0) {
  // Calcola assenze solo per pomeriggio
  // NON penalizza per assenza mattina
  totalAbsence += calculateSessionAbsences(afternoon, 14, 18);
}
```

**Caso C: Né mattina né pomeriggio**
```typescript
if (morning.length === 0 && afternoon.length === 0) {
  // Partecipante completamente assente
  totalAbsence = 999; // Valore sentinella
}
```

### Fonte
- File: `src/utils/csvParser.ts`
- Funzione: `calculateAttendance()`
- Linee: 171-215

```typescript
// Morning session absences
if (morning.length > 0) {
  totalAbsence += calculateSessionAbsences(morning, LESSON_HOURS.MORNING.START, LESSON_HOURS.MORNING.END);
} else if (afternoon.length > 0) {
  // If only afternoon, don't count morning as absence
  totalAbsence += 0;
} else {
  // Not present in any session
  totalAbsence = 999; // Mark as definitely absent
}

// Afternoon session absences
if (afternoon.length > 0) {
  totalAbsence += calculateSessionAbsences(afternoon, LESSON_HOURS.AFTERNOON.START, LESSON_HOURS.AFTERNOON.END);
} else if (morning.length > 0) {
  // If only morning, don't count afternoon as absence
  totalAbsence += 0;
}
```

### 7. Decisione Finale

```typescript
participant.totalAbsenceMinutes = totalAbsence;
participant.isPresent = totalAbsence <= 14;
```

**Risultato**:
- `totalAbsenceMinutes ≤ 14` → **PRESENTE** ✅
- `totalAbsenceMinutes > 14` → **ASSENTE** ❌

---

## 📊 CALCOLO DINAMICO ORE LEZIONE

Le ore di lezione nel documento Word vengono calcolate in base agli orari **effettivi** di presenza dei partecipanti, non su orari fissi.

### Algoritmo

1. Per ogni partecipante (incluso organizzatore)
2. Per ogni connessione (mattina e/o pomeriggio)
3. Estrai l'ora di ingresso e l'ora di uscita
4. Aggiungi tutte le ore tra ingresso e uscita in un Set (per evitare duplicati)
5. Ordina le ore in ordine crescente

### Fonte
- File: `src/services/lessonService.ts`
- Funzione: `calculateDynamicLessonHours()`
- Linee: 8-62

```typescript
static calculateDynamicLessonHours(
  participants: ProcessedParticipant[],
  organizer: ProcessedParticipant | null,
  lessonType: LessonType
): number[] {
  const allParticipants = organizer ? [...participants, organizer] : participants;
  const hours = new Set<number>();

  allParticipants.forEach(participant => {
    // Add hours from morning sessions
    if (lessonType !== 'afternoon') {
      participant.allConnections.morning.forEach(connection => {
        const startHour = connection.joinTime.getHours();
        const endHour = connection.leaveTime.getHours();
        for (let h = Math.max(LESSON_HOURS.MORNING.START, startHour); h <= Math.min(LESSON_HOURS.MORNING.END, endHour); h++) {
          hours.add(h);
        }
      });
    }

    // Add hours from afternoon sessions
    if (lessonType !== 'afternoon') {
      participant.allConnections.afternoon.forEach(connection => {
        const startHour = connection.joinTime.getHours();
        const endHour = connection.leaveTime.getHours();
        for (let h = Math.max(LESSON_HOURS.AFTERNOON.START, startHour); h <= Math.min(LESSON_HOURS.AFTERNOON.END, endHour); h++) {
          hours.add(h);
        }
      });
    }
  });

  return Array.from(hours).sort((a, b) => a - b);
}
```

### Esempio Pratico

**Partecipanti**:
- Mario: 09:15 - 12:30
- Luigi: 09:00 - 13:00
- Organizzatore: 08:50 - 13:05

**Ore effettive**:
```
08:50 → ora 8 (organizzatore, ma < 9 quindi limitato a 9)
09:00 → ora 9
09:15 → ora 9 (già conteggiata)
12:30 → ora 12
13:00 → ora 13
13:05 → ora 13 (già conteggiata, e > 13 quindi limitato a 13)

Ore lezione = [9, 10, 11, 12, 13]
```

**Risultato nel documento Word**:
```
Orario Lezione: 09-13
```

---

## 🎯 CASI D'USO COMUNI

### Caso 1: Partecipante Perfetto

```
Mattina: 09:00 - 13:00 (nessuna disconnessione)
Pomeriggio: 14:00 - 18:00 (nessuna disconnessione)

Gap = 0 minuti
Assenza totale = 0 minuti ≤ 14 minuti
Risultato: PRESENTE ✅
```

### Caso 2: Partecipante con Piccole Disconnessioni

```
Mattina:
  09:00 - 10:00 (esce)
  10:01 - 11:00 (gap 1 minuto)
  11:02 - 13:00 (gap 2 minuti)

Gap totale = 3 minuti (ma 1 min e 2 min sono entrambi ≤ 1.5 min)
Assenza conteggiata = 0 minuti ≤ 14 minuti
Risultato: PRESENTE ✅
```

### Caso 3: Partecipante con Pausa Lunga

```
Mattina:
  09:00 - 10:30 (esce)
  11:00 - 13:00 (gap 30 minuti)

Gap = 30 minuti > 1.5 minuti → conteggiato
Assenza totale = 30 minuti > 14 minuti
Risultato: ASSENTE ❌
```

### Caso 4: Partecipante Arrivato Tardi

```
Mattina:
  10:30 - 13:00 (entra tardi, ma nessuna disconnessione)

Nessun gap da calcolare
Assenza totale = 0 minuti ≤ 14 minuti
Risultato: PRESENTE ✅

Note: L'orario di ingresso non influisce sulla presenza,
solo i gap DURANTE la sessione contano.
```

### Caso 5: Partecipante Uscito Presto

```
Mattina:
  09:00 - 11:30 (esce presto)

Nessun gap da calcolare
Assenza totale = 0 minuti ≤ 14 minuti
Risultato: PRESENTE ✅

Note: L'orario di uscita non influisce sulla presenza,
solo i gap DURANTE la sessione contano.
```

### Caso 6: Partecipante Solo Mattina

```
Mattina: 09:00 - 13:00
Pomeriggio: non presente

Assenza mattina = 0 minuti
Assenza pomeriggio = NON conteggiata (non penalizzato)
Assenza totale = 0 minuti ≤ 14 minuti
Risultato: PRESENTE ✅ (per la mattina)
```

### Caso 7: Partecipante Solo Pomeriggio

```
Mattina: non presente
Pomeriggio: 14:00 - 18:00

Assenza mattina = NON conteggiata (non penalizzato)
Assenza pomeriggio = 0 minuti
Assenza totale = 0 minuti ≤ 14 minuti
Risultato: PRESENTE ✅ (per il pomeriggio)
```

### Caso 8: Partecipante Completamente Assente

```
Mattina: non presente
Pomeriggio: non presente

Assenza totale = 999 (valore sentinella)
Risultato: ASSENTE ❌
```

### Caso 9: Partecipante Multiple Disconnessioni

```
Mattina:
  09:00 - 09:30 (esce)
  09:35 - 10:00 (gap 5 minuti)
  10:10 - 11:00 (gap 10 minuti)
  11:05 - 13:00 (gap 5 minuti)

Gap totali = 5 + 10 + 5 = 20 minuti > 1.5 minuti
Assenza totale = 20 minuti > 14 minuti
Risultato: ASSENTE ❌
```

### Caso 10: Partecipante al Limite

```
Mattina:
  09:00 - 10:00 (esce)
  10:14 - 13:00 (gap 14 minuti esatti)

Gap = 14 minuti > 1.5 minuti → conteggiato
Assenza totale = 14 minuti ≤ 14 minuti
Risultato: PRESENTE ✅ (al limite!)
```

---

## 🔧 GESTIONE ORGANIZZATORE

L'organizzatore viene identificato come il **primo partecipante** nel CSV Zoom.

### Caratteristiche

1. **isOrganizer = true** per il primo partecipante
2. Viene estratto dalla lista dei partecipanti normali
3. Viene mostrato separatamente nell'interfaccia
4. Viene incluso nel calcolo delle ore lezione dinamiche

### Fonte
- File: `src/utils/csvParser.ts`
- Linee: 40, 136-137, 155-157, 166

```typescript
// Durante il parsing
isOrganizer: index === 0, // First participant is the organizer

// Durante il processing
if (participant.isOrganizer && !organizer) {
  organizer = processedParticipant;
}

// Filtraggio finale
const participants = processed.filter(p => !p.isOrganizer);
```

---

## 📝 RIASSUNTO REGOLE CHIAVE

| Regola | Valore | Descrizione |
|--------|--------|-------------|
| **Soglia presenza** | ≤ 14 minuti | Massima assenza tollerata |
| **Gap ignorato** | ≤ 90 secondi | Gap piccoli non contano |
| **Discriminante mattina/pomeriggio** | 13:00 | Prima delle 13:00 = mattina |
| **Orario mattina** | 09:00 - 13:00 | 4 ore |
| **Orario pomeriggio** | 14:00 - 18:00 | 4 ore |
| **Lunch break** | 13:00 - 14:00 | Non conteggiato |
| **Assenza completa** | 999 minuti | Valore sentinella |
| **Organizzatore** | index === 0 | Primo nel CSV |

---

## 🎓 APPLICAZIONE AL CORSO COMPLETO

Per applicare queste stesse logiche al **Corso Completo** (multi-day):

### 1. Per Ogni Giorno

Applicare TUTTE le regole sopra descritte in modo indipendente per ogni singolo giorno del corso.

### 2. Presenza Globale Corso

Per determinare se un partecipante è presente per l'**intero corso**, ci sono diverse strategie possibili:

**Opzione A: Presenza Totale**
```
Un partecipante è presente al corso SE E SOLO SE è presente in TUTTI i giorni.
```

**Opzione B: Percentuale Minima**
```
Un partecipante è presente al corso se è presente in almeno X% dei giorni.
Esempio: 80% dei giorni
```

**Opzione C: Soglia Giorni**
```
Un partecipante è presente al corso se è assente al massimo N giorni.
Esempio: massimo 1 giorno di assenza su 5
```

### 3. Generazione Documenti

Per ogni giorno del corso:
1. Calcola presenze/assenze usando le logiche sopra
2. Usa l'ordine dei partecipanti definito dall'utente nel drag & drop
3. Genera un documento Word separato
4. Pacchettizza tutti i documenti in un file ZIP

---

## 📂 FILE COINVOLTI

| File | Funzione Principale | Linee Chiave |
|------|---------------------|--------------|
| `src/utils/csvParser.ts` | Parsing CSV e calcolo presenze | 98-242 |
| `src/services/lessonService.ts` | Calcolo ore lezione dinamiche | 8-62 |
| `src/constants/index.ts` | Costanti orari e soglie | 1-10 |
| `src/types/index.ts` | Definizioni tipi TypeScript | - |

---

## ✅ CHECKLIST IMPLEMENTAZIONE

Per implementare il calcolo presenze in un nuovo contesto:

- [ ] Importare `parseZoomCSV` per parsing CSV
- [ ] Importare `processParticipants` per calcolo presenze
- [ ] Usare `LESSON_HOURS` per orari di riferimento
- [ ] Verificare soglia `totalAbsenceMinutes <= 14`
- [ ] Gestire gap `> 1.5 minuti` per assenze
- [ ] Separare mattina/pomeriggio con discriminante `< 13:00`
- [ ] Calcolare ore lezione con `LessonService.calculateDynamicLessonHours`
- [ ] Gestire organizzatore separatamente (`isOrganizer: true`)
- [ ] Non penalizzare assenze per sessioni non frequentate
- [ ] Usare `999` come sentinella per assenze complete

---

## 🔍 DEBUG E TROUBLESHOOTING

### Come Verificare il Calcolo

1. **Controllare totalAbsenceMinutes**
   ```typescript
   console.log('Partecipante:', participant.name);
   console.log('Assenza totale:', participant.totalAbsenceMinutes, 'minuti');
   console.log('Presente:', participant.isPresent);
   ```

2. **Verificare Sessioni**
   ```typescript
   console.log('Sessioni mattina:', participant.sessions.morning.length);
   console.log('Sessioni pomeriggio:', participant.sessions.afternoon.length);
   ```

3. **Analizzare Gap**
   ```typescript
   for (let i = 0; i < sessions.length - 1; i++) {
     const gap = (sessions[i+1].joinTime - sessions[i].leaveTime) / 60000;
     console.log(`Gap ${i}:`, gap, 'minuti');
   }
   ```

### Problemi Comuni

**Problema**: Partecipante presente ma marcato assente
- **Causa**: Gap superiori a 1.5 minuti per problemi di connessione
- **Soluzione**: Verificare che i gap siano effettivi e non errori di data/ora nel CSV

**Problema**: Assenze non calcolate correttamente
- **Causa**: Formato data/ora non riconosciuto nel CSV
- **Soluzione**: Verificare parsing con `parseZoomDateTime()`

**Problema**: Organizzatore nella lista partecipanti
- **Causa**: Filtro `!p.isOrganizer` non applicato
- **Soluzione**: Usare `.filter(p => !p.isOrganizer)` dopo il processing

---

**Versione**: 1.0
**Data**: 2025-01-17
**Autore**: Sistema Compilatore FAD
**Progetto**: Zoom Attendance Generator
