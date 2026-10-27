/**
 * ATmega8535 Microcontroller Simulation Engine
 * Based on the ATmega8535 datasheet and avr8js CPU core.
 */

import { CPU, avrInstruction, avrInterrupt } from 'avr8js';

// ATmega8535 Data Space Addresses (IO offset = +0x20)
export const IO_ADDR = {
  // Two-Wire Interface (TWI)
  TWBR: 0x20,
  TWSR: 0x21,
  TWAR: 0x22,
  TWDR: 0x23,

  // ADC
  ADCL: 0x24,
  ADCH: 0x25,
  ADCSRA: 0x26,
  ADMUX: 0x27,

  // Analog Comparator
  ACSR: 0x28,

  // USART
  UBRRL: 0x29,
  UCSRB: 0x2A,
  UCSRA: 0x2B,
  UDR: 0x2C,

  // SPI
  SPCR: 0x2D,
  SPSR: 0x2E,
  SPDR: 0x2F,

  // PORT D
  PIND: 0x30,
  DDRD: 0x31,
  PORTD: 0x32,

  // PORT C
  PINC: 0x33,
  DDRC: 0x34,
  PORTC: 0x35,

  // PORT B
  PINB: 0x36,
  DDRB: 0x37,
  PORTB: 0x38,

  // PORT A
  PINA: 0x39,
  DDRA: 0x3A,
  PORTA: 0x3B,

  // EEPROM
  EECR: 0x3C,
  EEDR: 0x3D,
  EEARL: 0x3E,
  EEARH: 0x3F,

  // USART Baud High / UCSRC (shared at 0x40 via URSEL bit)
  UBRRH: 0x40,
  UCSRC: 0x40,

  // Watchdog
  WDTCR: 0x41,

  // Timer 2
  ASSR: 0x42,
  OCR2: 0x43,
  TCNT2: 0x44,
  TCCR2: 0x45,

  // Timer 1
  ICR1L: 0x46,
  ICR1H: 0x47,
  OCR1BL: 0x48,
  OCR1BH: 0x49,
  OCR1AL: 0x4A,
  OCR1AH: 0x4B,
  TCNT1L: 0x4C,
  TCNT1H: 0x4D,
  TCCR1B: 0x4E,
  TCCR1A: 0x4F,

  // Special Function IO
  SFIOR: 0x50,
  OSCCAL: 0x51,

  // Timer 0
  TCNT0: 0x52,
  TCCR0: 0x53,

  // MCU Control
  MCUCSR: 0x54,
  MCUCR: 0x55,
  TWCR: 0x56,
  SPMCR: 0x57,

  // Interrupt Flags and Masks
  TIFR: 0x58,
  TIMSK: 0x59,
  GIFR: 0x5A,
  GICR: 0x5B,
  OCR0: 0x5C,

  // Stack Pointer
  SPL: 0x5D,
  SPH: 0x5E,

  // Status Register
  SREG: 0x5F,
};

// Interrupt Vector Word Addresses
export const VECTORS = {
  RESET: 0,
  INT0: 1,
  INT1: 2,
  TIMER2_COMP: 3,
  TIMER2_OVF: 4,
  TIMER1_CAPT: 5,
  TIMER1_COMPA: 6,
  TIMER1_COMPB: 7,
  TIMER1_OVF: 8,
  TIMER0_OVF: 9,
  SPI_STC: 10,
  USART_RX: 11,
  USART_UDRE: 12,
  USART_TX: 13,
  ADC: 14,
  EE_RDY: 15,
  ANA_COMP: 16,
  TWI: 17,
  INT2: 18,
  TIMER0_COMP: 19,
  SPM_RDY: 20,
};

export interface PortState {
  port: number; // Output register (PORTx)
  ddr: number;  // Direction register (DDRx)
  pin: number;  // Input register (PINx)
}

export interface Fuses {
  low: number;   // default 0xE1 (1 MHz internal RC)
  high: number;  // default 0xD9
  lock: number;  // default 0xFF
}

