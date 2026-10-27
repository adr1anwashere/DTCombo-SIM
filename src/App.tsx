import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ATmega8535, BoardWiring, DEFAULT_WIRING, IO_ADDR } from './sim/atmega8535';
import { HD44780 } from './sim/hd44780';
import { parseHex, bytesToWords } from './sim/hexParser';
import { BoardSvg } from './components/Board/BoardSvg';
import { CodeEditor } from './components/Editor/CodeEditor';
import { ProgIsp } from './components/Programmer/ProgIsp';
import { RegisterViewer } from './components/Debugger/RegisterViewer';
import { SramViewer } from './components/Debugger/SramViewer';
import { DisassemblyViewer } from './components/Debugger/DisassemblyViewer';
import { SerialTerminal } from './components/Terminal/SerialTerminal';
import { OutputConsole } from './components/Terminal/OutputConsole';
import { TEMPLATES } from './components/Editor/templates';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  Terminal,
  Cpu,
  Layers,
  Sliders,
  AlertTriangle,
  X,
} from 'lucide-react';

export const App: React.FC = () => {
  // Core hardware instances
  const mcu = useMemo(() => new ATmega8535(), []);
  const lcd = useMemo(() => new HD44780(), []);

  // UI State
  const [, setTick] = useState(0);
  const [rightPanelTab, setRightPanelTab] = useState<'progisp' | 'registers'>('progisp');
  const [bottomPanelTab, setBottomPanelTab] = useState<'serial' | 'compiler' | 'disasm' | 'sram'>('serial');
  const [currentHex, setCurrentHex] = useState<string>('');
  const [compilerLogs, setCompilerLogs] = useState<string[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Hook MCU UI updates to React re-render
  useEffect(() => {
    return mcu.addUiListener(() => {
      setTick((t) => (t + 1) % 1000000);
    });
  }, [mcu]);

  // Hook MCU warning callback
  useEffect(() => {
    mcu.warningCallback = (msg: string) => {
      setWarningMessage(msg);
      setCompilerLogs((prev) => [...prev, `[WARNING] ${msg}`]);
    };
    return () => {
      mcu.warningCallback = undefined;
    };
  }, [mcu]);

  // Connect MCU Port Output to HD44780 LCD
  useEffect(() => {
    const handleLcdPins = () => {
      const wiring = mcu.wiring;
      if (wiring.lcdPort === 'CUSTOM') return;

      const portAddr = IO_ADDR[`PORT${wiring.lcdPort}` as keyof typeof IO_ADDR];
      const portVal = mcu.cpu.data[portAddr];

      const rs = (portVal >> wiring.lcdPins.rs.pin) & 1;
      const rw = (portVal >> wiring.lcdPins.rw.pin) & 1;
      const e  = (portVal >> wiring.lcdPins.e.pin) & 1;
      const data = portVal;

      lcd.updatePins(rs, rw, e, data);
    };

    // Watch CPU writes
    const prevHookA = mcu.cpu.writeHooks[IO_ADDR.PORTA];
    const prevHookB = mcu.cpu.writeHooks[IO_ADDR.PORTB];
    const prevHookC = mcu.cpu.writeHooks[IO_ADDR.PORTC];
    const prevHookD = mcu.cpu.writeHooks[IO_ADDR.PORTD];

    mcu.cpu.writeHooks[IO_ADDR.PORTA] = (val, old, addr, mask) => {
      mcu.cpu.data[addr] = val;
      if (mcu.wiring.lcdPort === 'A') handleLcdPins();
      return prevHookA ? prevHookA(val, old, addr, mask) : true;
    };
    mcu.cpu.writeHooks[IO_ADDR.PORTB] = (val, old, addr, mask) => {
      mcu.cpu.data[addr] = val;
      if (mcu.wiring.lcdPort === 'B') handleLcdPins();
      return prevHookB ? prevHookB(val, old, addr, mask) : true;
    };
    mcu.cpu.writeHooks[IO_ADDR.PORTC] = (val, old, addr, mask) => {
      mcu.cpu.data[addr] = val;
      if (mcu.wiring.lcdPort === 'C') handleLcdPins();
      return prevHookC ? prevHookC(val, old, addr, mask) : true;
    };
    mcu.cpu.writeHooks[IO_ADDR.PORTD] = (val, old, addr, mask) => {
      mcu.cpu.data[addr] = val;
      if (mcu.wiring.lcdPort === 'D') handleLcdPins();
      return prevHookD ? prevHookD(val, old, addr, mask) : true;
    };
  }, [mcu, lcd]);

  const DEFAULT_INITIAL_HEX = `:1000000014C01BC01AC019C018C017C016C015C034
:1000100014C013C012C011C010C00FC00EC00DC05C
:100020000CC00BC00AC009C008C011241FBECFE518
:10003000D2E0DEBFCDBF02D018C0E2CF8FEFF7BBBF
:100040008FEFF8BB2FEF84E091E0215080409040D5
:10005000E1F700C000001BB82FEF84E091E02150CD
:1000600080409040E1F700C00000F0CFF894FFCF8D
:00000001FF`;

  // Initial load of starter code into flash memory
  useEffect(() => {
    setCurrentHex(DEFAULT_INITIAL_HEX);
    const parsed = parseHex(DEFAULT_INITIAL_HEX);
    const words = bytesToWords(parsed.data);
    mcu.loadFlash(words);
    setCompilerLogs((prev) => [
      ...prev,
      'System Ready: Initialized ATmega8535 flash with starter demo.',
    ]);

    fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: TEMPLATES[0].code, fCpu: 1000000 }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.hex) {
          setCurrentHex(data.hex);
          const p = parseHex(data.hex);
          mcu.loadFlash(bytesToWords(p.data));
        }
      })
      .catch(() => {});
  }, [mcu]);

  const handleRun = () => {
    mcu.start();
  };

  const handlePause = () => {
    mcu.pause();
  };

  const handleStep = () => {
    mcu.pause();
    mcu.step();
    mcu.notifyUi();
  };

  const handleReset = () => {
    mcu.pause();
    mcu.reset();
    lcd.reset();
  };

  const handleCompileSuccess = (hex: string, fCpu: number) => {
    setCurrentHex(hex);
    mcu.targetClockFreq = fCpu;
  };

  const handleProgramDirect = (hex: string) => {
    setCurrentHex(hex);
    const parsed = parseHex(hex);
    const words = bytesToWords(parsed.data);
    mcu.loadFlash(words);
    mcu.start();
  };

  const handleWiringChange = (newWiring: BoardWiring) => {
    mcu.wiring = newWiring;
    const clk = mcu.evaluateClockFrequency();
    mcu.targetClockFreq = clk.freq;
    mcu.updatePins();
    mcu.notifyUi();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d14] text-gray-200 overflow-hidden font-sans">
      {/* Top Main Navigation / Control Bar */}
      <header className="bg-[#121722] border-b border-[#202736] px-4 py-2 flex flex-wrap justify-between items-center z-10 shadow-md">
        {/* Logo and Kit Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-black text-xs shadow-md">
              51
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
                DT-COMBO AVR-51
                <span className="text-[10px] bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-700/60 font-mono">
                  ATmega8535
                </span>
              </div>
              <div className="text-[9px] font-mono text-gray-400">
                Microchip Studio & ProgISP Starter Kit Simulator
              </div>
            </div>
          </div>
        </div>

        {/* Global Simulation Controls */}
        <div className="flex items-center gap-2 bg-[#0a0e16] px-3 py-1 rounded-lg border border-[#222b3d]">
          {mcu.isRunning ? (
            <button
              onClick={handlePause}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition-all"
              title="Pause Simulation"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </button>
          ) : (
            <button
              onClick={handleRun}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition-all"
              title="Run Simulation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run
            </button>
          )}

          <button
            onClick={handleStep}
            disabled={mcu.isRunning}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 active:scale-95 transition-all"
            title="Step One Instruction"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Step
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded text-xs flex items-center gap-1 active:scale-95 transition-all"
            title="Reset CPU and Peripherals"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Speed / Turbo Selector */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={mcu.turboMultiplier}
              onChange={(e) => {
                mcu.turboMultiplier = parseFloat(e.target.value);
                mcu.notifyUi();
              }}
              className="bg-[#141b27] text-amber-300 border border-gray-700 rounded px-1.5 py-0.5 text-xs outline-none cursor-pointer"
            >
              <option value={1}>1.0x Realtime</option>
              <option value={2}>2.0x Fast</option>
              <option value={5}>5.0x Turbo</option>
            </select>
          </div>
        </div>

        {/* Realtime Timing Stats */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-gray-400">Simulated Time:</span>
            <span className="font-bold text-emerald-400">{mcu.simulatedTimeSec.toFixed(3)} s</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-gray-400">Target Clock:</span>
            <span className="font-bold text-amber-400">{(mcu.targetClockFreq / 1000000).toFixed(2)} MHz</span>
          </div>
        </div>
      </header>

      {/* Warning Banner for Unimplemented Peripherals */}
      {warningMessage && (
        <div className="bg-amber-950/90 border-b border-amber-600/80 px-4 py-1.5 flex justify-between items-center text-xs font-mono text-amber-200 z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button
            onClick={() => setWarningMessage(null)}
            className="text-amber-400 hover:text-white p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace 3-Column Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Code Editor (Microchip Studio) */}
        <div className="w-[32%] min-w-[340px] max-w-[480px] p-2 flex flex-col border-r border-[#1c2331]">
          <CodeEditor
            onCompileSuccess={handleCompileSuccess}
            onProgramDirect={handleProgramDirect}
            onCompilerLog={(msg) => setCompilerLogs((prev) => [...prev, msg])}
          />
        </div>

        {/* CENTER COLUMN: Virtual DT-COMBO AVR-51 Starter Kit Board */}
        <div className="flex-1 p-2 flex flex-col items-center justify-start overflow-y-auto bg-[#070a0f]">
          <BoardSvg
            mcu={mcu}
            lcd={lcd}
            onReset={handleReset}
            onWiringChange={handleWiringChange}
          />
        </div>

        {/* RIGHT COLUMN: ProgISP & Debugger Panels */}
        <div className="w-[28%] min-w-[320px] max-w-[400px] p-2 flex flex-col border-l border-[#1c2331]">
          {/* Right Tab Header */}
          <div className="flex items-center gap-1 mb-2 bg-[#141b27] p-1 rounded-lg border border-gray-800 text-xs font-mono">
            <button
              onClick={() => setRightPanelTab('progisp')}
              className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 font-semibold transition-all ${
                rightPanelTab === 'progisp'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              ProgISP
            </button>
            <button
              onClick={() => setRightPanelTab('registers')}
              className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 font-semibold transition-all ${
                rightPanelTab === 'registers'
                  ? 'bg-emerald-700 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Registers & I/O
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'progisp' ? (
              <ProgIsp
                mcu={mcu}
                currentHex={currentHex}
                onProgramSuccess={() => mcu.start()}
                onLoadHex={(hex, name) => {
                  setCurrentHex(hex);
                  setCompilerLogs((prev) => [...prev, `Loaded external HEX file: ${name}`]);
                }}
              />
            ) : (
              <RegisterViewer mcu={mcu} />
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM PANEL: Output, Serial Terminal, Disassembly, SRAM (Collapsible/Tabbed) */}
      <footer className="h-[210px] bg-[#0c1017] border-t border-[#1c2331] flex flex-col">
        {/* Bottom Tab Bar */}
        <div className="bg-[#141a24] px-3 py-1 flex justify-between items-center border-b border-[#222a38] text-xs font-mono">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBottomPanelTab('serial')}
              className={`px-3 py-1 rounded flex items-center gap-1.5 font-semibold transition-all ${
                bottomPanelTab === 'serial'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Serial Terminal (USART)
            </button>

            <button
              onClick={() => setBottomPanelTab('compiler')}
              className={`px-3 py-1 rounded flex items-center gap-1.5 font-semibold transition-all ${
                bottomPanelTab === 'compiler'
                  ? 'bg-blue-950 text-blue-300 border border-blue-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Compiler Output ({compilerLogs.length})
            </button>

            <button
              onClick={() => setBottomPanelTab('disasm')}
              className={`px-3 py-1 rounded flex items-center gap-1.5 font-semibold transition-all ${
                bottomPanelTab === 'disasm'
                  ? 'bg-purple-950 text-purple-300 border border-purple-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Disassembly (PC)
            </button>

            <button
              onClick={() => setBottomPanelTab('sram')}
              className={`px-3 py-1 rounded flex items-center gap-1.5 font-semibold transition-all ${
                bottomPanelTab === 'sram'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              SRAM Dump (512B)
            </button>
          </div>

          <div className="text-[10px] text-gray-500">
            MacBook Air Optimized • Apple Silicon Native Toolchain
          </div>
        </div>

        {/* Bottom Content Area */}
        <div className="flex-1 p-1 overflow-hidden">
          {bottomPanelTab === 'serial' && <SerialTerminal mcu={mcu} />}
          {bottomPanelTab === 'compiler' && (
            <OutputConsole logs={compilerLogs} onClear={() => setCompilerLogs([])} />
          )}
          {bottomPanelTab === 'disasm' && (
            <DisassemblyViewer
              mcu={mcu}
              onToggleBreakpoint={(addr) => mcu.toggleBreakpoint(addr)}
            />
          )}
          {bottomPanelTab === 'sram' && <SramViewer mcu={mcu} />}
        </div>
      </footer>
    </div>
  );
};

export default App;
