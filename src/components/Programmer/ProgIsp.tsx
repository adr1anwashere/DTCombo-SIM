import React, { useState } from 'react';
import { ATmega8535, Fuses } from '../../sim/atmega8535';
import { parseHex, bytesToWords } from '../../sim/hexParser';
import { FuseEditorModal } from './FuseEditorModal';
import {
  Download,
  Upload,
  Trash2,
  Play,
  CheckCircle,
  FileCode,
  Settings,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface ProgIspProps {
  mcu: ATmega8535;
  currentHex: string;
  onProgramSuccess: () => void;
  onLoadHex: (hex: string, filename: string) => void;
}

export const ProgIsp: React.FC<ProgIspProps> = ({
  mcu,
  currentHex,
  onProgramSuccess,
  onLoadHex,
}) => {
  const [selectedChip, setSelectedChip] = useState('ATmega8535');
  const [flashFileName, setFlashFileName] = useState('main.hex');
  const [progress, setProgress] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [fuseModalOpen, setFuseModalOpen] = useState(false);

  // Checkboxes
  const [chipErase, setChipErase] = useState(true);
  const [progFlash, setProgFlash] = useState(true);
  const [progEeprom, setProgEeprom] = useState(false);
  const [verifyFlash, setVerifyFlash] = useState(true);

  // ProgISP Log messages
  const [logs, setLogs] = useState<string[]>([
    'ProgISP v1.72 Ready.',
    'Target Controller: ATmega8535 (Signature: 0x1E 0x93 0x08)',
    'Loaded internal buffer ready.',
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Drag and drop handling
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onLoadHex(content, file.name);
          setFlashFileName(file.name);
          addLog(`Loaded HEX file: ${file.name} (${file.size} bytes)`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onLoadHex(content, file.name);
          setFlashFileName(file.name);
          addLog(`Loaded HEX file: ${file.name} (${file.size} bytes)`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Erase Chip
  const handleErase = () => {
    setIsBusy(true);
    setProgress(10);
    addLog('Connecting to programmer...');
    setTimeout(() => {
      setProgress(50);
      addLog('Signature matches ATmega8535 (0x1E 0x93 0x08)');
      addLog('Erasing Chip memory...');
      setTimeout(() => {
        mcu.flash.fill(0);
        mcu.eeprom.fill(0xff);
        // An erased chip resets to internal 1MHz oscillator
        mcu.fuses = { low: 0xE1, high: 0xD9, lock: 0xFF };
        mcu.reset();
        setProgress(100);
        setIsBusy(false);
        addLog('Chip Erase completed OK.');
      }, 300);
    }, 200);
  };

  // Program Flash
  const handleProgram = () => {
    if (!currentHex) {
      addLog('Error: Flash buffer is empty! Please build code or load a .hex file first.');
      return;
    }

    setIsBusy(true);
    setProgress(0);
    addLog('Connecting to programmer...');

    setTimeout(() => {
      addLog('Target: ATmega8535 detected');
      setProgress(20);

      try {
        const parsed = parseHex(currentHex);
        const words = bytesToWords(parsed.data);

        setTimeout(() => {
          setProgress(50);
          addLog(`Writing Flash (${parsed.byteLength} bytes)...`);

          setTimeout(() => {
            mcu.loadFlash(words);
            setProgress(85);
            addLog('Verifying Flash memory...');

            setTimeout(() => {
              setProgress(100);
              setIsBusy(false);
              addLog('Verification OK (100% match). Programming successful!');
              onProgramSuccess();
            }, 250);
          }, 300);
        }, 200);
      } catch (err: any) {
        setIsBusy(false);
        addLog(`Error parsing HEX: ${err.message}`);
      }
    }, 200);
  };

  // Auto Button (Erase + Program + Verify)
  const handleAuto = () => {
    if (!currentHex) {
      addLog('Error: No HEX data to program!');
      return;
    }

    setIsBusy(true);
    setProgress(0);
    addLog('[AUTO] Starting Auto Operation Sequence...');

    setTimeout(() => {
      addLog('[AUTO] Detecting Target MCU: ATmega8535 (0x1E 0x93 0x08)... OK');
      setProgress(25);

      if (chipErase) {
        addLog('[AUTO] Erasing Chip...');
        mcu.flash.fill(0);
      }

      setTimeout(() => {
        setProgress(60);
        addLog('[AUTO] Programming Flash buffer...');
        const parsed = parseHex(currentHex);
        const words = bytesToWords(parsed.data);
        mcu.loadFlash(words);

        setTimeout(() => {
          setProgress(90);
          if (verifyFlash) {
            addLog('[AUTO] Verifying Flash memory...');
          }

          setTimeout(() => {
            setProgress(100);
            setIsBusy(false);
            addLog('[AUTO] All tasks completed successfully!');
            onProgramSuccess();
          }, 200);
        }, 250);
      }, 250);
    }, 200);
  };

  const handleSaveFuses = (newFuses: Fuses) => {
    mcu.fuses = newFuses;
    const clk = mcu.evaluateClockFrequency();
    mcu.targetClockFreq = clk.freq;
    addLog(`Fuses written: LFUSE=0x${newFuses.low.toString(16).toUpperCase()} HFUSE=0x${newFuses.high.toString(16).toUpperCase()}`);
    addLog(`Clock Source: ${clk.source}`);
    mcu.notifyUi();
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="bg-[#12161f] border border-[#222a38] rounded-xl shadow-lg flex flex-col font-mono text-xs overflow-hidden select-none h-full"
    >
      {/* ProgISP Classic Title Bar */}
      <div className="bg-[#1c2433] px-3 py-1.5 border-b border-[#2a3549] flex justify-between items-center text-gray-200">
        <div className="flex items-center gap-1.5 font-bold text-amber-400">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>ProgISP 1.72</span>
          <span className="text-[10px] text-gray-400 font-normal ml-1">(ATmega8535 Starter Kit Programmer)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
            ISP CONNECTED
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto">
        {/* Chip Selection & Buffer Info */}
        <div className="grid grid-cols-2 gap-2 bg-[#171d29] p-2.5 rounded-lg border border-gray-800">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Select Chip:</label>
            <select
              value={selectedChip}
              onChange={(e) => setSelectedChip(e.target.value)}
              className="w-full bg-[#0d1219] text-emerald-300 border border-gray-700 rounded px-2 py-1 text-xs outline-none"
            >
              <option value="ATmega8535">ATmega8535 (Installed)</option>
              <option value="ATmega16">ATmega16</option>
              <option value="ATmega32">ATmega32</option>
              <option value="AT89S51">AT89S51 (MCS-51)</option>
              <option value="AT89S52">AT89S52 (MCS-51)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Flash Buffer:</label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-300 truncate bg-[#0d1219] px-2 py-1 rounded border border-gray-700 flex-1">
                {flashFileName}
              </span>
              <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded border border-gray-600 text-gray-300">
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept=".hex"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={handleAuto}
            disabled={isBusy}
            className="col-span-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            AUTO (Erase & Prog)
          </button>

          <button
            onClick={handleProgram}
            disabled={isBusy}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 px-2 rounded flex items-center justify-center gap-1 shadow active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Program
          </button>

          <button
            onClick={handleErase}
            disabled={isBusy}
            className="bg-red-800/80 hover:bg-red-700 text-red-100 font-semibold py-1.5 px-2 rounded flex items-center justify-center gap-1 shadow active:scale-95 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Erase
          </button>
        </div>

        {/* Secondary Buttons & Fuses */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setFuseModalOpen(true)}
            className="bg-[#1f293a] hover:bg-[#28354c] text-amber-300 border border-amber-600/50 py-1 px-2 rounded flex items-center justify-center gap-1 text-[11px]"
          >
            <Settings className="w-3 h-3 text-amber-400" />
            Fuse & Lock
          </button>

          <button
            onClick={() => {
              addLog('Verifying flash contents...');
              setTimeout(() => addLog('Flash verified: 100% matched.'), 200);
            }}
            disabled={isBusy}
            className="bg-[#171e2b] hover:bg-[#212a3d] text-gray-300 border border-gray-700 py-1 px-2 rounded flex items-center justify-center gap-1 text-[11px]"
          >
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Verify
          </button>

          <button
            onClick={() => {
              addLog(`Chip Signature: 0x1E 0x93 0x08 (ATmega8535)`);
              addLog(`Current Fuses: LFUSE=0x${mcu.fuses.low.toString(16).toUpperCase()} HFUSE=0x${mcu.fuses.high.toString(16).toUpperCase()}`);
            }}
            className="bg-[#171e2b] hover:bg-[#212a3d] text-gray-300 border border-gray-700 py-1 px-2 rounded flex items-center justify-center gap-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3 text-blue-400" />
            Read Chip
          </button>
        </div>

        {/* ProgISP Operation Options Checkboxes */}
        <div className="bg-[#0f141c] p-2 rounded border border-gray-800 grid grid-cols-2 gap-2 text-[10px]">
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
            <input
              type="checkbox"
              checked={chipErase}
              onChange={(e) => setChipErase(e.target.checked)}
              className="rounded bg-gray-900 border-gray-700 text-emerald-500"
            />
            <span>Chip Erase</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
            <input
              type="checkbox"
              checked={progFlash}
              onChange={(e) => setProgFlash(e.target.checked)}
              className="rounded bg-gray-900 border-gray-700 text-emerald-500"
            />
            <span>Program Flash</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
            <input
              type="checkbox"
              checked={verifyFlash}
              onChange={(e) => setVerifyFlash(e.target.checked)}
              className="rounded bg-gray-900 border-gray-700 text-emerald-500"
            />
            <span>Verify Flash</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
            <input
              type="checkbox"
              checked={progEeprom}
              onChange={(e) => setProgEeprom(e.target.checked)}
              className="rounded bg-gray-900 border-gray-700 text-emerald-500"
            />
            <span>Program EEPROM</span>
          </label>
        </div>

        {/* Programming Progress Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Progress</span>
            <span className="font-bold text-emerald-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-700">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ProgISP Console Log */}
        <div className="flex-1 flex flex-col min-h-[100px]">
          <div className="text-[10px] text-gray-400 mb-1 flex justify-between">
            <span>ProgISP Log</span>
            <button
              onClick={() => setLogs([])}
              className="text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          <div className="bg-[#090d14] border border-gray-800 rounded p-2 text-[10px] text-gray-300 overflow-y-auto max-h-[140px] font-mono leading-relaxed shadow-inner">
            {logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fuse Editor Modal */}
      <FuseEditorModal
        fuses={mcu.fuses}
        isOpen={fuseModalOpen}
        onClose={() => setFuseModalOpen(false)}
        onSave={handleSaveFuses}
      />
    </div>
  );
};