export interface BoardWiring {
  ledPort: 'A' | 'B' | 'C' | 'D' | 'NONE';
  switchPort: 'A' | 'B' | 'C' | 'D' | 'NONE';
  lcdPort: 'A' | 'B' | 'C' | 'D' | 'CUSTOM';
  // Pin mappings for LCD (defaults for 4-bit / J25 header)
  lcdPins: {
    rs: { port: 'A' | 'B' | 'C' | 'D'; pin: number };
    rw: { port: 'A' | 'B' | 'C' | 'D'; pin: number };
    e:  { port: 'A' | 'B' | 'C' | 'D'; pin: number };
    d4: { port: 'A' | 'B' | 'C' | 'D'; pin: number };
    d5: { port: 'A' | 'B' | 'C' | 'D'; pin: number };
    d6: { port: 'A' | 'B' | 'C' | 'D'; pin: number };
    d7: { port: 'A' | 'B' | 'C' | 'D'; pin: number };
  };
  crystalMhz: number; // 4.0, 8.0, 11.0592, 12.0, 16.0, 0 = None (socket empty)
}

export const DEFAULT_WIRING: BoardWiring = {
  ledPort: 'C',      // Default practicum: LEDs on PORTC (Active-Low)
  switchPort: 'A',   // Default practicum: Switches on PORTA (Active-Low)
  lcdPort: 'B',      // Default practicum: 4-bit LCD on PORTB
  lcdPins: {
    rs: { port: 'B', pin: 0 },
    rw: { port: 'B', pin: 1 },
    e:  { port: 'B', pin: 2 },
    d4: { port: 'B', pin: 4 },
    d5: { port: 'B', pin: 5 },
    d6: { port: 'B', pin: 6 },
    d7: { port: 'B', pin: 7 },
  },
  crystalMhz: 4.0,   // Default crystal: 4.000 MHz
};

export class ATmega8535 {
  public cpu: CPU;
  public flash: Uint16Array;
  public eeprom: Uint8Array = new Uint8Array(512);

  // Fuses
  public fuses: Fuses = {
    low: 0xE1,  // 1MHz internal RC default
    high: 0xD9,
    lock: 0xFF,
  };

  // Hardware Wiring
  public wiring: BoardWiring = { ...DEFAULT_WIRING };

  // External button inputs (active-low: bit 0 = pressed, bit 1 = unpressed)
  // 8 switches: 0xFF = all released, 0x00 = all pressed
  public externalSwitches = 0xFF;

  // External pin inputs (active-low or custom voltages)
  private externalPinLevels = {
    A: 0xFF,
    B: 0xFF,
    C: 0xFF,
    D: 0xFF,
  };

