/**
 * HD44780-compatible Character LCD Controller Emulation (8x2 display)
 * Supports 4-bit and 8-bit modes, DDRAM/CGRAM addressing, cursor, clear, custom characters.
 */

export interface HD44780State {
  lines: string[];           // 2 lines of 8 characters
  rawDdram: Uint8Array;      // 80 bytes of DDRAM
  cgram: Uint8Array;         // 64 bytes of CGRAM (8 characters x 8 rows)
  cursorRow: number;         // 0 or 1
  cursorCol: number;         // 0 to 7
  displayOn: boolean;
  cursorOn: boolean;
  blinkOn: boolean;
  is4BitMode: boolean;
  initialized: boolean;
  contrast: number;          // 0.0 to 1.0
  backlight: boolean;
}

export class HD44780 {
  public cols = 8;
  public rows = 2;

  // Memory
  private ddram = new Uint8Array(80);
  private cgram = new Uint8Array(64);

  // Address Counter
  private addressCounter = 0;
  private isCgramAddress = false;

  // Control registers
  private displayOn = true;
  private cursorOn = false;
  private blinkOn = false;
  private increment = true;
  private shiftDisplay = false;
  private is4BitMode = true; // default 4-bit mode used in most labs
  private initialized = false;

  // 4-bit transfer assembly
  private highNibble: number | null = null;

  // Pin state tracking for edge detection
  private lastE = 0;

  // Contrast & Backlight
  public contrast = 0.85;
  public backlight = true;

