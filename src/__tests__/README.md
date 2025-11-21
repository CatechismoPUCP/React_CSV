# Test Suite Documentation

Questa suite di test completa copre tutti gli aspetti critici del sistema di generazione documenti FAD.

## Struttura Test

### 1. csvParser.test.ts
Test per il parsing CSV e calcolo presenze/assenze.

**Copertura:**
- ✅ Parsing CSV formato Zoom (italiano e US)
- ✅ Rilevamento organizzatore (primo partecipante)
- ✅ Calcolo presenza/assenza con regola 45 minuti
- ✅ Gestione sessioni multiple stesso partecipante
- ✅ Calcolo gap di connessione (> 1.5 minuti = assenza)
- ✅ Combinazione sessioni mattina/pomeriggio
- ✅ Rilevamento periodo (mattina < 13:00, pomeriggio >= 13:00)
- ✅ Edge cases: arrivi in ritardo, uscite anticipate

### 2. lessonService.test.ts
Test per il calcolo delle ore di lezione.

**Copertura:**
- ✅ Calcolo ore lezione mattina (9-13)
- ✅ Calcolo ore lezione pomeriggio (14-18)
- ✅ Pausa pranzo (13:00-14:00 non inclusa)
- ✅ Lezioni giornata intera (mattina + pomeriggio)
- ✅ Modalità Fast (ore basate su presenza effettiva)
- ✅ Rispetto boundaries LESSON_HOURS
- ✅ Combinazione ore da più partecipanti
- ✅ Validazione requisiti file CSV e template

### 3. aliasManagementService.test.ts
Test per rilevamento e merge alias.

**Copertura:**
- ✅ Rilevamento alias esatti (case-insensitive)
- ✅ Rilevamento abbreviazioni ("giorgio s." vs "Giorgio Santambrogio")
- ✅ Iniziali ("G. Santambrogio" vs "Giorgio Santambrogio")
- ✅ Caratteri accentati ("José María" vs "Jose Maria")
- ✅ Caratteri speciali ("O'Brien" vs "OBrien")
- ✅ Soglie confidence:
  - >= 0.85: Auto-merge (high)
  - 0.70-0.84: Suggerimento manuale (medium)
  - 0.60-0.69: Bassa priorità (low)
- ✅ Algoritmo multi-metrico:
  - 40% Containment score (substring matching)
  - 30% Levenshtein distance (edit distance)
  - 30% Token similarity (Jaccard)
- ✅ Merge giorni presenti e email
- ✅ Ordinamento master order

### 4. fullCourseParsingService.test.ts
Test per parsing CSV corso completo.

**Copertura:**
- ✅ Parsing CSV multi-giorno
- ✅ Raggruppamento sessioni per data
- ✅ Estrazione partecipanti unici
- ✅ Tracciamento giorni presenti per partecipante
- ✅ Calcolo statistiche (giorni totali, partecipanti, sessioni)
- ✅ Calcolo date range
- ✅ Gestione formati data (DD/MM/YYYY e MM/DD/YYYY)
- ✅ Conversione AM/PM
- ✅ Pulizia nomi (rimozione parentesi)
- ✅ Edge cases: CSV vuoti, partecipanti senza email

### 5. integration.test.ts
Test end-to-end workflow completo.

**Copertura:**
- ✅ Workflow completo corso full (parsing → alias → merge → validazione)
- ✅ Workflow giorno singolo (mattina + pomeriggio)
- ✅ Rilevamento e merge automatico alias
- ✅ Preservazione giorni presenti dopo merge
- ✅ Validazione dati e reporting errori
- ✅ **Regola 45 minuti**: Assenza se gap > 14 minuti
- ✅ **Pausa pranzo 13:00-14:00**: Non contata come ore lezione
- ✅ Gestione errori CSV malformati
- ✅ Gestione partecipanti assenti

## Regole di Business Critiche

### Regola 45 Minuti di Presenza
```typescript
// Un partecipante è considerato PRESENTE se:
totalAbsenceMinutes <= 14 minuti

// Esempio PRESENTE:
// 09:00-10:00 (60min) + gap 14min + 10:14-13:00 (166min) = 14min assenza ✅

// Esempio ASSENTE:
// 09:00-09:30 (30min) + gap 30min + 10:00-12:00 (120min) = 30min assenza ❌
```

### Pausa Pranzo (13:00-14:00)
```typescript
// Le ore lezione NON includono la pausa pranzo
LESSON_HOURS.MORNING.END = 13    // Fine mattina
LESSON_HOURS.AFTERNOON.START = 14 // Inizio pomeriggio

// Lezione full day: 9,10,11,12,13 + 14,15,16,17,18 = 10 ore
// NON c'è "ora 13.5" perché è pausa pranzo
```

