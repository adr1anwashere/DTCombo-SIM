import React, { useEffect, useState } from 'react';

interface SwitchArrayProps {
  value: number; // 0xFF = all released, bit 0 = pressed (active low)
  onChange: (index: number, pressed: boolean) => void;
  label?: string;
}

export const SwitchArray: React.FC<SwitchArrayProps> = ({
  value,
  onChange,
  label = 'J23: 8 TACTILE SWITCHES (ACTIVE LOW)',
}) => {
  const [latchMode, setLatchMode] = useState(false);

  // Global keyboard shortcuts: 1..8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in Monaco editor or input box
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.classList.contains('monaco-editor')
      ) {
        return;
      }

      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 8) {
        const switchIdx = keyNum - 1;
        if (latchMode) {
          const isCurrentlyPressed = ((value >> switchIdx) & 1) === 0;
          onChange(switchIdx, !isCurrentlyPressed);
        } else {
          onChange(switchIdx, true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (latchMode) return;
      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 8) {
        const switchIdx = keyNum - 1;
        onChange(switchIdx, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [value, onChange, latchMode]);

  return (
    <div className="bg-[#14181f] border border-[#2b3342] rounded-md p-2 flex flex-col items-center select-none shadow-sm">
      <div className="flex justify-between items-center w-full mb-2 px-1">
        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono">
          {label}
        </span>
        <button
          onClick={() => setLatchMode(!latchMode)}
          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
            latchMode
              ? 'bg-amber-950/70 border-amber-600 text-amber-300'
              : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-gray-200'
          }`}
          title="Toggle between momentary push button and toggle switch"
        >
          {latchMode ? 'LATCH ON' : 'MOMENTARY'}
        </button>
      </div>

      <div className="flex flex-row items-center gap-2">
        {Array.from({ length: 8 }).map((_, idx) => {
          const bitIndex = 7 - idx; // SW7 on left, SW0 on right
          const isPressed = ((value >> bitIndex) & 1) === 0;

          return (
            <div key={bitIndex} className="flex flex-col items-center gap-1">
              {/* Tactile Button Body */}
              <button
                type="button"
                onMouseDown={() => {
                  if (latchMode) {
                    onChange(bitIndex, !isPressed);
                  } else {
                    onChange(bitIndex, true);
                  }
                }}
                onMouseUp={() => {
                  if (!latchMode) onChange(bitIndex, false);
                }}
                onMouseLeave={() => {
                  if (!latchMode && isPressed) onChange(bitIndex, false);
                }}
                className={`w-7 h-7 rounded-sm flex items-center justify-center border transition-transform duration-75 active:scale-95 cursor-pointer shadow-md ${
                  isPressed
                    ? 'bg-[#1b232c] border-amber-500 shadow-inner translate-y-0.5'
                    : 'bg-[#2b3340] border-[#445063] hover:border-gray-300 hover:bg-[#343e4d]'
                }`}
              >
                {/* Metallic Circular Actuator */}
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isPressed
                      ? 'bg-gradient-to-tr from-amber-600 to-amber-400 border-amber-300'
                      : 'bg-gradient-to-tr from-gray-400 to-gray-200 border-gray-100 shadow-sm'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPressed ? 'bg-amber-900' : 'bg-gray-500'
                    }`}
                  />
                </div>
              </button>

              {/* Pin Label */}
              <span className="text-[9px] font-mono font-semibold text-gray-400">
                SW{bitIndex}
              </span>
              {/* Shortcut Key Badge */}
              <span className="text-[8px] font-mono px-1 rounded bg-black/40 text-gray-500 border border-gray-800">
                Key {bitIndex + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