  // Change listener
  private listeners: Array<() => void> = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.ddram.fill(0x20); // ASCII space
    this.cgram.fill(0x00);
    this.addressCounter = 0;
    this.isCgramAddress = false;
    this.displayOn = true;
    this.cursorOn = false;
    this.blinkOn = false;
    this.increment = true;
    this.shiftDisplay = false;
    this.is4BitMode = true;
    this.highNibble = null;
    this.lastE = 0;
    this.initialized = false;
    this.notify();
  }

  public addListener(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb();
    }
  }

  /**
   * Process pin states from the microcontroller:
   * rs: Register Select (0 = instruction, 1 = data)
   * rw: Read/Write (0 = write, 1 = read)
   * e: Enable (latches on falling edge 1 -> 0)
   * data: Data byte or nibble (D0-D7 or D4-D7)
   */
  public updatePins(rs: number, rw: number, e: number, data: number) {
    // Detect falling edge of E (Enable)
    const fallingEdge = this.lastE === 1 && e === 0;
    this.lastE = e;

    if (!fallingEdge) {
      return;
    }

    if (rw === 1) {
      // Read mode (Busy flag / data read) - not typically driving the LCD
      return;
    }

    if (this.is4BitMode) {
      // In 4-bit mode, only D4-D7 are used.
      const nibble = (data >> 4) & 0x0f;

      // Special handling before 4-bit mode is locked:
      // Function set 0x20 or 0x30 can be sent as single 4-bit pulse
      if (!this.initialized && this.highNibble === null) {
        if (nibble === 0x02) {
          // Function set: 4-bit mode command
          this.is4BitMode = true;
          this.initialized = true;
          this.notify();
          return;
        } else if (nibble === 0x03) {
          // 8-bit init wake-up pulse
          return;
        }
      }

      if (this.highNibble === null) {
        this.highNibble = nibble;
      } else {
        const fullByte = (this.highNibble << 4) | nibble;
        this.highNibble = null;
        this.handleByte(rs === 1, fullByte);
      }
    } else {
      // 8-bit mode: full byte latched at once
      this.handleByte(rs === 1, data & 0xff);
    }
  }

  private handleByte(isData: boolean, byte: number) {
    if (isData) {
      this.writeData(byte);
    } else {
      this.executeCommand(byte);
    }
    this.notify();
  }

  private executeCommand(cmd: number) {
    // 1. Clear display: 0x01
    if (cmd === 0x01) {
      this.ddram.fill(0x20);
      this.addressCounter = 0;
      this.isCgramAddress = false;
      return;
    }

    // 2. Return home: 0x02 or 0x03
    if ((cmd & 0xfe) === 0x02) {
      this.addressCounter = 0;
      this.isCgramAddress = false;
      return;
    }

    // 3. Entry mode set: 0000 01(I/D)(S)
    if ((cmd & 0xfc) === 0x04) {
      this.increment = (cmd & 0x02) !== 0;
      this.shiftDisplay = (cmd & 0x01) !== 0;
      return;
    }

    // 4. Display on/off control: 0000 1(D)(C)(B)
    if ((cmd & 0xf8) === 0x08) {
      this.displayOn = (cmd & 0x04) !== 0;
      this.cursorOn = (cmd & 0x02) !== 0;
      this.blinkOn = (cmd & 0x01) !== 0;
      return;
    }

    // 5. Cursor/Display shift: 0001 (S/C)(R/L) xx
    if ((cmd & 0xf0) === 0x10) {
      const isShift = (cmd & 0x08) !== 0;
      const right = (cmd & 0x04) !== 0;
      if (!isShift) {
        // Move cursor
        if (right) {
          this.addressCounter = (this.addressCounter + 1) & 0x7f;
        } else {
          this.addressCounter = (this.addressCounter - 1) & 0x7f;
        }
      }
      return;
    }

    // 6. Function set: 001(DL) (N)(F) xx
    if ((cmd & 0xe0) === 0x20) {
      const dl = (cmd & 0x10) !== 0; // 1 = 8 bit, 0 = 4 bit
      this.is4BitMode = !dl;
      this.initialized = true;
      return;
    }

    // 7. Set CGRAM address: 01(ACG5..ACG0)
    if ((cmd & 0xc0) === 0x40) {
      this.addressCounter = cmd & 0x3f;
      this.isCgramAddress = true;
      return;
    }

    // 8. Set DDRAM address: 1(ADD6..ADD0)
    if ((cmd & 0x80) === 0x80) {
      this.addressCounter = cmd & 0x7f;
      this.isCgramAddress = false;
      return;
    }
  }

  private writeData(byte: number) {
    if (this.isCgramAddress) {
      if (this.addressCounter < 64) {
        this.cgram[this.addressCounter] = byte;
      }
    } else {
      if (this.addressCounter < 80) {
        this.ddram[this.addressCounter] = byte;
      }
    }

    // Auto-advance address counter
    if (this.increment) {
      this.addressCounter = (this.addressCounter + 1) & (this.isCgramAddress ? 0x3f : 0x7f);
    } else {
      this.addressCounter = (this.addressCounter - 1) & (this.isCgramAddress ? 0x3f : 0x7f);
    }
  }

  /**
   * Get the current rendered 2 lines (8 characters each) and cursor status.
   */
  public getState(): HD44780State {
    const line1Chars: string[] = [];
    const line2Chars: string[] = [];

    // Line 1: DDRAM 0x00 to 0x07
    for (let col = 0; col < 8; col++) {
      const code = this.ddram[0x00 + col] || 0x20;
      line1Chars.push(code >= 32 && code <= 126 ? String.fromCharCode(code) : (code === 0x20 ? ' ' : '•'));
    }

    // Line 2: DDRAM 0x40 to 0x47
    for (let col = 0; col < 8; col++) {
      const code = this.ddram[0x40 + col] || 0x20;
      line2Chars.push(code >= 32 && code <= 126 ? String.fromCharCode(code) : (code === 0x20 ? ' ' : '•'));
    }

    // Calculate cursor position in 8x2 grid
    let curRow = -1;
    let curCol = -1;
    if (!this.isCgramAddress) {
      if (this.addressCounter >= 0x00 && this.addressCounter < 0x08) {
        curRow = 0;
        curCol = this.addressCounter;
      } else if (this.addressCounter >= 0x40 && this.addressCounter < 0x48) {
        curRow = 1;
        curCol = this.addressCounter - 0x40;
      }
    }

    return {
      lines: [line1Chars.join(''), line2Chars.join('')],
      rawDdram: new Uint8Array(this.ddram),
      cgram: new Uint8Array(this.cgram),
      cursorRow: curRow,
      cursorCol: curCol,
      displayOn: this.displayOn,
      cursorOn: this.cursorOn,
      blinkOn: this.blinkOn,
      is4BitMode: this.is4BitMode,
      initialized: this.initialized,
      contrast: this.contrast,
      backlight: this.backlight,
    };
  }
}
