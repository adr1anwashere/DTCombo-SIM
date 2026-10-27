# DT-COMBO AVR-51 Starter Kit Simulator (ATmega8535)

A high-fidelity in-browser hardware simulator for the **DT-COMBO AVR-51 Starter Kit** (by Innovative Electronics) equipped with an **ATmega8535 (40-pin DIP)** microcontroller. Designed to replace Windows-only tools (**Microchip Studio** and **ProgISP**) natively on macOS (Apple Silicon) and modern browsers for university embedded systems practicum homework.

---

## 🌟 Key Features

### 1. Virtual DT-COMBO AVR-51 Starter Kit Board
* **PCB Aesthetic**: Authentic dark green solder mask with silkscreen lettering, component designations, and gold mounting pads.
* **Microcontroller (ATmega8535)**:
  * 40-pin DIP socket with realistic IC graphic and numbered pin readouts.
  * 8 KB Flash, 512 B SRAM, 512 B EEPROM.
  * Full register implementation: `PORTA`, `PORTB`, `PORTC`, `PORTD`, `DDRA-D`, `PINA-D`.
  * Timers (Timer0, Timer1, Timer2) with compare match & overflow interrupts.
  * 10-bit ADC (`PA0-PA7`) with live potentiometer `VR1`.
  * Hardware USART on `PD0` (RXD) and `PD1` (TXD).
* **Peripherals**:
  * **8 SMD LEDs (`J22`)**: Active-low configuration with realistic glowing effects.
  * **8 Tactile Push Buttons (`J23`)**: Active-low with internal pull-ups, momentary/latch modes, and keyboard shortcuts (`1` to `8`).
  * **8x2 Character LCD (`HD44780`)**: Connected via `J25` / `J24`, supporting both 4-bit and 8-bit modes, DDRAM, CGRAM custom characters, cursor blinking, display clear, and contrast potentiometer `VR2`.
  * **Swappable Crystal Oscillator (`X1`)**: Configurable to 4.0 MHz, 8.0 MHz, 11.0592 MHz, 12.0 MHz, 16.0 MHz, or empty (stops CPU like real hardware when external oscillator is selected in fuses).
  * **Interactive Jumper Routing**: Route ribbon cables for LEDs, Switches, and LCD to any port (`PORTA`, `PORTB`, `PORTC`, `PORTD`) with 1-click practicum presets.

### 2. Code Editor ("Microchip Studio" Workflow)
* Monaco Editor with C syntax highlighting, line numbers, and error markers.
* **Local Compiler Service**: Calls native `avr-gcc` (`-mmcu=atmega8535 -DF_CPU=<clock>`) and `avr-objcopy` to generate real Intel HEX machine code on Apple Silicon.
* **Starter Templates for Practicum**:
  1. *Praktikum 1.1: Port B Output (Blink LED at 1 MHz)*
  2. *Praktikum 1.2: Port C Input & Port B Output (Tactile Switches $\rightarrow$ LEDs)*
  3. *Praktikum 2.1: USART Receiver to Port B LEDs (Serial Terminal $\rightarrow$ Binary LED Output)*
  4. *Running LED Chaser (Knight Rider effect)*
  5. *8x2 Character LCD (HD44780 on PORTB in 4-bit mode)*
  6. *Timer0 Overflow Interrupt Counter*
  7. *ADC Potentiometer Reader (PA0 $\rightarrow$ PORTC LEDs)*
* **Build & Program**: 1-click build and flash workflow.
* Drag-and-drop or upload prebuilt `.hex` files (from Microchip Studio or CodeVisionAVR).

