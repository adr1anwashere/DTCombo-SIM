import React, { useRef, useEffect } from 'react';
import { ATmega8535 } from '../../sim/atmega8535';
import { disassembleRange, DisassembledInstruction } from '../../sim/disassembler';
import { Crosshair, Play, CircleDot } from 'lucide-react';

interface DisassemblyViewerProps {
  mcu: ATmega8535;
  onToggleBreakpoint: (address: number) => void;
}

export const DisassemblyViewer: React.FC<DisassemblyViewerProps> = ({
  mcu,
  onToggleBreakpoint,
}) => {
  const currentPc = mcu.cpu.pc;
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);

  // Disassemble first 300 instructions of flash memory
  const instructions = disassembleRange(mcu.flash, 0, 300);

  const scrollToPc = () => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    if (!mcu.isRunning && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [currentPc, mcu.isRunning]);

  return (
    <div className="bg-[#12161f] border border-[#222a38] rounded-xl flex flex-col font-mono text-xs overflow-hidden select-none h-full">
      {/* Header */}
      <div className="bg-[#1c2433] px-3 py-1.5 border-b border-[#2a3549] flex justify-between items-center text-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-400">AVR Disassembly</span>
          <span className="text-[10px] text-gray-400">
            (PC: 0x{(currentPc * 2).toString(16).padStart(4, '0').toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {mcu.breakpoints.size > 0 && (
            <span className="text-[10px] text-red-400 font-bold bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
              {mcu.breakpoints.size} Breakpoint{mcu.breakpoints.size > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={scrollToPc}
            className="flex items-center gap-1 text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600 transition-colors"
          >
            <Crosshair className="w-3 h-3 text-emerald-400" />
            Go to PC
          </button>
        </div>
      </div>

      {/* Disassembly Code Table */}
      <div className="p-1 flex-1 overflow-auto bg-[#0a0d13]">
        <table className="w-full text-left font-mono text-[11px] border-collapse">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-[10px]">
              <th className="w-6 text-center">BP</th>
              <th className="w-16">ADDR</th>
              <th className="w-20">OPCODE</th>
              <th className="w-20">MNEMONIC</th>
              <th>OPERANDS</th>
            </tr>
          </thead>
          <tbody>
            {instructions.map((inst) => {
              const isCurrent = inst.address === currentPc;
              const hasBreakpoint = mcu.breakpoints.has(inst.address);

              return (
                <tr
                  key={inst.address}
                  ref={isCurrent ? activeRowRef : null}
                  className={`border-b border-gray-900/60 cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-emerald-950/60 text-emerald-200 font-bold border-emerald-800'
                      : 'hover:bg-gray-800/30 text-gray-300'
                  }`}
                  onClick={() => onToggleBreakpoint(inst.address)}
                >
                  {/* Breakpoint Gutter */}
                  <td className="text-center py-0.5">
                    {hasBreakpoint ? (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500" />
                    ) : isCurrent ? (
                      <span className="text-emerald-400 font-extrabold text-[12px]">➔</span>
                    ) : (
                      <span className="w-2 h-2 rounded-full inline-block opacity-0 hover:opacity-40 bg-red-500" />
                    )}
                  </td>

                  {/* Word / Byte Address */}
                  <td className="text-gray-500">
                    0x{(inst.address * 2).toString(16).padStart(4, '0').toUpperCase()}
                  </td>

                  {/* Opcode Hex */}
                  <td className="text-gray-400 font-mono text-[10px]">
                    {inst.opcodeHex}
                  </td>

                  {/* Mnemonic */}
                  <td className={`font-bold ${isCurrent ? 'text-amber-300' : 'text-blue-300'}`}>
                    {inst.mnemonic}
                  </td>

                  {/* Operands */}
                  <td className="text-gray-300">
                    {inst.operands}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
