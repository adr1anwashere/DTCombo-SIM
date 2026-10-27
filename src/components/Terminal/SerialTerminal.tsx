import React, { useState, useRef, useEffect } from 'react';
import { ATmega8535 } from '../../sim/atmega8535';
import { Terminal, Send, Trash2, CornerDownLeft } from 'lucide-react';

interface SerialTerminalProps {
  mcu: ATmega8535;
}

export const SerialTerminal: React.FC<SerialTerminalProps> = ({ mcu }) => {
  const [output, setOutput] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [lineEnding, setLineEnding] = useState<'none' | 'cr' | 'lf' | 'crlf'>('none');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Connect serial TX callback from MCU
    mcu.serialTxCallback = (char: string) => {
      setOutput((prev) => prev + char);
    };
    return () => {
      mcu.serialTxCallback = undefined;
    };
  }, [mcu]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, autoScroll]);

  const sendByteValue = (val: number) => {
    mcu.receiveSerialByte(val);
  };

  const handleSend = () => {
    if (!input) return;

    // Check if user entered hex notation like "0xFF" or "0x55"
    const trimmed = input.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      const parsedHex = parseInt(trimmed, 16);
      if (!isNaN(parsedHex)) {
        sendByteValue(parsedHex & 0xff);
        setInput('');
        return;
      }
    }

    // Send string characters
    for (let i = 0; i < input.length; i++) {
      sendByteValue(input.charCodeAt(i));
    }

    // Line Endings
    if (lineEnding === 'cr') {
      sendByteValue(13); // '\r'
    } else if (lineEnding === 'lf') {
      sendByteValue(10); // '\n'
    } else if (lineEnding === 'crlf') {
      sendByteValue(13);
      sendByteValue(10);
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="bg-[#12161f] border border-[#222a38] rounded-xl flex flex-col font-mono text-xs overflow-hidden select-none h-full">
      {/* Header */}
      <div className="bg-[#1c2433] px-3 py-1.5 border-b border-[#2a3549] flex justify-between items-center text-gray-200">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-gray-200">USART Serial Terminal</span>
          <span className="text-[10px] text-gray-400 ml-1">(PD0: RXD, PD1: TXD • MAX232 / COM1)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Test Bytes */}
          <span className="text-[10px] text-gray-400">Quick Send:</span>
          <button
            onClick={() => sendByteValue('A'.charCodeAt(0))}
            className="px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 text-[10px]"
            title="Send ASCII 'A' (0x41 / 0b01000001)"
          >
            'A'
          </button>
          <button
            onClick={() => sendByteValue('1'.charCodeAt(0))}
            className="px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 text-[10px]"
            title="Send ASCII '1' (0x31 / 0b00110001)"
          >
            '1'
          </button>
          <button
            onClick={() => sendByteValue(0xff)}
            className="px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-emerald-300 border border-gray-700 text-[10px]"
            title="Send Byte 0xFF (All LEDs ON)"
          >
            0xFF
          </button>
          <button
            onClick={() => sendByteValue(0x00)}
            className="px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-blue-300 border border-gray-700 text-[10px]"
            title="Send Byte 0x00 (All LEDs OFF)"
          >
            0x00
          </button>

          <button
            onClick={() => setOutput('')}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700/50"
            title="Clear Terminal Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screen */}
      <div className="flex-1 bg-[#090d14] p-3 text-emerald-300 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
        {output || (
          <span className="text-gray-600 italic">
            [Serial connection active. Type a character (e.g. 'A') or hex (e.g. '0xFF') below and click Send.]
          </span>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-[#171d29] p-2 border-t border-[#222a38] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type character (e.g. A) or hex byte (e.g. 0xFF)..."
          className="flex-1 bg-[#0a0d13] border border-gray-700 text-gray-200 px-2.5 py-1 rounded text-xs outline-none focus:border-emerald-500 font-mono"
        />

        {/* Line Ending Selector */}
        <select
          value={lineEnding}
          onChange={(e) => setLineEnding(e.target.value as any)}
          className="bg-[#0a0d13] text-gray-300 border border-gray-700 rounded px-1.5 py-1 text-[11px] outline-none"
          title="Line ending appended to sent text"
        >
          <option value="none">No Ending (Raw)</option>
          <option value="cr">CR (\r)</option>
          <option value="lf">LF (\n)</option>
          <option value="crlf">CR+LF (\r\n)</option>
        </select>

        <button
          onClick={handleSend}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded flex items-center gap-1 font-semibold text-xs active:scale-95 transition-all"
        >
          <Send className="w-3 h-3" />
          Send
        </button>
      </div>
    </div>
  );
};
