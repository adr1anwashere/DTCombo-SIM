import React from 'react';

interface LedArrayProps {
  value: number; // 8-bit port value (Active-Low: 0 = ON, 1 = OFF)
  color?: 'green' | 'red' | 'amber';
  label?: string;
}

export const LedArray: React.FC<LedArrayProps> = ({
  value,
  color = 'green',
  label = 'J22: 8 SMD LEDS (ACTIVE LOW)',
}) => {
  const colorMap = {
    green: {
      on: '#22c55e',
      glow: '0 0 10px #22c55e, 0 0 20px rgba(34, 197, 94, 0.6)',
      off: '#14532d',
      border: '#16a34a',
    },
    red: {
      on: '#ef4444',
      glow: '0 0 10px #ef4444, 0 0 20px rgba(239, 68, 68, 0.6)',
      off: '#7f1d1d',
      border: '#dc2626',
    },
    amber: {
      on: '#f59e0b',
      glow: '0 0 10px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.6)',
      off: '#78350f',
      border: '#d97706',
    },
  };

  const style = colorMap[color];

  return (
    <div className="bg-[#14181f] border border-[#2b3342] rounded-md p-2 flex flex-col items-center select-none shadow-sm">
      <div className="text-[9px] uppercase tracking-wider text-gray-400 font-mono mb-2">
        {label}
      </div>

      <div className="flex flex-row items-center gap-2">
        {Array.from({ length: 8 }).map((_, idx) => {
          // Bit 7 to Bit 0 or 0 to 7. DT-COMBO: LED0 is bit 0, LED7 is bit 7
          const bitIndex = 7 - idx; // Display D7 on left, D0 on right
          const isLow = ((value >> bitIndex) & 1) === 0; // Active-low

          return (
            <div key={bitIndex} className="flex flex-col items-center gap-1">
              {/* SMD LED Package */}
              <div
                className="w-4 h-5 rounded-[2px] transition-all duration-75 relative flex items-center justify-center border border-black/50"
                style={{
                  backgroundColor: isLow ? style.on : style.off,
                  boxShadow: isLow ? style.glow : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {/* SMD center die reflection */}
                <div
                  className="w-1.5 h-2 rounded-[1px]"
                  style={{
                    backgroundColor: isLow ? '#ffffff' : 'rgba(255,255,255,0.05)',
                    opacity: isLow ? 0.8 : 0.2,
                  }}
                />
              </div>

              {/* Pin Label */}
              <span className="text-[9px] font-mono font-semibold text-gray-400">
                D{bitIndex}
              </span>
              {/* Bit State */}
              <span
                className={`text-[8px] font-mono ${
                  isLow ? 'text-green-400 font-bold' : 'text-gray-500'
                }`}
              >
                {isLow ? 'ON' : '0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
