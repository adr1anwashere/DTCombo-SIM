import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

interface OutputConsoleProps {
  logs: string[];
  onClear: () => void;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({ logs, onClear }) => {
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="bg-[#12161f] border border-[#222a38] rounded-xl flex flex-col font-mono text-xs overflow-hidden select-none h-full">
      {/* Header */}
      <div className="bg-[#1c2433] px-3 py-1.5 border-b border-[#2a3549] flex justify-between items-center text-gray-200">
        <div className="flex items-center gap-1.5 font-bold text-gray-200">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span>Compiler & Simulation Output</span>
        </div>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700/50"
          title="Clear Output Console"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Logs View */}
      <div className="flex-1 bg-[#090d14] p-3 text-gray-300 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
        {logs.length === 0 ? (
          <span className="text-gray-600 italic">[No compiler or system messages]</span>
        ) : (
          logs.map((log, idx) => {
            const isError = log.includes('error') || log.includes('Error') || log.includes('failed');
            const isWarning = log.includes('warning') || log.includes('Warning') || log.includes('unimplemented');
            const isSuccess = log.includes('success') || log.includes('Success') || log.includes('OK');

            return (
              <div
                key={idx}
                className={`py-0.5 ${
                  isError
                    ? 'text-red-400 font-bold'
                    : isWarning
                    ? 'text-amber-300'
                    : isSuccess
                    ? 'text-emerald-400'
                    : 'text-gray-300'
                }`}
              >
                {log}
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};
