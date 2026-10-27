import React from 'react';
import { ATmega8535, BoardWiring } from '../../sim/atmega8535';
import { HD44780 } from '../../sim/hd44780';
import { LcdDisplay } from './LcdDisplay';
import { LedArray } from './LedArray';
import { SwitchArray } from './SwitchArray';
import { RotateCcw, Power, Cpu, Radio, Sparkles } from 'lucide-react';

interface BoardSvgProps {
  mcu: ATmega8535;
  lcd: HD44780;
  onReset: () => void;
  onWiringChange: (wiring: BoardWiring) => void;
}

export const BoardSvg: React.FC<BoardSvgProps> = ({
  mcu,
  lcd,
  onReset,
  onWiringChange,
}) => {
  const [powerOn, setPowerOn] = React.useState(true);
  const wiring = mcu.wiring;

  // Handle Preset Changes
  const applyPreset = (preset: 'default' | 'presetB' | 'presetD') => {
    if (preset === 'default') {
      onWiringChange({
        ...wiring,
        ledPort: 'C',
        switchPort: 'A',
        lcdPort: 'B',
        lcdPins: {
          rs: { port: 'B', pin: 0 },
          rw: { port: 'B', pin: 1 },
          e:  { port: 'B', pin: 2 },
          d4: { port: 'B', pin: 4 },
          d5: { port: 'B', pin: 5 },
          d6: { port: 'B', pin: 6 },
          d7: { port: 'B', pin: 7 },
        },
      });
    } else if (preset === 'presetB') {
      onWiringChange({
        ...wiring,
        ledPort: 'B',
        switchPort: 'C',
        lcdPort: 'A',
        lcdPins: {
          rs: { port: 'A', pin: 0 },
          rw: { port: 'A', pin: 1 },
          e:  { port: 'A', pin: 2 },
          d4: { port: 'A', pin: 4 },
          d5: { port: 'A', pin: 5 },
          d6: { port: 'A', pin: 6 },
          d7: { port: 'A', pin: 7 },
        },
      });
    } else if (preset === 'presetD') {
      onWiringChange({
        ...wiring,
        ledPort: 'D',
        switchPort: 'A',
        lcdPort: 'C',
        lcdPins: {
          rs: { port: 'C', pin: 0 },
          rw: { port: 'C', pin: 1 },
          e:  { port: 'C', pin: 2 },
          d4: { port: 'C', pin: 4 },
          d5: { port: 'C', pin: 5 },
          d6: { port: 'C', pin: 6 },
          d7: { port: 'C', pin: 7 },
        },
      });
    }
  };

  const handleCrystalChange = (mhz: number) => {
    onWiringChange({
      ...wiring,
      crystalMhz: mhz,
    });
  };

  return (
    <div className="flex flex-col items-center bg-[#0d1117] p-3 rounded-xl border border-[#21262d] shadow-2xl max-w-full overflow-auto">
      {/* Board Top Header Toolbar */}
      <div className="w-full flex flex-wrap justify-between items-center mb-3 px-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            DT-COMBO AVR-51
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300 font-semibold">ATmega8535 (40-DIP)</span>
          <span className="text-gray-500">|</span>
          <span className="text-xs text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
            {mcu.evaluateClockFrequency().source}
          </span>
        </div>

        {/* Quick Wiring Presets */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[10px]">PRESETS:</span>
          <button
            onClick={() => applyPreset('default')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
              wiring.ledPort === 'C' && wiring.switchPort === 'A' && wiring.lcdPort === 'B'
                ? 'bg-emerald-800/80 border-emerald-500 text-emerald-100'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            Practicum Default (C:LED, A:SW, B:LCD)
          </button>
          <button
            onClick={() => applyPreset('presetB')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
              wiring.ledPort === 'B' && wiring.switchPort === 'C' && wiring.lcdPort === 'A'
                ? 'bg-emerald-800/80 border-emerald-500 text-emerald-100'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            Alt 1 (B:LED, C:SW, A:LCD)
          </button>
        </div>
      </div>

      {/* Main DT-COMBO PCB Body */}
      <div
        className="relative rounded-2xl p-4 shadow-2xl border-2 border-[#1e4e2e] select-none"
        style={{
          backgroundColor: '#0e2b18', // Classic Innovative Electronics PCB Dark Green
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(20, 80, 40, 0.4) 0%, rgba(8, 28, 14, 0.8) 100%), linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 20px 20px, 20px 20px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), inset 0 0 100px rgba(0,0,0,0.5)',
          minWidth: '720px',
          maxWidth: '820px',
        }}
      >
        {/* PCB Gold Mounting Holes */}
        <div className="absolute top-3 left-3 w-4 h-4 rounded-full border-2 border-amber-400/80 bg-[#0e2b18] shadow-inner" />
        <div className="absolute top-3 right-3 w-4 h-4 rounded-full border-2 border-amber-400/80 bg-[#0e2b18] shadow-inner" />
        <div className="absolute bottom-3 left-3 w-4 h-4 rounded-full border-2 border-amber-400/80 bg-[#0e2b18] shadow-inner" />
        <div className="absolute bottom-3 right-3 w-4 h-4 rounded-full border-2 border-amber-400/80 bg-[#0e2b18] shadow-inner" />

        {/* Silkscreen Branding */}
        <div className="flex justify-between items-start mb-3 border-b border-emerald-500/20 pb-2">
          <div>
            <div className="text-[14px] font-extrabold tracking-widest text-emerald-300 font-mono drop-shadow">
              DT-COMBO AVR-51
            </div>
            <div className="text-[9px] font-mono tracking-wider text-emerald-400/70 uppercase">
              INNOVATIVE ELECTRONICS • STARTER KIT SYSTEM
            </div>
          </div>

          {/* Power Switch & Power LED */}
          <div className="flex items-center gap-3 bg-black/30 px-3 py-1.5 rounded-lg border border-emerald-900/50">
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full border transition-all duration-200"
                style={{
                  backgroundColor: powerOn ? '#ef4444' : '#551111',
                  boxShadow: powerOn ? '0 0 8px #ef4444' : 'none',
                  borderColor: powerOn ? '#fca5a5' : '#772222',
                }}
              />
              <span className="text-[9px] font-mono text-gray-300">PWR</span>
            </div>

            <button
              onClick={() => setPowerOn(!powerOn)}
              className={`p-1 rounded flex items-center justify-center border transition-all ${
                powerOn
                  ? 'bg-red-950/60 border-red-700 text-red-300'
                  : 'bg-gray-800 border-gray-600 text-gray-400'
              }`}
              title="Toggle Board Power"
            >
              <Power className="w-3.5 h-3.5" />
            </button>

            {/* Hardware Reset Button */}
            <button
              onClick={onReset}
              className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800/80 border border-amber-600 text-amber-200 text-[10px] font-mono flex items-center gap-1 shadow active:scale-95 transition-all"
              title="Hardware Reset (SW_RST)"
            >
              <RotateCcw className="w-3 h-3" />
              RST
            </button>
          </div>
        </div>

        {/* Board Core Layout Grid */}
        <div className="grid grid-cols-12 gap-3 items-start">
          {/* LEFT COLUMN: Peripherals (LCD, LEDs, Switches) */}
          <div className="col-span-6 flex flex-col gap-3">
            {/* 8x2 Character LCD Module */}
            <div className="bg-black/30 p-2 rounded-lg border border-emerald-800/40 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-1 text-[9px] font-mono text-emerald-400/80 px-1">
                <span>PORT LCD (J25)</span>
                <span className="text-amber-300">MAPPED: PORT{wiring.lcdPort}</span>
              </div>
              <LcdDisplay lcd={lcd} colorScheme="green" />

              {/* Contrast and ADC Potentiometers */}
              <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-emerald-950">
                <div className="flex flex-col text-[9px] font-mono text-gray-300">
                  <div className="flex justify-between">
                    <span>VR2 (CONTRAST)</span>
                    <span className="text-emerald-400">{Math.round(lcd.contrast * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={lcd.contrast}
                    onChange={(e) => {
                      lcd.contrast = parseFloat(e.target.value);
                      mcu.notifyUi();
                    }}
                    className="w-full accent-emerald-500 h-1 bg-gray-700 rounded-lg cursor-pointer mt-1"
                  />
                </div>

                <div className="flex flex-col text-[9px] font-mono text-gray-300">
                  <div className="flex justify-between">
                    <span>VR1 (ADC PA0)</span>
                    <span className="text-emerald-400">{mcu.analogInputs[0].toFixed(2)}V</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5.0"
                    step="0.1"
                    value={mcu.analogInputs[0]}
                    onChange={(e) => {
                      mcu.analogInputs[0] = parseFloat(e.target.value);
                      mcu.notifyUi();
                    }}
                    className="w-full accent-emerald-500 h-1 bg-gray-700 rounded-lg cursor-pointer mt-1"
                  />
                </div>
              </div>
            </div>

            {/* 8 SMD LEDs Array */}
            <div className="bg-black/30 p-1.5 rounded-lg border border-emerald-800/40">
              <div className="flex justify-between items-center px-1 mb-1 text-[9px] font-mono text-emerald-400/80">
                <span>J22: 8 SMD LEDS</span>
                <span className="text-amber-300">MAPPED: PORT{wiring.ledPort}</span>
              </div>
              <LedArray
                value={mcu.getLedValues()}
                color="green"
                label={`LED OUTPUT (${wiring.ledPort === 'NONE' ? 'DISCONNECTED' : 'PORT' + wiring.ledPort})`}
              />
            </div>

            {/* 8 Tactile Switches Array */}
            <div className="bg-black/30 p-1.5 rounded-lg border border-emerald-800/40">
              <div className="flex justify-between items-center px-1 mb-1 text-[9px] font-mono text-emerald-400/80">
                <span>J23: 8 TACTILE SWITCHES</span>
                <span className="text-amber-300">MAPPED: PORT{wiring.switchPort}</span>
              </div>
              <SwitchArray
                value={mcu.externalSwitches}
                onChange={(idx, pressed) => mcu.setSwitch(idx, pressed)}
                label={`TACTILE INPUT (${wiring.switchPort === 'NONE' ? 'DISCONNECTED' : 'PORT' + wiring.switchPort})`}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Microcontroller Socket & Port Headers */}
          <div className="col-span-6 flex flex-col gap-2.5">
            {/* ATmega8535 40-Pin DIP Socket */}
            <div className="bg-[#121921] p-3 rounded-xl border-2 border-emerald-900/60 shadow-xl flex flex-col items-center relative">
              <div className="text-[10px] font-mono text-emerald-400 tracking-wider mb-2 flex items-center justify-between w-full">
                <span>U1: 40-PIN DIP SOCKET</span>
                <span className="text-gray-400 text-[9px]">ATmega8535-16PU</span>
              </div>

              {/* IC Package Graphic */}
              <div className="relative bg-[#1c222b] border border-gray-700/80 rounded px-6 py-3 w-[260px] shadow-2xl flex flex-col items-center">
                {/* IC Notch on Top (Pin 1 Indicator) */}
                <div className="w-5 h-2.5 bg-[#0e1318] border-b border-gray-600 rounded-b-full mb-1" />

                {/* IC Laser Inscription */}
                <div className="text-center font-mono select-none my-1">
                  <div className="text-[11px] font-bold text-gray-300 tracking-widest">
                    ATMEL
                  </div>
                  <div className="text-[12px] font-extrabold text-emerald-400 tracking-wider">
                    ATmega8535
                  </div>
                  <div className="text-[8px] text-gray-400 tracking-widest">
                    16PU 0824
                  </div>
                </div>

                {/* 40 Pins Simulation Visual Bars */}
                <div className="absolute top-0 bottom-0 left-[-8px] flex flex-col justify-between py-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-1 bg-gradient-to-r from-amber-200 to-amber-500 rounded-l-sm shadow-sm"
                      title={`Pin ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="absolute top-0 bottom-0 right-[-8px] flex flex-col justify-between py-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-1 bg-gradient-to-l from-amber-200 to-amber-500 rounded-r-sm shadow-sm"
                      title={`Pin ${40 - i}`}
                    />
                  ))}
                </div>
              </div>

              {/* Crystal Socket Component */}
              <div className="mt-3 flex items-center justify-between w-full bg-black/40 px-2.5 py-1.5 rounded border border-emerald-950">
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-mono text-gray-300">X1 (CRYSTAL SOCKET):</span>
                </div>
                <select
                  value={wiring.crystalMhz}
                  onChange={(e) => handleCrystalChange(parseFloat(e.target.value))}
                  className="bg-[#1a232f] text-emerald-300 border border-emerald-700/60 rounded px-1.5 py-0.5 text-[10px] font-mono cursor-pointer outline-none"
                >
                  <option value={4.0}>4.000 MHz (Default)</option>
                  <option value={8.0}>8.000 MHz</option>
                  <option value={11.0592}>11.0592 MHz (Serial Baud)</option>
                  <option value={12.0}>12.000 MHz</option>
                  <option value={16.0}>16.000 MHz</option>
                  <option value={0}>[None / Removed]</option>
                </select>
              </div>
            </div>

            {/* Port Headers Breakout Section (J7..J10) */}
            <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-900/40">
              <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider mb-2 flex justify-between">
                <span>10-PIN PORT HEADERS</span>
                <span className="text-gray-400">J7 (A) • J8 (B) • J9 (C) • J10 (D)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {/* PORT A Header */}
                <div className="bg-[#121922] p-1.5 rounded border border-gray-700/60">
                  <div className="flex justify-between items-center text-emerald-400 font-bold mb-1">
                    <span>J7: PORT A (ADC)</span>
                    <span className="text-[9px] text-gray-400">0x{mcu.cpu.data[0x3B].toString(16).padStart(2,'0').toUpperCase()}</span>
                  </div>
                  <div className="text-[8px] text-gray-400">Pins: PA0-PA7, VCC, GND</div>
                  <div className="text-[9px] mt-1 text-amber-300">
                    {wiring.switchPort === 'A' ? '➔ J23 SWITCHES' : wiring.lcdPort === 'A' ? '➔ J25 LCD' : wiring.ledPort === 'A' ? '➔ J22 LEDS' : 'Free / Breadboard'}
                  </div>
                </div>

                {/* PORT B Header */}
                <div className="bg-[#121922] p-1.5 rounded border border-gray-700/60">
                  <div className="flex justify-between items-center text-emerald-400 font-bold mb-1">
                    <span>J8: PORT B (SPI)</span>
                    <span className="text-[9px] text-gray-400">0x{mcu.cpu.data[0x38].toString(16).padStart(2,'0').toUpperCase()}</span>
                  </div>
                  <div className="text-[8px] text-gray-400">Pins: PB0-PB7, VCC, GND</div>
                  <div className="text-[9px] mt-1 text-amber-300">
                    {wiring.lcdPort === 'B' ? '➔ J25 LCD' : wiring.ledPort === 'B' ? '➔ J22 LEDS' : wiring.switchPort === 'B' ? '➔ J23 SWITCHES' : 'Free / Breadboard'}
                  </div>
                </div>

                {/* PORT C Header */}
                <div className="bg-[#121922] p-1.5 rounded border border-gray-700/60">
                  <div className="flex justify-between items-center text-emerald-400 font-bold mb-1">
                    <span>J9: PORT C (I/O)</span>
                    <span className="text-[9px] text-gray-400">0x{mcu.cpu.data[0x35].toString(16).padStart(2,'0').toUpperCase()}</span>
                  </div>
                  <div className="text-[8px] text-gray-400">Pins: PC0-PC7, VCC, GND</div>
                  <div className="text-[9px] mt-1 text-emerald-400 font-bold">
                    {wiring.ledPort === 'C' ? '➔ J22 LEDS' : wiring.switchPort === 'C' ? '➔ J23 SWITCHES' : wiring.lcdPort === 'C' ? '➔ J25 LCD' : 'Free / Breadboard'}
                  </div>
                </div>

                {/* PORT D Header */}
                <div className="bg-[#121922] p-1.5 rounded border border-gray-700/60">
                  <div className="flex justify-between items-center text-emerald-400 font-bold mb-1">
                    <span>J10: PORT D (UART)</span>
                    <span className="text-[9px] text-gray-400">0x{mcu.cpu.data[0x32].toString(16).padStart(2,'0').toUpperCase()}</span>
                  </div>
                  <div className="text-[8px] text-gray-400">PD0(RX), PD1(TX), PD2(INT0)</div>
                  <div className="text-[9px] mt-1 text-amber-300">
                    {wiring.ledPort === 'D' ? '➔ J22 LEDS' : wiring.switchPort === 'D' ? '➔ J23 SWITCHES' : wiring.lcdPort === 'D' ? '➔ J25 LCD' : '➔ COM1 Serial'}
                  </div>
                </div>
              </div>

              {/* Ribbon Jumper Routing Controls */}
              <div className="mt-2.5 pt-2 border-t border-emerald-950 flex flex-wrap gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">LEDs:</span>
                  <select
                    value={wiring.ledPort}
                    onChange={(e) => onWiringChange({ ...wiring, ledPort: e.target.value as any })}
                    className="bg-[#1c2430] text-emerald-300 rounded px-1 py-0.5 border border-gray-700"
                  >
                    <option value="C">PORTC (Default)</option>
                    <option value="B">PORTB</option>
                    <option value="A">PORTA</option>
                    <option value="D">PORTD</option>
                    <option value="NONE">Disconnected</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Switches:</span>
                  <select
                    value={wiring.switchPort}
                    onChange={(e) => onWiringChange({ ...wiring, switchPort: e.target.value as any })}
                    className="bg-[#1c2430] text-emerald-300 rounded px-1 py-0.5 border border-gray-700"
                  >
                    <option value="A">PORTA (Default)</option>
                    <option value="B">PORTB</option>
                    <option value="C">PORTC</option>
                    <option value="D">PORTD</option>
                    <option value="NONE">Disconnected</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-gray-400">LCD:</span>
                  <select
                    value={wiring.lcdPort}
                    onChange={(e) => {
                      const port = e.target.value as 'A' | 'B' | 'C' | 'D';
                      onWiringChange({
                        ...wiring,
                        lcdPort: port,
                        lcdPins: {
                          rs: { port, pin: 0 },
                          rw: { port, pin: 1 },
                          e:  { port, pin: 2 },
                          d4: { port, pin: 4 },
                          d5: { port, pin: 5 },
                          d6: { port, pin: 6 },
                          d7: { port, pin: 7 },
                        },
                      });
                    }}
                    className="bg-[#1c2430] text-emerald-300 rounded px-1 py-0.5 border border-gray-700"
                  >
                    <option value="B">PORTB (Default)</option>
                    <option value="A">PORTA</option>
                    <option value="C">PORTC</option>
                    <option value="D">PORTD</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
