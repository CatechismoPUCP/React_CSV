# Guida Template Word

## 📋 Placeholder Richiesti

Il template Word deve contenere esattamente questi placeholder:

### Dati Generali
- `{{day}}` - Giorno (es: 08)
- `{{month}}` - Mese (es: 07) 
- `{{year}}` - Anno (es: 2025)
- `{{orarioLezione}}` - Orario lezione (es: 09:00-13:00)
- `{{argomento}}` - Argomento della lezione

### Partecipanti (1-5)
Per ogni partecipante (da 1 a 5):

- `{{nome1}}` - `{{nome5}}` - Nome partecipante
- `{{MattOraIn1}}` - `{{MattOraIn5}}` - Ora ingresso mattina
- `{{MattOraOut1}}` - `{{MattOraOut5}}` - Ora uscita mattina  
- `{{PomeOraIn1}}` - `{{PomeOraIn5}}` - Ora ingresso pomeriggio
- `{{PomeOraOut1}}` - `{{PomeOraOut5}}` - Ora uscita pomeriggio
- `{{presenza1}}` - `{{presenza5}}` - Stato presenza (✅ / ❌ ASSENTE)

## 📝 Esempio Template

```
Data: {{day}}/{{month}}/{{year}}
Orario: {{orarioLezione}}
Argomento: {{argomento}}

| Nome | Mattina In | Mattina Out | Pomeriggio In | Pomeriggio Out | Presenza |
|------|------------|-------------|---------------|----------------|----------|
| {{nome1}} | {{MattOraIn1}} | {{MattOraOut1}} | {{PomeOraIn1}} | {{PomeOraOut1}} | {{presenza1}} |
| {{nome2}} | {{MattOraIn2}} | {{MattOraOut2}} | {{PomeOraIn2}} | {{PomeOraOut2}} | {{presenza2}} |
| {{nome3}} | {{MattOraIn3}} | {{MattOraOut3}} | {{PomeOraIn3}} | {{PomeOraOut3}} | {{presenza3}} |
| {{nome4}} | {{MattOraIn4}} | {{MattOraOut4}} | {{PomeOraIn4}} | {{PomeOraOut4}} | {{presenza4}} |
| {{nome5}} | {{MattOraIn5}} | {{MattOraOut5}} | {{PomeOraIn5}} | {{PomeOraOut5}} | {{presenza5}} |
```

## ⚠️ Regole Importanti

1. **Placeholder esatti**: Usa esattamente `{{nome1}}` non `{{ nome1 }}` o `{{nome 1}}`
2. **Nessuno spazio**: Non lasciare spazi dentro le parentesi graffe
3. **Case sensitive**: Usa esattamente `{{MattOraIn1}}` non `{{mattorain1}}`
4. **Tutti i 5**: Includi sempre tutti e 5 i partecipanti anche se vuoti

## 🔧 Come Creare il Template

1. Apri Microsoft Word
2. Crea la struttura del documento
3. Inserisci i placeholder esattamente come mostrato sopra
4. Salva come `.docx`
5. Testa con l'applicazione

## 🐛 Risoluzione Problemi

Se ricevi errori:
1. Controlla che tutti i placeholder siano scritti correttamente
2. Verifica che non ci siano spazi extra nelle parentesi graffe
3. Assicurati che il file sia salvato come `.docx`
4. Usa il debug mode nell'app per vedere i dati generati
