# Generatore Registro Presenza Zoom

Una webapp React TypeScript che genera automaticamente registri di presenza giornalieri in formato Word (.docx) a partire dai report CSV di Zoom.

## 🚀 Caratteristiche

- **Parsing automatico CSV Zoom**: Elabora i file CSV delle sessioni mattina e pomeriggio
- **Calcolo intelligente presenze**: 
  - Soglia di 14 minuti per determinare assenze
  - Esclusione disconnessioni brevi (<90 secondi)
  - Gestione pausa pranzo (13:00-14:00)
- **Editor partecipanti**: Riordina e modifica i partecipanti con drag & drop
- **Generazione Word**: Compila automaticamente template Word con i dati elaborati
- **Interfaccia moderna**: UI responsive e intuitiva

## 📋 Requisiti

- Node.js 16+ 
- Template Word (.docx) con placeholder specifici
- File CSV Zoom delle sessioni

## 🛠️ Installazione

```bash
# Installa le dipendenze
npm install

# Avvia l'applicazione
npm start
```

L'applicazione sarà disponibile su `http://localhost:3000`

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

## 🧩 Placeholder Template Word

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

## 📖 Come Usare

1. **Seleziona tipo lezione**: Mattina, Pomeriggio o Entrambi
2. **Carica file**:
   - CSV Zoom (mattina/pomeriggio secondo il tipo)
   - Template Word (.docx)
3. **Inserisci argomento** della lezione
4. **Elabora file**: L'app parsing automaticamente i CSV
5. **Modifica partecipanti**: Riordina, aggiungi assenti, correggi presenze
6. **Genera documento**: Scarica il registro Word compilato

## ⚙️ Regole di Calcolo Presenze

- **Presente**: Assenze totali ≤ 14 minuti
- **Assente**: Assenze totali > 14 minuti o non presente in nessuna sessione
- **Disconnessioni brevi**: < 90 secondi non contano come assenze
- **Pausa pranzo**: 13:00-14:00 non considerata assenza
- **Sessioni parziali**: Presente solo mattina/pomeriggio = Presente (se ≤ 14 min assenze)

## 🏗️ Tecnologie Utilizzate

- **React 18** + **TypeScript**
- **papaparse** - Parsing CSV
- **docxtemplater** + **pizzip** - Generazione Word
- **react-beautiful-dnd** - Drag & drop
- **date-fns** - Gestione date
- **file-saver** - Download file

## 📝 Esempio Output

```
Nome            | MattOraIn | MattOraOut | PomeOraIn | PomeOraOut | Presenza
Mario Rossi     | 09:01     | 12:59      | 14:05     | 17:58      | ✅
Lucia Bianchi   | 09:00     | 12:30      |           |            | ✅
Marco Verdi     |           |            | 14:15     | 17:00      | ✅
Andrea Neri     |           |            |           |            | ❌ ASSENTE
```

## 🐛 Risoluzione Problemi

- **Errore parsing CSV**: Verifica formato file Zoom
- **Template non trovato**: Controlla che il file .docx contenga i placeholder corretti
- **Partecipanti mancanti**: Aggiungi manualmente gli assenti nell'editor

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT.
