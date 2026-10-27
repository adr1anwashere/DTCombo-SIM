import React, { useState } from 'react';
import { ATmega8535 } from '../../sim/atmega8535';

interface SramViewerProps {
  mcu: ATmega8535;
}

export const SramViewer: React.FC<SramViewerProps> = ({ mcu }) => {
  const [page, setPage] = useState(0); // 0..3 (128 bytes per page)
  const cpu = mcu.cpu;

  // Internal SRAM on ATmega8535: 512 bytes from 0x0060 to 0x025F
  const sramStart = 0x0060;
  const totalBytes = 512;
  const rowsPerPage = 16; // 16 bytes per row * 16 rows = 256 bytes per half
  const bytesPerRow = 16;

  const totalPages = Math.ceil(totalBytes / (rowsPerPage * bytesPerRow)); // 2 pages of 256 bytes

  const startAddress = sramStart + page * (rowsPerPage * bytesPerRow);
  const rows = [];

  for (let r = 0; r < rowsPerPage; r++) {
    const rowAddr = startAddress + r * bytesPerRow;
    if (rowAddr >= sramStart + totalBytes) break;

    const hexBytes: string[] = [];
    const asciiChars: string[] = [];

    for (let c = 0; c < bytesPerRow; c++) {
      const addr = rowAddr + c;
      if (addr < cpu.data.length) {
        const val = cpu.data[addr];
        hexBytes.push(val.toString(16).padStart(2, '0').toUpperCase());
        asciiChars.push(val >= 32 && val <= 126 ? String.fromCharCode(val) : '.');
      } else {
        hexBytes.push('--');
        asciiChars.push(' ');
      }
    }

    rows.push({
      address: rowAddr,
      hex: hexBytes,
      ascii: asciiChars.join(''),
    });
  }

  return (
    <div className="bg-[#12161f] border border-[#222a38] rounded-xl flex flex-col font-mono text-xs overflow-hidden select-none h-full">
      {/* Header & Page Buttons */}
      <div className="bg-[#1c2433] px-3 py-1.5 border-b border-[#2a3549] flex justify-between items-center text-gray-200">
        <span className="font-bold text-emerald-400">SRAM Hex Viewer (512 Bytes: 0x0060 - 0x025F)</span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                page === p
                  ? 'bg-emerald-800 text-white border-emerald-600'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
              }`}
            >
              Page {p + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Hex Dump Table */}
      <div className="p-2 flex-1 overflow-auto bg-[#0a0d13]">
        <table className="w-full text-left font-mono text-[10px] border-collapse">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="py-0.5 pr-2">ADDR</th>
              {Array.from({ length: 16 }).map((_, i) => (
                <th key={i} className="px-1 text-center">
                  {i.toString(16).toUpperCase()}
                </th>
              ))}
              <th className="pl-3">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.address} className="hover:bg-gray-800/40">
                <td className="text-gray-500 font-semibold pr-2">
                  0x{row.address.toString(16).padStart(4, '0').toUpperCase()}
                </td>
                {row.hex.map((h, i) => {
                  const val = parseInt(h, 16);
                  return (
                    <td
                      key={i}
                      className={`px-1 text-center ${
                        val > 0 ? 'text-emerald-300 font-bold' : 'text-gray-600'
                      }`}
                    >
                      {h}
                    </td>
                  );
                })}
                <td className="text-amber-200/80 tracking-widest pl-3 font-mono">
                  {row.ascii}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
