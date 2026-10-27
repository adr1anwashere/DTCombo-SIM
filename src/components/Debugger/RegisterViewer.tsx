import React, { useState } from 'react';
import { ATmega8535, IO_ADDR } from '../../sim/atmega8535';

interface RegisterViewerProps {
  mcu: ATmega8535;
}

export const RegisterViewer: React.FC<RegisterViewerProps> = ({ mcu }) => {
  const [tab, setTab] = useState<'cpu' | 'io' | 'timers' | 'gpr'>('cpu');

  const cpu = mcu.cpu;
  const sreg = cpu.data[IO_ADDR.SREG];
  const sp = (cpu.data[IO_ADDR.SPH] << 8) | cpu.data[IO_ADDR.SPL];
  const pc = cpu.pc;

  // SREG Flags: I, T, H, S, V, N, Z, C
  const flags = [
    { name: 'I', val: (sreg >> 7) & 1, desc: 'Global Interrupt Enable' },
    { name: 'T', val: (sreg >> 6) & 1, desc: 'Bit Copy Storage' },
    { name: 'H', val: (sreg >> 5) & 1, desc: 'Half Carry Flag' },
    { name: 'S', val: (sreg >> 4) & 1, desc: 'Sign Bit (N ⊕ V)' },
    { name: 'V', val: (sreg >> 3) & 1, desc: 'Two\'s Complement Overflow' },
    { name: 'N', val: (sreg >> 2) & 1, desc: 'Negative Flag' },
    { name: 'Z', val: (sreg >> 1) & 1, desc: 'Zero Flag' },
    { name: 'C', val: (sreg >> 0) & 1, desc: 'Carry Flag' },
  ];

  const renderPortBits = (val: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => {
          const bit = (val >> (7 - i)) & 1;
          return (
            <span
              key={i}
              className={`w-3.5 h-4 flex items-center justify-center text-[9px] font-mono rounded-[2px] font-bold ${
                bit === 1 ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-500'
              }`}
            >
              {bit}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#12161f] border border-[#222a38] rounded-xl flex flex-col font-mono text-xs overflow-hidden select-none h-full">
      {/* Tab Navigation */}
      <div className="bg-[#1c2433] px-2 py-1.5 border-b border-[#2a3549] flex justify-between items-center">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('cpu')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              tab === 'cpu'
                ? 'bg-emerald-800 text-white border border-emerald-600'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            CPU & Status
          </button>
          <button
            onClick={() => setTab('io')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              tab === 'io'
                ? 'bg-emerald-800 text-white border border-emerald-600'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            I/O Ports
          </button>
          <button
            onClick={() => setTab('timers')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              tab === 'timers'
                ? 'bg-emerald-800 text-white border border-emerald-600'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Timers & ADC
          </button>
          <button
            onClick={() => setTab('gpr')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              tab === 'gpr'
                ? 'bg-emerald-800 text-white border border-emerald-600'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            R0-R31
          </button>
        </div>

        <div className="text-[10px] text-gray-400">
          PC: <span className="text-emerald-400 font-bold">0x{(pc * 2).toString(16).padStart(4, '0').toUpperCase()}</span>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        {/* TAB 1: CPU & Status Flags */}
        {tab === 'cpu' && (
          <div className="flex flex-col gap-3">
            {/* Core Registers Box */}
            <div className="bg-[#171d29] p-2.5 rounded-lg border border-gray-800 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-gray-400 text-[10px] block">Program Counter:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  0x{(pc * 2).toString(16).padStart(4, '0').toUpperCase()}
                </span>
                <span className="text-[9px] text-gray-500 block">Word: {pc}</span>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] block">Stack Pointer (SP):</span>
                <span className="text-blue-400 font-bold text-sm">
                  0x{sp.toString(16).padStart(4, '0').toUpperCase()}
                </span>
                <span className="text-[9px] text-gray-500 block">SRAM Offset</span>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] block">Cycles Executed:</span>
                <span className="text-amber-400 font-bold text-sm">
                  {mcu.totalCycles.toLocaleString()}
                </span>
                <span className="text-[9px] text-gray-500 block">
                  Time: {mcu.simulatedTimeSec.toFixed(3)}s
                </span>
              </div>
            </div>

            {/* SREG Flags */}
            <div className="bg-[#171d29] p-2.5 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-gray-400">Status Register (SREG):</span>
                <span className="text-emerald-400 font-bold text-xs">
                  0x{sreg.toString(16).padStart(2, '0').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-8 gap-1 text-center">
                {flags.map((f) => (
                  <div
                    key={f.name}
                    className={`flex flex-col items-center p-1 rounded border transition-colors ${
                      f.val === 1
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                        : 'bg-gray-900 border-gray-800 text-gray-500'
                    }`}
                    title={`${f.name}: ${f.desc}`}
                  >
                    <span className="font-bold text-xs">{f.name}</span>
                    <span className="text-[10px] font-mono">{f.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: I/O Ports */}
        {tab === 'io' && (
          <div className="flex flex-col gap-2.5">
            {['A', 'B', 'C', 'D'].map((p) => {
              const portAddr = IO_ADDR[`PORT${p}` as keyof typeof IO_ADDR];
              const ddrAddr = IO_ADDR[`DDR${p}` as keyof typeof IO_ADDR];
              const pinAddr = IO_ADDR[`PIN${p}` as keyof typeof IO_ADDR];

              const portVal = cpu.data[portAddr];
              const ddrVal = cpu.data[ddrAddr];
              const pinVal = cpu.data[pinAddr];

              return (
                <div key={p} className="bg-[#171d29] p-2 rounded-lg border border-gray-800 text-[11px]">
                  <div className="flex justify-between items-center mb-1 font-bold text-emerald-400">
                    <span>PORT {p}</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      Pins 7 ➔ 0
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400">PORT{p} (0x{portVal.toString(16).padStart(2, '0').toUpperCase()}):</span>
                      {renderPortBits(portVal)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400">DDR{p} (0x{ddrVal.toString(16).padStart(2, '0').toUpperCase()}):</span>
                      {renderPortBits(ddrVal)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400">PIN{p} (0x{pinVal.toString(16).padStart(2, '0').toUpperCase()}):</span>
                      {renderPortBits(pinVal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: Timers & Peripherals */}
        {tab === 'timers' && (
          <div className="flex flex-col gap-2.5 text-[11px]">
            {/* Timer 0 */}
            <div className="bg-[#171d29] p-2 rounded border border-gray-800">
              <span className="font-bold text-emerald-400 block mb-1">Timer 0 (8-bit)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>TCNT0: <span className="text-white font-bold">{cpu.data[IO_ADDR.TCNT0]}</span></div>
                <div>OCR0: <span className="text-amber-300 font-bold">{cpu.data[IO_ADDR.OCR0]}</span></div>
                <div>TCCR0: <span className="text-blue-300 font-bold">0x{cpu.data[IO_ADDR.TCCR0].toString(16).toUpperCase()}</span></div>
              </div>
            </div>

            {/* Timer 1 */}
            <div className="bg-[#171d29] p-2 rounded border border-gray-800">
              <span className="font-bold text-emerald-400 block mb-1">Timer 1 (16-bit)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>TCNT1: <span className="text-white font-bold">{(cpu.data[IO_ADDR.TCNT1H] << 8) | cpu.data[IO_ADDR.TCNT1L]}</span></div>
                <div>OCR1A: <span className="text-amber-300 font-bold">{(cpu.data[IO_ADDR.OCR1AH] << 8) | cpu.data[IO_ADDR.OCR1AL]}</span></div>
                <div>TCCR1A: <span className="text-blue-300 font-bold">0x{cpu.data[IO_ADDR.TCCR1A].toString(16).toUpperCase()}</span></div>
                <div>TCCR1B: <span className="text-blue-300 font-bold">0x{cpu.data[IO_ADDR.TCCR1B].toString(16).toUpperCase()}</span></div>
              </div>
            </div>

            {/* ADC */}
            <div className="bg-[#171d29] p-2 rounded border border-gray-800">
              <span className="font-bold text-emerald-400 block mb-1">ADC (10-bit)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>ADMUX: <span className="text-white font-bold">0x{cpu.data[IO_ADDR.ADMUX].toString(16).toUpperCase()}</span></div>
                <div>ADCSRA: <span className="text-amber-300 font-bold">0x{cpu.data[IO_ADDR.ADCSRA].toString(16).toUpperCase()}</span></div>
                <div>ADC Val: <span className="text-emerald-300 font-bold">{(cpu.data[IO_ADDR.ADCH] << 8) | cpu.data[IO_ADDR.ADCL]}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: General Purpose Registers R0..R31 */}
        {tab === 'gpr' && (
          <div className="grid grid-cols-4 gap-1 text-[10px]">
            {Array.from({ length: 32 }).map((_, i) => {
              const val = cpu.data[i];
              return (
                <div
                  key={i}
                  className={`p-1 rounded border flex justify-between ${
                    val !== 0
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-[#151b24] border-gray-800 text-gray-400'
                  }`}
                >
                  <span className="font-semibold text-gray-500">R{i}:</span>
                  <span className="font-bold font-mono">0x{val.toString(16).padStart(2, '0').toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
