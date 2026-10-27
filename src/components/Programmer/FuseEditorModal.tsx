import React, { useState } from 'react';
import { Fuses } from '../../sim/atmega8535';
import { X, Check, AlertTriangle } from 'lucide-react';

interface FuseEditorModalProps {
  fuses: Fuses;
  isOpen: boolean;
  onClose: () => void;
  onSave: (fuses: Fuses) => void;
}

export const FuseEditorModal: React.FC<FuseEditorModalProps> = ({
  fuses,
  isOpen,
  onClose,
  onSave,
}) => {
  const [currentFuses, setCurrentFuses] = useState<Fuses>({ ...fuses });

  if (!isOpen) return null;

  const low = currentFuses.low;
  const high = currentFuses.high;
  const lock = currentFuses.lock;

  // Low Fuse Bits:
  // Bit 0..3: CKSEL3..0
  // Bit 4..5: SUT1..0
  // Bit 6:    BODEN (0 = enabled)
  // Bit 7:    BODLEVEL (0 = 4.0V, 1 = 2.7V)
  const cksel = low & 0x0f;
  const sut = (low >> 4) & 0x03;
  const boden = (low >> 6) & 0x01;
  const bodlevel = (low >> 7) & 0x01;

  // High Fuse Bits:
  // Bit 0: BOOTRST
  // Bit 1..2: BOOTSZ0..1
  // Bit 3: EESAVE (0 = preserve EEPROM on chip erase)
  // Bit 4: CKOPT
  // Bit 5: SPIEN (0 = enabled)
  // Bit 6: WDTON
  // Bit 7: S8535C (compatibility mode)
  const bootrst = high & 0x01;
  const bootsz = (high >> 1) & 0x03;
  const eesave = (high >> 3) & 0x01;
  const ckopt = (high >> 4) & 0x01;
  const spien = (high >> 5) & 0x01;
  const wdton = (high >> 6) & 0x01;
  const s8535c = (high >> 7) & 0x01;

  const handleCkselChange = (newVal: number) => {
    const newLow = (low & 0xf0) | (newVal & 0x0f);
    setCurrentFuses({ ...currentFuses, low: newLow });
  };

  const handleLowBitToggle = (bit: number) => {
    const newLow = low ^ (1 << bit);
    setCurrentFuses({ ...currentFuses, low: newLow });
  };

  const handleHighBitToggle = (bit: number) => {
    const newHigh = high ^ (1 << bit);
    setCurrentFuses({ ...currentFuses, high: newHigh });
  };

  const handleApplyDefaults = (mode: 'internal1mhz' | 'external4mhz') => {
    if (mode === 'internal1mhz') {
      setCurrentFuses({ low: 0xE1, high: 0xD9, lock: 0xFF });
    } else {
      setCurrentFuses({ low: 0xEE, high: 0xD9, lock: 0xFF }); // External Crystal 4-16MHz
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#181d26] border border-[#2e3746] rounded-xl shadow-2xl w-full max-w-lg text-gray-200 font-mono text-xs overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center bg-[#1f2633] px-4 py-2.5 border-b border-[#2e3746]">
          <span className="font-bold text-amber-400">ProgISP Fuse & Lock Bit Editor (ATmega8535)</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Presets */}
          <div className="flex items-center gap-2 bg-[#12161f] p-2 rounded border border-gray-800">
            <span className="text-gray-400 text-[11px]">Factory Presets:</span>
            <button
              onClick={() => handleApplyDefaults('internal1mhz')}
              className="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 text-[10px]"
            >
              Default (1 MHz Int. RC: 0xE1)
            </button>
            <button
              onClick={() => handleApplyDefaults('external4mhz')}
              className="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-[10px]"
            >
              Ext. Crystal (4-16 MHz: 0xEE)
            </button>
          </div>

          {/* LOW FUSE (LFUSE) */}
          <div className="border border-gray-700/60 rounded-lg p-3 bg-[#131822]">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-700">
              <span className="font-bold text-emerald-400">Low Fuse (LFUSE)</span>
              <div className="flex items-center gap-2">
                <span>Value:</span>
                <input
                  type="text"
                  value={`0x${low.toString(16).padStart(2, '0').toUpperCase()}`}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 16);
                    if (!isNaN(parsed)) setCurrentFuses({ ...currentFuses, low: parsed & 0xff });
                  }}
                  className="bg-black text-amber-300 w-16 px-1.5 py-0.5 rounded border border-gray-600 font-bold text-center"
                />
              </div>
            </div>

            {/* Clock Selection Dropdown */}
            <div className="mb-3">
              <label className="text-gray-400 block mb-1">CKSEL3..0 (Clock Source Selection):</label>
              <select
                value={cksel}
                onChange={(e) => handleCkselChange(parseInt(e.target.value, 10))}
                className="w-full bg-[#1b222f] text-emerald-300 border border-gray-700 rounded px-2 py-1 text-xs outline-none"
              >
                <option value={0x01}>0001: Internal Calibrated RC Oscillator (1.0 MHz)</option>
                <option value={0x02}>0010: Internal Calibrated RC Oscillator (2.0 MHz)</option>
                <option value={0x03}>0011: Internal Calibrated RC Oscillator (4.0 MHz)</option>
                <option value={0x04}>0100: Internal Calibrated RC Oscillator (8.0 MHz)</option>
                <option value={0x0E}>1110: External Crystal / Resonator (4.0 - 16.0 MHz)</option>
                <option value={0x0F}>1111: External Crystal / Resonator (High Frequency)</option>
                <option value={0x00}>0000: External Clock Source</option>
              </select>
            </div>

            {/* Low Fuse Checkboxes */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={boden === 0}
                  onChange={() => handleLowBitToggle(6)}
                  className="rounded border-gray-700 bg-gray-900 text-emerald-500"
                />
                <span>BODEN (Brown-out Detect Enabled)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bodlevel === 0}
                  onChange={() => handleLowBitToggle(7)}
                  className="rounded border-gray-700 bg-gray-900 text-emerald-500"
                />
                <span>BODLEVEL (0=4.0V, 1=2.7V)</span>
              </label>
            </div>
          </div>

          {/* HIGH FUSE (HFUSE) */}
          <div className="border border-gray-700/60 rounded-lg p-3 bg-[#131822]">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-700">
              <span className="font-bold text-amber-400">High Fuse (HFUSE)</span>
              <div className="flex items-center gap-2">
                <span>Value:</span>
                <input
                  type="text"
                  value={`0x${high.toString(16).padStart(2, '0').toUpperCase()}`}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 16);
                    if (!isNaN(parsed)) setCurrentFuses({ ...currentFuses, high: parsed & 0xff });
                  }}
                  className="bg-black text-amber-300 w-16 px-1.5 py-0.5 rounded border border-gray-600 font-bold text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spien === 0}
                  onChange={() => handleHighBitToggle(5)}
                  className="rounded border-gray-700 bg-gray-900 text-emerald-500"
                />
                <span>SPIEN (Serial ISP Enabled) [Active Low]</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ckopt === 0}
                  onChange={() => handleHighBitToggle(4)}
                  className="rounded border-gray-700 bg-gray-900 text-emerald-500"
                />
                <span>CKOPT (Full Rail Oscillator)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eesave === 0}
                  onChange={() => handleHighBitToggle(3)}
                  className="rounded border-gray-700 bg-gray-900 text-emerald-500"
                />
                <span>EESAVE (Preserve EEPROM on Erase)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bootrst === 0}
                  onChange={() => handleHighBitToggle(0)}
                  className="rounded border-gray-700 bg-gray-900 text-emerald-500"
                />
                <span>BOOTRST (Select Reset Vector)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 bg-[#1f2633] px-4 py-3 border-t border-[#2e3746]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(currentFuses);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
          >
            <Check className="w-3.5 h-3.5" />
            Write Fuses
          </button>
        </div>
      </div>
    </div>
  );
};