### Calcolo Gap Assenze
```typescript
// Gap <= 1.5 minuti: IGNORATO (problemi connessione)
// Gap > 1.5 minuti: CONTATO come assenza

// Esempio:
// 09:00-10:00 (leave) → 10:01 (join) = 1 minuto gap → IGNORATO ✅
// 09:00-10:00 (leave) → 10:05 (join) = 5 minuti gap → ASSENZA ❌
```

### Rilevamento Periodo (Mattina/Pomeriggio)
```typescript
// Discriminante: ora primo ingresso
firstJoinHour < 13 → 'morning'
firstJoinHour >= 13 → 'afternoon'

// Pausa pranzo è tra 13:00 e 14:00
```

### Alias Auto-Merge
```typescript
// Confidence >= 0.85 → Auto-merge
// Confidence 0.70-0.84 → Suggerimento manuale
// Confidence < 0.70 → Non suggerire

// Algoritmo:
similarity =
  containmentScore * 0.4 +    // "giorgio" ⊂ "Giorgio Santambrogio"
  levenshteinScore * 0.3 +    // Edit distance
  tokenScore * 0.3            // Jaccard similarity
```

## Test Data

I file di test CSV sono definiti in `testUtils.ts`:

- **morning-valid.csv**: Sessione mattina valida (9:00-13:00)
- **afternoon-valid.csv**: Sessione pomeriggio valida (14:00-18:00)
- **morning-with-absences.csv**: Partecipanti con gap > 14 minuti
- **fullcourse-with-aliases.csv**: Corso multi-giorno con alias
- **invalid-no-participants.csv**: CSV senza partecipanti
- **invalid-missing-headers.csv**: CSV con header errati

## Esecuzione Test

```bash
# Esegui tutti i test
npm test

# Esegui test specifico
npm test csvParser

# Esegui test con coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Verbose output
npm test -- --verbose
```

## Struttura File Test

```
src/__tests__/
├── README.md                            # Questa documentazione
├── testUtils.ts                         # Utilities e test data
├── csvParser.test.ts                    # Test parsing CSV
├── lessonService.test.ts                # Test calcolo ore
├── aliasManagementService.test.ts       # Test alias
├── fullCourseParsingService.test.ts     # Test parsing full course
└── integration.test.ts                  # Test end-to-end
```

## Coverage Obiettivi

- **Parsing CSV**: 100% (regole critiche)
- **Calcolo presenza**: 100% (regola 45 minuti)
- **Alias detection**: 95%+ (edge cases)
- **Full course**: 90%+ (workflow completo)
- **Integration**: 85%+ (scenari reali)

## Scenari di Test Importanti

### ✅ Presenza con piccoli gap
```csv
09:00-10:00 (60min)
10:01-13:00 (179min)
Gap: 1 minuto → IGNORATO → PRESENTE ✅
```

### ❌ Assenza con gap significativo
```csv
09:00-09:30 (30min)
10:00-12:00 (120min)
Gap: 30 minuti → CONTATO → ASSENTE ❌
```

### ✅ Merge alias automatico
```csv
"giorgio s." + "Giorgio Santambrogio"
Similarity: 0.90 → AUTO-MERGE ✅
Giorni: [2025-09-19, 2025-09-20, 2025-09-21]
```

### ✅ Pausa pranzo esclusa
```csv
Lezione full day:
Mattina: 9,10,11,12,13 (5 ore)
❌ PAUSA 13:00-14:00 (NON contata)
Pomeriggio: 14,15,16,17,18 (5 ore)
Totale: 10 ore
```

## Note Tecniche

1. **Jest Configuration**: `jest.config.js` configurato per TypeScript e jsdom
2. **Test Environment**: Browser (jsdom) invece di Node per compatibilità React
3. **CSV Loading**: Test data inline in `testUtils.ts` invece di file system
4. **Mocking**: File oggetti creati con `createMockFile()`
5. **Date Parsing**: Supporto sia DD/MM/YYYY (italiano) che MM/DD/YYYY (US)

## Errori Comuni e Fix

### Error: Cannot find module 'fs'
**Fix**: Usa `getTestCSV()` invece di `readFileSync()` (ambiente browser)

### Error: Invalid date
**Fix**: Verifica formato data in CSV (DD/MM/YYYY HH:mm:ss AM/PM)

### Test timeout
**Fix**: Aggiungi `jest.setTimeout(10000)` per test async lunghi

### Alias non rilevati
**Fix**: Verifica soglie confidence (0.85 per auto-merge)

## Manutenzione

- Aggiorna test data quando cambia formato CSV
- Aggiungi test per nuove funzionalità
- Mantieni coverage > 85%
- Documenta nuove regole di business
- Testa edge cases e error handling
