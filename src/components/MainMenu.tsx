import React from 'react';
import { FiCalendar, FiFileText, FiUsers, FiClock } from 'react-icons/fi';

export type AppMode = 'single-day' | 'batch-course' | 'full-course';

interface MainMenuProps {
  onModeSelect: (mode: AppMode) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onModeSelect }) => {
  return (
    <div className="main-menu">
      <div className="menu-header">
        <h1>Generatore Moduli B</h1>
        <p>Scegli la modalità di utilizzo per iniziare</p>
      </div>

      <div className="menu-options">
        <div 
          className="menu-option"
          onClick={() => onModeSelect('single-day')}
        >
          <div className="option-icon">
            <FiFileText />
          </div>
          <div className="option-content">
            <h3>Modalità Giorno Singolo</h3>
            <p>Elabora CSV di una singola giornata e genera il Modulo B</p>
            <ul>
              <li>Upload CSV mattina/pomeriggio</li>
              <li>Elaborazione partecipanti</li>
              <li>Generazione documento immediata</li>
              <li>Perfetta per lezioni occasionali</li>
            </ul>
          </div>
          <div className="option-arrow">→</div>
        </div>

        <div
          className="menu-option"
          onClick={() => onModeSelect('batch-course')}
        >
          <div className="option-icon">
            <FiUsers />
          </div>
          <div className="option-content">
            <h3>Tutto il Corso (Batch)</h3>
            <p>Carica tutti i CSV del corso e genera tutti i documenti in batch</p>
            <ul>
              <li>Upload multiplo CSV (tutte le mattine e pomeriggi)</li>
              <li>Raggruppamento automatico per giorno</li>
              <li>Controllo partecipanti e host per ogni giorno</li>
              <li>Generazione batch di tutti i documenti</li>
              <li>Download ZIP con tutti i file</li>
            </ul>
          </div>
          <div className="option-arrow">→</div>
        </div>

        <div
          className="menu-option"
          onClick={() => onModeSelect('full-course')}
        >
          <div className="option-icon">
            <FiCalendar />
          </div>
          <div className="option-content">
            <h3>Corso Completo</h3>
            <p>Gestisci corsi multi-giorno con calendario e dashboard avanzate</p>
            <ul>
              <li>Configurazione corso e partecipanti</li>
              <li>Calendario lezioni interattivo</li>
              <li>Dashboard presenze giornaliere</li>
              <li>Elaborazione batch e report</li>
              <li>Gestione assenze automatica</li>
            </ul>
          </div>
          <div className="option-arrow">→</div>
        </div>
      </div>

      <div className="menu-features">
        <div className="feature">
          <FiUsers />
          <span>Gestione Partecipanti</span>
        </div>
        <div className="feature">
          <FiClock />
          <span>Calcolo Ore Automatico</span>
        </div>
        <div className="feature">
          <FiFileText />
          <span>Documenti Word</span>
        </div>
      </div>

      <style>{`
        .main-menu {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
          text-align: center;
        }

        .menu-header {
          margin-bottom: 50px;
        }

        .menu-header h1 {
          font-size: 2.5rem;
          color: #212529;
          margin: 0 0 15px 0;
          font-weight: 700;
        }

        .menu-header p {
          font-size: 1.2rem;
          color: #6c757d;
          margin: 0;
        }

        .menu-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
          margin-bottom: 50px;
        }

        .menu-option {
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: flex-start;
          gap: 20px;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .menu-option:hover {
          border-color: #007bff;
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 123, 255, 0.15);
        }

        .menu-option:hover .option-arrow {
          transform: translateX(5px);
        }

        .option-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #007bff, #0056b3);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.8rem;
          flex-shrink: 0;
        }

        .option-content {
          flex: 1;
        }

        .option-content h3 {
          margin: 0 0 10px 0;
          color: #212529;
          font-size: 1.4rem;
          font-weight: 600;
        }

        .option-content p {
          margin: 0 0 15px 0;
          color: #6c757d;
          font-size: 1rem;
          line-height: 1.5;
        }

        .option-content ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .option-content li {
          color: #495057;
          font-size: 0.9rem;
          margin-bottom: 5px;
          position: relative;
          padding-left: 15px;
        }

        .option-content li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #28a745;
          font-weight: bold;
        }

        .option-arrow {
          font-size: 1.5rem;
          color: #007bff;
          font-weight: bold;
          transition: transform 0.3s ease;
          align-self: center;
        }

        .menu-features {
          display: flex;
          justify-content: center;
          gap: 40px;
          padding: 30px 0;
          border-top: 1px solid #e9ecef;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #6c757d;
          font-size: 0.9rem;
        }

        .feature svg {
          font-size: 1.2rem;
          color: #007bff;
        }

        @media (max-width: 768px) {
          .main-menu {
            padding: 30px 15px;
          }

          .menu-header h1 {
            font-size: 2rem;
          }

          .menu-header p {
            font-size: 1rem;
          }

          .menu-options {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .menu-option {
            padding: 20px;
            flex-direction: column;
            text-align: center;
            gap: 15px;
          }

          .option-content {
            text-align: center;
          }

          .menu-features {
            flex-direction: column;
            gap: 15px;
          }
        }

        @media (max-width: 480px) {
          .menu-options {
            grid-template-columns: 1fr;
          }

          .menu-option {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};