### 3. Programmer Panel ("ProgISP" Workflow)
* ProgISP-styled UI with chip selector (`ATmega8535`), Load Flash, Load EEPROM, Erase, Program, Verify, Read, and Auto operations.
* Animated progress bar with realistic log messages (`Signature: 0x1E 0x93 0x08`, `Erasing Chip... OK`, `Programming Flash... OK`).
* **Fuse & Lock Bit Editor**:
  * `LFUSE` (default `0xE1` for internal 1 MHz RC oscillator; `0xEE` for external crystal).
  * `HFUSE` (default `0xD9`).
  * Changing clock fuses directly controls the simulation execution speed.

### 4. Debugger & Serial Terminal
* Run, Pause, Single Step, and Reset controls.
* Accurate cycle counter, simulated time elapsed (`_delay_ms(1000)` takes 1 real second), and turbo multiplier (`1x`, `2x`, `5x`).
* **Register Inspector**: Live view of `SREG` flags (`I, T, H, S, V, N, Z, C`), Stack Pointer (`SP`), Program Counter (`PC`), I/O ports (`PORTx, DDRx, PINx`), Timers, ADC, and `R0-R31`.
* **SRAM Dump**: 512-byte hex and ASCII viewer (`0x0060 - 0x025F`).
* **AVR Disassembly**: Live disassembled flash code with current PC indicator and click-to-toggle breakpoints.
* **USART Serial Terminal**: Interactive console connected to `PD0`/`PD1` with configurable line endings (`Raw`, `CR`, `LF`, `CRLF`) and quick test byte buttons.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18+)
* **avr-gcc** and **avr-objcopy** (Included in Arduino IDE / Microchip XC8 / or install via Homebrew: `brew tap osx-cross/avr && brew install avr-gcc`)

### Installation & Launch

1. Clone the repository:
   ```bash
   git clone https://github.com/adr1anwashere/DTCombo-SIM.git
   cd "DTCombo-SIM"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the simulator and compiler backend:
   ```bash
   npm run dev
   ```

4. Open your browser at **[http://localhost:5173/](http://localhost:5173/)**.

---

## 📁 Project Architecture

```
DTCombo-SIM/
├── server/
│   └── index.cjs            # Express backend invoking avr-gcc and avr-objcopy
├── src/
│   ├── sim/
│   │   ├── atmega8535.ts    # ATmega8535 core CPU, registers, memory map, timers, ADC, USART
│   │   ├── hd44780.ts       # HD44780 8x2 LCD controller emulation (DDRAM/CGRAM)
│   │   ├── hexParser.ts     # Intel HEX parser
│   │   └── disassembler.ts  # AVR 8-bit RISC disassembler
│   ├── components/
│   │   ├── Board/
│   │   │   ├── BoardSvg.tsx       # Interactive DT-COMBO PCB layout & sockets
│   │   │   ├── LcdDisplay.tsx     # 8x2 Dot Matrix LCD display
│   │   │   ├── LedArray.tsx       # 8 SMD LEDs with active-low glow
│   │   │   └── SwitchArray.tsx    # 8 Tactile switches with shortcuts 1-8
│   │   ├── Editor/
│   │   │   ├── CodeEditor.tsx     # Microchip Studio Monaco C editor
│   │   │   └── templates.ts       # Practicum code templates
│   │   ├── Programmer/
│   │   │   ├── ProgIsp.tsx        # ProgISP panel with auto-programming
│   │   │   └── FuseEditorModal.tsx# LFUSE/HFUSE fuse editor
│   │   ├── Debugger/
│   │   │   ├── RegisterViewer.tsx # Live SREG, I/O, Timers, ADC, R0-R31
│   │   │   ├── SramViewer.tsx     # 512B SRAM hex & ASCII viewer
│   │   │   └── DisassemblyViewer.tsx # Flash disassembly with breakpoints
│   │   └── Terminal/
│   │       ├── SerialTerminal.tsx # USART serial terminal
│   │       └── OutputConsole.tsx  # Compiler output & error logs
│   ├── App.tsx
│   ├── index.css                  # Custom dark theme & PCB design tokens
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📜 License
MIT License. Created for microcontroller and embedded systems university practicum education.