  // ADC analog channel voltages (0.0V to 5.0V)
  public analogInputs: number[] = [2.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

  // Serial Transmit buffer and Receive queue
  public serialTxCallback?: (char: string) => void;
  private serialRxQueue: number[] = [];

  // Warning callback for unimplemented peripherals
  public warningCallback?: (message: string) => void;

  // Running status
  public isRunning = false;
  public breakpoints: Set<number> = new Set();
  public turboMultiplier = 1;

  // Timers prescaler accumulators
  private timer0PrescalerCounter = 0;
  private timer1PrescalerCounter = 0;
  private timer2PrescalerCounter = 0;

  // Performance / timing tracking
  public targetClockFreq = 4000000; // Evaluated from fuses & crystal
  public actualFreq = 0;
  public totalCycles = 0;
  public simulatedTimeSec = 0;

  // Callbacks for UI updates
  private uiListeners: Array<() => void> = [];

  constructor() {
    this.flash = new Uint16Array(4096); // 8KB Flash (4096 16-bit words)
    this.cpu = new CPU(this.flash, 512); // 512 bytes SRAM
    this.setupMemoryHooks();
    this.reset();
  }

  public addUiListener(cb: () => void) {
    this.uiListeners.push(cb);
    return () => {
      this.uiListeners = this.uiListeners.filter(l => l !== cb);
    };
  }

  public notifyUi() {
    for (const cb of this.uiListeners) {
      cb();
    }
  }

  /**
   * Evaluates the active CPU clock frequency based on fuses and board crystal.
   */
  public evaluateClockFrequency(): { freq: number; source: string; running: boolean } {
    const cksel = this.fuses.low & 0x0F;

    if (cksel === 0x01) {
      return { freq: 1000000, source: 'Internal Calibrated RC (1.0 MHz)', running: true };
    } else if (cksel === 0x02) {
      return { freq: 2000000, source: 'Internal Calibrated RC (2.0 MHz)', running: true };
    } else if (cksel === 0x03) {
      return { freq: 4000000, source: 'Internal Calibrated RC (4.0 MHz)', running: true };
    } else if (cksel === 0x04) {
      return { freq: 8000000, source: 'Internal Calibrated RC (8.0 MHz)', running: true };
    } else if (cksel >= 0x0A) {
      // External Crystal Oscillator
      if (this.wiring.crystalMhz <= 0) {
        return { freq: 0, source: 'External Crystal (NO CRYSTAL IN SOCKET - HALTED)', running: false };
      }
      return {
        freq: Math.round(this.wiring.crystalMhz * 1000000),
        source: `External Crystal (${this.wiring.crystalMhz} MHz)`,
        running: true,
      };
    } else {
      return { freq: 1000000, source: 'External Clock / Low Freq Oscillator (1.0 MHz)', running: true };
    }
  }

  /**
   * Resets microcontroller CPU and all I/O registers to datasheet defaults.
   */
  public reset() {
    this.cpu.reset();
    this.cpu.pc = 0;
    this.cpu.cycles = 0;
    this.totalCycles = 0;
    this.simulatedTimeSec = 0;

    // Stack pointer default: top of SRAM (0x025F = 607)
    this.cpu.data[IO_ADDR.SPL] = 0x5F;
    this.cpu.data[IO_ADDR.SPH] = 0x02;

    // Default registers
    this.cpu.data[IO_ADDR.PORTA] = 0x00;
    this.cpu.data[IO_ADDR.DDRA]  = 0x00;
    this.cpu.data[IO_ADDR.PORTB] = 0x00;
    this.cpu.data[IO_ADDR.DDRB]  = 0x00;
    this.cpu.data[IO_ADDR.PORTC] = 0x00;
    this.cpu.data[IO_ADDR.DDRC]  = 0x00;
    this.cpu.data[IO_ADDR.PORTD] = 0x00;
    this.cpu.data[IO_ADDR.DDRD]  = 0x00;

    // USART Data Register Empty flag initially set
    this.cpu.data[IO_ADDR.UCSRA] = 0x20; // UDRE = 1

    // Clock evaluation
    const clk = this.evaluateClockFrequency();
    this.targetClockFreq = clk.freq;

    this.updatePins();
    this.notifyUi();
  }

  /**
   * Load machine code into Flash memory.
   */
  public loadFlash(words: Uint16Array) {
    this.flash.fill(0);
    this.flash.set(words);
    this.reset();
  }

  /**
   * Update internal PIN registers based on DDR, PORT, and external inputs.
   */
  public updatePins() {
    // Determine input pin levels for each port
    // PORT A
    const extA = (this.wiring.switchPort === 'A') ? this.externalSwitches : this.externalPinLevels.A;
    const ddrA = this.cpu.data[IO_ADDR.DDRA];
    const portA = this.cpu.data[IO_ADDR.PORTA];
    this.cpu.data[IO_ADDR.PINA] = (ddrA & portA) | (~ddrA & extA);

    // PORT B
    const extB = (this.wiring.switchPort === 'B') ? this.externalSwitches : this.externalPinLevels.B;
    const ddrB = this.cpu.data[IO_ADDR.DDRB];
    const portB = this.cpu.data[IO_ADDR.PORTB];
    this.cpu.data[IO_ADDR.PINB] = (ddrB & portB) | (~ddrB & extB);

    // PORT C
    const extC = (this.wiring.switchPort === 'C') ? this.externalSwitches : this.externalPinLevels.C;
    const ddrC = this.cpu.data[IO_ADDR.DDRC];
    const portC = this.cpu.data[IO_ADDR.PORTC];
    this.cpu.data[IO_ADDR.PINC] = (ddrC & portC) | (~ddrC & extC);

    // PORT D
    const extD = (this.wiring.switchPort === 'D') ? this.externalSwitches : this.externalPinLevels.D;
    const ddrD = this.cpu.data[IO_ADDR.DDRD];
    const portD = this.cpu.data[IO_ADDR.PORTD];
    this.cpu.data[IO_ADDR.PIND] = (ddrD & portD) | (~ddrD & extD);
  }

  /**
   * Set the state of an external push button (SW0..SW7).
   * active: true if button is pressed (logic 0), false if released (logic 1).
   */
  public setSwitch(index: number, pressed: boolean) {
    if (pressed) {
      this.externalSwitches &= ~(1 << index);
    } else {
      this.externalSwitches |= (1 << index);
    }
    this.updatePins();
    this.notifyUi();
  }

  /**
   * Get the logic level displayed on board LEDs (active-low: 0 = illuminated).
   */
  public getLedValues(): number {
    if (this.wiring.ledPort === 'A') return this.cpu.data[IO_ADDR.PORTA];
    if (this.wiring.ledPort === 'B') return this.cpu.data[IO_ADDR.PORTB];
    if (this.wiring.ledPort === 'C') return this.cpu.data[IO_ADDR.PORTC];
    if (this.wiring.ledPort === 'D') return this.cpu.data[IO_ADDR.PORTD];
    return 0xFF; // All off
  }

  /**
   * Reads a single pin logic level (0 or 1) from the specified port.
   */
  public getPin(port: 'A' | 'B' | 'C' | 'D', pin: number): number {
    const addr = IO_ADDR[`PORT${port}` as keyof typeof IO_ADDR];
    return (this.cpu.data[addr] >> pin) & 1;
  }

  /**
   * Queue a character into the USART receive buffer.
   */
  public receiveSerialByte(byte: number) {
    this.serialRxQueue.push(byte);
    this.checkUsartRx();
  }

  private checkUsartRx() {
    if (this.serialRxQueue.length > 0 && !(this.cpu.data[IO_ADDR.UCSRA] & 0x80)) {
      const byte = this.serialRxQueue.shift()!;
      this.cpu.data[IO_ADDR.UDR] = byte;
      this.cpu.data[IO_ADDR.UCSRA] |= 0x80; // Set RXC

      // Fire USART_RX interrupt if enabled
      if (this.cpu.data[IO_ADDR.UCSRB] & 0x80) {
        if (this.cpu.interruptsEnabled) {
          avrInterrupt(this.cpu, VECTORS.USART_RX);
        }
      }
    }
  }

  /**
   * Register read and write hooks for ATmega8535 specific registers.
   */
  private setupMemoryHooks() {
    // USART UDR Write hook
    this.cpu.writeHooks[IO_ADDR.UDR] = (val) => {
      this.cpu.data[IO_ADDR.UDR] = val;
      const char = String.fromCharCode(val);
      if (this.serialTxCallback) {
        this.serialTxCallback(char);
      }
      // Set TXC and UDRE
      this.cpu.data[IO_ADDR.UCSRA] |= 0x60; // UDRE | TXC

      // USART TX Interrupt
      if (this.cpu.data[IO_ADDR.UCSRB] & 0x40) {
        if (this.cpu.interruptsEnabled) {
          avrInterrupt(this.cpu, VECTORS.USART_TX);
        }
      }
      return true;
    };

    // USART UDR Read hook
    this.cpu.readHooks[IO_ADDR.UDR] = () => {
      this.cpu.data[IO_ADDR.UCSRA] &= ~0x80; // Clear RXC
      setTimeout(() => this.checkUsartRx(), 0);
      return this.cpu.data[IO_ADDR.UDR];
    };

    // ADC Start Conversion Hook (ADCSRA bit 6: ADSC)
    this.cpu.writeHooks[IO_ADDR.ADCSRA] = (val) => {
      this.cpu.data[IO_ADDR.ADCSRA] = val;
      if (val & 0x40) {
        // ADSC is set - simulate ADC conversion
        const channel = this.cpu.data[IO_ADDR.ADMUX] & 0x07;
        const voltage = this.analogInputs[channel] || 0.0;
        // 10-bit ADC result = (Vin * 1024) / 5.0
        const adcVal = Math.min(1023, Math.max(0, Math.round((voltage / 5.0) * 1023)));

        const adlar = (this.cpu.data[IO_ADDR.ADMUX] & 0x20) !== 0;
        if (adlar) {
          this.cpu.data[IO_ADDR.ADCL] = (adcVal << 6) & 0xC0;
          this.cpu.data[IO_ADDR.ADCH] = (adcVal >> 2) & 0xFF;
        } else {
          this.cpu.data[IO_ADDR.ADCL] = adcVal & 0xFF;
          this.cpu.data[IO_ADDR.ADCH] = (adcVal >> 8) & 0x03;
        }

        // Clear ADSC, set ADIF (Conversion complete)
        this.cpu.data[IO_ADDR.ADCSRA] = (this.cpu.data[IO_ADDR.ADCSRA] & ~0x40) | 0x10;

        // Fire ADC Interrupt if enabled
        if (val & 0x08) {
          if (this.cpu.interruptsEnabled) {
            avrInterrupt(this.cpu, VECTORS.ADC);
          }
        }
      }
      return true;
    };

    // Watch for unhandled I/O writes and warn user
    const handledIoAddresses = new Set(Object.values(IO_ADDR));
    for (let io = 0x20; io <= 0x5F; io++) {
      if (!handledIoAddresses.has(io)) {
        this.cpu.writeHooks[io] = (val, _oldVal, addr) => {
          this.cpu.data[addr] = val;
          if (this.warningCallback) {
            this.warningCallback(`CPU accessed unimplemented I/O register 0x${(addr - 0x20).toString(16).toUpperCase()} (Data space 0x${addr.toString(16).toUpperCase()}) at PC: 0x${(this.cpu.pc * 2).toString(16).toUpperCase()}`);
          }
          return true;
        };
      }
    }
  }

  /**
   * Advance timers by a given number of CPU clock cycles.
   */
  private stepTimers(cycles: number) {
    // 1. Timer0 (8-bit)
    const tccr0 = this.cpu.data[IO_ADDR.TCCR0];
    const cs0 = tccr0 & 0x07;
    const dividers0 = [0, 1, 8, 64, 256, 1024, 0, 0];
    const div0 = dividers0[cs0];

    if (div0 > 0) {
      this.timer0PrescalerCounter += cycles;
      while (this.timer0PrescalerCounter >= div0) {
        this.timer0PrescalerCounter -= div0;
        let tcnt0 = this.cpu.data[IO_ADDR.TCNT0];
        tcnt0 = (tcnt0 + 1) & 0xFF;
        this.cpu.data[IO_ADDR.TCNT0] = tcnt0;

        // Check Compare Match
        if (tcnt0 === this.cpu.data[IO_ADDR.OCR0]) {
          this.cpu.data[IO_ADDR.TIFR] |= 0x02; // Set OCF0
          if (this.cpu.data[IO_ADDR.TIMSK] & 0x02) {
            if (this.cpu.interruptsEnabled) avrInterrupt(this.cpu, VECTORS.TIMER0_COMP);
          }
        }

        // Check Overflow
        if (tcnt0 === 0) {
          this.cpu.data[IO_ADDR.TIFR] |= 0x01; // Set TOV0
          if (this.cpu.data[IO_ADDR.TIMSK] & 0x01) {
            if (this.cpu.interruptsEnabled) avrInterrupt(this.cpu, VECTORS.TIMER0_OVF);
          }
        }
      }
    }

    // 2. Timer1 (16-bit)
    const tccr1b = this.cpu.data[IO_ADDR.TCCR1B];
    const cs1 = tccr1b & 0x07;
    const dividers1 = [0, 1, 8, 64, 256, 1024, 0, 0];
    const div1 = dividers1[cs1];

    if (div1 > 0) {
      this.timer1PrescalerCounter += cycles;
      while (this.timer1PrescalerCounter >= div1) {
        this.timer1PrescalerCounter -= div1;
        let tcnt1 = (this.cpu.data[IO_ADDR.TCNT1H] << 8) | this.cpu.data[IO_ADDR.TCNT1L];
        tcnt1 = (tcnt1 + 1) & 0xFFFF;
        this.cpu.data[IO_ADDR.TCNT1L] = tcnt1 & 0xFF;
        this.cpu.data[IO_ADDR.TCNT1H] = (tcnt1 >> 8) & 0xFF;

        // Timer1 Overflow
        if (tcnt1 === 0) {
          this.cpu.data[IO_ADDR.TIFR] |= 0x04; // Set TOV1
          if (this.cpu.data[IO_ADDR.TIMSK] & 0x04) {
            if (this.cpu.interruptsEnabled) avrInterrupt(this.cpu, VECTORS.TIMER1_OVF);
          }
        }
      }
    }

    // 3. Timer2 (8-bit)
    const tccr2 = this.cpu.data[IO_ADDR.TCCR2];
    const cs2 = tccr2 & 0x07;
    const dividers2 = [0, 1, 8, 32, 64, 128, 256, 1024];
    const div2 = dividers2[cs2];

    if (div2 > 0) {
      this.timer2PrescalerCounter += cycles;
      while (this.timer2PrescalerCounter >= div2) {
        this.timer2PrescalerCounter -= div2;
        let tcnt2 = this.cpu.data[IO_ADDR.TCNT2];
        tcnt2 = (tcnt2 + 1) & 0xFF;
        this.cpu.data[IO_ADDR.TCNT2] = tcnt2;

        if (tcnt2 === this.cpu.data[IO_ADDR.OCR2]) {
          this.cpu.data[IO_ADDR.TIFR] |= 0x80; // Set OCF2
          if (this.cpu.data[IO_ADDR.TIMSK] & 0x80) {
            if (this.cpu.interruptsEnabled) avrInterrupt(this.cpu, VECTORS.TIMER2_COMP);
          }
        }

        if (tcnt2 === 0) {
          this.cpu.data[IO_ADDR.TIFR] |= 0x40; // Set TOV2
          if (this.cpu.data[IO_ADDR.TIMSK] & 0x40) {
            if (this.cpu.interruptsEnabled) avrInterrupt(this.cpu, VECTORS.TIMER2_OVF);
          }
        }
      }
    }
  }

  /**
   * Executes a single instruction step.
   */
  public step(): boolean {
    const clk = this.evaluateClockFrequency();
    if (!clk.running) {
      this.isRunning = false;
      return false;
    }

    const prevCycles = this.cpu.cycles;
    avrInstruction(this.cpu);
    const deltaCycles = this.cpu.cycles - prevCycles;

    this.totalCycles += deltaCycles;
    if (this.targetClockFreq > 0) {
      this.simulatedTimeSec += deltaCycles / this.targetClockFreq;
    }

    this.stepTimers(deltaCycles);
    this.updatePins();

    return true;
  }

  /**
   * Run the simulation in real time using requestAnimationFrame.
   */
  public start() {
    if (this.isRunning) return;

    const clk = this.evaluateClockFrequency();
    if (!clk.running) {
      if (this.warningCallback) {
        this.warningCallback(`Cannot start CPU: ${clk.source}`);
      }
      return;
    }

    this.targetClockFreq = clk.freq;
    this.isRunning = true;

    let lastTime = performance.now();
    let cycleCounter = 0;
    let freqTimer = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;

      const elapsedMs = Math.min(100, Math.max(1, currentTime - lastTime));
      lastTime = currentTime;

      // Target cycles for this elapsed time slice
      const targetCycles = Math.round((this.targetClockFreq * (elapsedMs / 1000)) * this.turboMultiplier);
      let executedCycles = 0;

      while (executedCycles < targetCycles && this.isRunning) {
        if (this.breakpoints.has(this.cpu.pc)) {
          this.isRunning = false;
          break;
        }

        const prev = this.cpu.cycles;
        avrInstruction(this.cpu);
        const step = this.cpu.cycles - prev;
        executedCycles += step;
        cycleCounter += step;

        this.totalCycles += step;
        this.simulatedTimeSec += step / this.targetClockFreq;
        this.stepTimers(step);
      }

      this.updatePins();

      // Calculate actual running frequency every 500ms
      if (currentTime - freqTimer >= 500) {
        this.actualFreq = Math.round((cycleCounter * 1000) / (currentTime - freqTimer));
        cycleCounter = 0;
        freqTimer = currentTime;
      }

      this.notifyUi();

      if (this.isRunning) {
        requestAnimationFrame(loop);
      }
    };

    requestAnimationFrame(loop);
  }

  public pause() {
    this.isRunning = false;
    this.notifyUi();
  }

  public toggleBreakpoint(address: number) {
    if (this.breakpoints.has(address)) {
      this.breakpoints.delete(address);
    } else {
      this.breakpoints.add(address);
    }
    this.notifyUi();
  }
}
