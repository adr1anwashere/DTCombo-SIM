import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { TEMPLATES, CodeTemplate } from './templates';
import { Play, Hammer, CheckCircle2, AlertCircle, FileCode, Sparkles, Download } from 'lucide-react';

interface CodeEditorProps {
  onCompileSuccess: (hex: string, fCpu: number) => void;
  onProgramDirect: (hex: string) => void;
  onCompilerLog: (msg: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  onCompileSuccess,
  onProgramDirect,
  onCompilerLog,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [code, setCode] = useState<string>(TEMPLATES[0].code);
  const [fCpu, setFCpu] = useState<number>(4000000);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilerReady, setCompilerReady] = useState<boolean | null>(null);
  const [compilerMessage, setCompilerMessage] = useState<string>('Checking compiler...');

  // Check compiler status on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setCompilerReady(data.ready);
        setCompilerMessage(data.message || (data.ready ? 'avr-gcc Ready' : 'Compiler Offline'));
      })
      .catch(() => {
        setCompilerReady(false);
        setCompilerMessage('Backend compiler server offline. Start server with npm run server');
      });
  }, []);

  const handleTemplateChange = (templateId: string) => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(tmpl.id);
      setCode(tmpl.code);
      setFCpu(tmpl.fCpu);
      onCompilerLog(`Loaded template: ${tmpl.name}`);
    }
  };

  const handleCompile = async (autoProgram = false) => {
    setIsCompiling(true);
    onCompilerLog(`[BUILD] Starting compilation for target ATmega8535 (F_CPU=${fCpu}Hz)...`);

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, fCpu }),
      });

      const data = await response.json();

      if (data.success && data.hex) {
        onCompilerLog(`[BUILD SUCCESS] Compiled successfully!`);
        if (data.codeSize) {
          const pct = ((data.codeSize / 8192) * 100).toFixed(1);
          onCompilerLog(`Program Memory Used: ${data.codeSize} bytes (${pct}% of 8192 bytes Flash)`);
        }
        if (data.stderr) {
          onCompilerLog(`Compiler Warnings:\n${data.stderr}`);
        }
        onCompileSuccess(data.hex, fCpu);

        if (autoProgram) {
          onCompilerLog(`[PROGRAM] Automatically programming hex into ATmega8535...`);
          onProgramDirect(data.hex);
        }
      } else {
        onCompilerLog(`[BUILD ERROR] Compilation failed:\n${data.stderr || data.error}`);
      }
    } catch (err: any) {
      onCompilerLog(`[BUILD ERROR] Request failed: ${err.message}. Ensure local compiler server is running.`);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12161f] border border-[#222a38] rounded-xl overflow-hidden shadow-lg select-none">
      {/* Editor Header Bar */}
      <div className="bg-[#1c2433] px-3 py-2 border-b border-[#2a3549] flex flex-wrap justify-between items-center gap-2 text-xs font-mono">
        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-gray-200">Microchip Studio</span>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="bg-[#0f141c] text-emerald-300 border border-gray-700 rounded px-2 py-1 text-xs outline-none cursor-pointer max-w-[240px]"
          >
            {TEMPLATES.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </option>
            ))}
          </select>
        </div>

        {/* F_CPU Selector & Compiler Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-gray-300">
            <span>F_CPU:</span>
            <select
              value={fCpu}
              onChange={(e) => setFCpu(parseInt(e.target.value, 10))}
              className="bg-[#0f141c] text-emerald-300 border border-gray-700 rounded px-1.5 py-0.5 text-xs outline-none cursor-pointer"
            >
              <option value={4000000}>4.0 MHz (Board Default)</option>
              <option value={8000000}>8.0 MHz</option>
              <option value={11059200}>11.0592 MHz (UART)</option>
              <option value={12000000}>12.0 MHz</option>
              <option value={16000000}>16.0 MHz</option>
              <option value={1000000}>1.0 MHz (Internal RC)</option>
            </select>
          </div>

          <div
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
              compilerReady
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : 'bg-amber-950/60 border-amber-700 text-amber-300'
            }`}
            title={compilerMessage}
          >
            {compilerReady ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            )}
            <span>{compilerReady ? 'avr-gcc Ready' : 'Compiler Status'}</span>
          </div>
        </div>

        {/* Action Buttons: Build & Program */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCompile(false)}
            disabled={isCompiling}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded flex items-center gap-1.5 font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
            title="Compile C code to Intel HEX"
          >
            <Hammer className="w-3.5 h-3.5 text-blue-400" />
            {isCompiling ? 'Building...' : 'Build'}
          </button>

          <button
            onClick={() => handleCompile(true)}
            disabled={isCompiling}
            className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded flex items-center gap-1.5 text-xs shadow active:scale-95 transition-all disabled:opacity-50"
            title="Compile and Program directly into ATmega8535"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Build & Program
          </button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="flex-1 w-full min-h-[300px]">
        <Editor
          height="100%"
          language="c"
          theme="vs-dark"
          value={code}
          onChange={(newCode) => setCode(newCode || '')}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
};
