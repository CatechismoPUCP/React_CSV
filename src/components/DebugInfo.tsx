import React from 'react';
import { LessonData } from '../types';

interface DebugInfoProps {
  lessonData: LessonData;
  templateData: any;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({ lessonData, templateData }) => {
  return (
    <div style={{ 
      background: '#f5f5f5', 
      padding: '1rem', 
      margin: '1rem 0', 
      borderRadius: '8px',
      fontSize: '0.85rem',
      fontFamily: 'monospace'
    }}>
      <h4>Debug Info - Template Data:</h4>
      <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
        {JSON.stringify(templateData, null, 2)}
      </pre>
      
      <h4>Participants ({lessonData.participants.length}):</h4>
      <ul>
        {lessonData.participants.slice(0, 5).map((p, i) => (
          <li key={i}>
            <strong>{p.name}</strong> - {p.isPresent ? '✅ Presente' : '❌ Assente'} 
            ({p.totalAbsenceMinutes} min assenze)
            <br />
            Mattina: {p.morningFirstJoin ? p.morningFirstJoin.toLocaleTimeString() : '--'} - {p.morningLastLeave ? p.morningLastLeave.toLocaleTimeString() : '--'}
            <br />
            Pomeriggio: {p.afternoonFirstJoin ? p.afternoonFirstJoin.toLocaleTimeString() : '--'} - {p.afternoonLastLeave ? p.afternoonLastLeave.toLocaleTimeString() : '--'}
            <br />
            <strong>Tutte le connessioni mattina ({p.allConnections?.morning?.length || 0}):</strong> 
            {p.allConnections?.morning?.map((conn, idx) => (
              <span key={idx} style={{fontSize: '0.8em', color: '#666'}}>
                {conn.joinTime.toLocaleTimeString()}-{conn.leaveTime.toLocaleTimeString()}
                {idx < (p.allConnections?.morning?.length || 0) - 1 ? '; ' : ''}
              </span>
            )) || 'Nessuna'}
            <br />
            <strong>Tutte le connessioni pomeriggio ({p.allConnections?.afternoon?.length || 0}):</strong> 
            {p.allConnections?.afternoon?.map((conn, idx) => (
              <span key={idx} style={{fontSize: '0.8em', color: '#666'}}>
                {conn.joinTime.toLocaleTimeString()}-{conn.leaveTime.toLocaleTimeString()}
                {idx < (p.allConnections?.afternoon?.length || 0) - 1 ? '; ' : ''}
              </span>
            )) || 'Nessuna'}
          </li>
        ))}
      </ul>
    </div>
  );
};
