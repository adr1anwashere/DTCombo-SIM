import React, { useEffect, useState } from 'react';
import { HD44780, HD44780State } from '../../sim/hd44780';

interface LcdDisplayProps {
  lcd: HD44780;
  colorScheme?: 'green' | 'blue';
}

export const LcdDisplay: React.FC<LcdDisplayProps> = ({ lcd, colorScheme = 'green' }) => {
  const [state, setState] = useState<HD44780State>(lcd.getState());
  const [blinkState, setBlinkState] = useState(false);

  useEffect(() => {
    return lcd.addListener(() => {
      setState(lcd.getState());
    });
  }, [lcd]);

  // Cursor blink interval (~500ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setBlinkState(prev => !prev);
    }, 450);
    return () => clearInterval(timer);
  }, []);

  const isGreen = colorScheme === 'green';
  const bgColor = isGreen ? '#7da32c' : '#1e40af';
  const textColor = isGreen ? '#182403' : '#e0e7ff';
  const offPixelColor = isGreen ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  return (
    <div className="relative inline-block p-2 rounded-md bg-[#1a1e24] border border-[#333b47] shadow-inner select-none">
      {/* LCD Bezel */}
      <div className="flex flex-col items-center">
        <div className="text-[9px] uppercase tracking-wider text-gray-400 font-mono mb-1 flex justify-between w-full px-1">
          <span>8x2 LCD MODULE (HD44780)</span>
          <span>{state.is4BitMode ? '4-BIT' : '8-BIT'}</span>
        </div>

        {/* Display Glass */}
        <div
          className="rounded px-2.5 py-1.5 font-mono text-[14px] leading-tight font-bold tracking-[0.2em] transition-colors duration-300 shadow-inner flex flex-col justify-center border border-black/40"
          style={{
            backgroundColor: state.backlight ? bgColor : '#3a4433',
            color: state.backlight ? textColor : 'rgba(0,0,0,0.25)',
            opacity: Math.max(0.2, state.contrast),
            width: '160px',
            minHeight: '52px',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
            textShadow: isGreen ? '0 1px 0 rgba(255,255,255,0.3)' : '0 1px 2px rgba(0,0,0,0.6)',
          }}
        >
          {state.lines.map((line, rowIdx) => (
            <div key={rowIdx} className="flex flex-row justify-between h-[20px] items-center">
              {Array.from({ length: 8 }).map((_, colIdx) => {
                const char = line[colIdx] || ' ';
                const isCursorHere =
                  state.cursorRow === rowIdx &&
                  state.cursorCol === colIdx &&
                  (state.cursorOn || (state.blinkOn && blinkState));

                return (
                  <span
                    key={colIdx}
                    className="relative w-[16px] text-center inline-block"
                  >
                    {state.displayOn ? char : ' '}
                    {isCursorHere && (
                      <span
                        className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
                        style={{ backgroundColor: textColor }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
