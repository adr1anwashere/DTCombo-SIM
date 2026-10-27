/**
 * AVR 8-bit RISC Disassembler
 * Converts 16-bit program memory words into human-readable assembly.
 */

export interface DisassembledInstruction {
  address: number;       // Word address (e.g. 0x0000)
  byteAddress: number;   // Byte address (e.g. 0x0000)
  opcode: number;        // 16-bit word
  opcodeHex: string;     // Hex representation
  mnemonic: string;      // e.g. "LDI", "OUT", "RJMP"
  operands: string;      // e.g. "r16, 0xFF"
  length: number;        // 1 or 2 words (for 32-bit instructions like JMP, CALL, LDS, STS)
  comment?: string;
}

export function disassembleInstruction(
  flash: Uint16Array,
  pc: number
): DisassembledInstruction {
  if (pc >= flash.length) {
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: 0,
      opcodeHex: '0000',
      mnemonic: 'NOP',
      operands: '',
      length: 1,
    };
  }

  const op = flash[pc];
  const opHex = op.toString(16).padStart(4, '0').toUpperCase();
  const nextOp = pc + 1 < flash.length ? flash[pc + 1] : 0;

  // NOP
  if (op === 0x0000) {
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'NOP', operands: '', length: 1 };
  }

  // RET
  if (op === 0x9508) {
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'RET', operands: '', length: 1 };
  }

  // RETI
  if (op === 0x9518) {
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'RETI', operands: '', length: 1 };
  }

  // SLEEP
  if (op === 0x9588) {
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'SLEEP', operands: '', length: 1 };
  }

  // WDR
  if (op === 0x95A8) {
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'WDR', operands: '', length: 1 };
  }

  // BREAK
  if (op === 0x9598) {
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'BREAK', operands: '', length: 1 };
  }

  // RJMP (1100 kkkk kkkk kkkk)
  if ((op & 0xf000) === 0xc000) {
    let offset = op & 0x0fff;
    if (offset >= 0x0800) offset -= 0x1000;
    const target = pc + 1 + offset;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'RJMP',
      operands: `.+${offset}  ; 0x${(target * 2).toString(16).padStart(4, '0')}`,
      length: 1,
    };
  }

  // RCALL (1101 kkkk kkkk kkkk)
  if ((op & 0xf000) === 0xd000) {
    let offset = op & 0x0fff;
    if (offset >= 0x0800) offset -= 0x1000;
    const target = pc + 1 + offset;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'RCALL',
      operands: `.+${offset}  ; 0x${(target * 2).toString(16).padStart(4, '0')}`,
      length: 1,
    };
  }

  // JMP (1001 010k kkkk 110k) - 32 bit
  if ((op & 0xfe0e) === 0x940c) {
    const k = (((op & 0x01f0) >> 3) | (op & 0x0001)) << 16 | nextOp;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: `${opHex} ${nextOp.toString(16).padStart(4, '0').toUpperCase()}`,
      mnemonic: 'JMP',
      operands: `0x${(k * 2).toString(16).padStart(4, '0')}`,
      length: 2,
    };
  }

  // CALL (1001 010k kkkk 111k) - 32 bit
  if ((op & 0xfe0e) === 0x940e) {
    const k = (((op & 0x01f0) >> 3) | (op & 0x0001)) << 16 | nextOp;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: `${opHex} ${nextOp.toString(16).padStart(4, '0').toUpperCase()}`,
      mnemonic: 'CALL',
      operands: `0x${(k * 2).toString(16).padStart(4, '0')}`,
      length: 2,
    };
  }

  // LDI (1110 KKKK dddd KKKK)
  if ((op & 0xf000) === 0xe000) {
    const d = 16 + ((op >> 4) & 0x0f);
    const k = ((op & 0x0f00) >> 4) | (op & 0x000f);
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'LDI',
      operands: `r${d}, 0x${k.toString(16).padStart(2, '0').toUpperCase()}`,
      length: 1,
    };
  }

  // OUT (1011 1AAd dddd AAAA)
  if ((op & 0xf800) === 0xb800) {
    const a = ((op & 0x0600) >> 5) | (op & 0x000f);
    const r = (op >> 4) & 0x1f;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'OUT',
      operands: `0x${a.toString(16).padStart(2, '0').toUpperCase()}, r${r}`,
      length: 1,
    };
  }

  // IN (1011 0AAd dddd AAAA)
  if ((op & 0xf800) === 0xb000) {
    const a = ((op & 0x0600) >> 5) | (op & 0x000f);
    const d = (op >> 4) & 0x1f;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'IN',
      operands: `r${d}, 0x${a.toString(16).padStart(2, '0').toUpperCase()}`,
      length: 1,
    };
  }

  // CBI (1001 1000 AAAA Abbb)
  if ((op & 0xff00) === 0x9800) {
    const a = (op >> 3) & 0x1f;
    const b = op & 0x07;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'CBI',
      operands: `0x${a.toString(16).padStart(2, '0')}, ${b}`,
      length: 1,
    };
  }

  // SBI (1001 1010 AAAA Abbb)
  if ((op & 0xff00) === 0x9a00) {
    const a = (op >> 3) & 0x1f;
    const b = op & 0x07;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'SBI',
      operands: `0x${a.toString(16).padStart(2, '0')}, ${b}`,
      length: 1,
    };
  }

  // SBIC (1001 1001 AAAA Abbb)
  if ((op & 0xff00) === 0x9900) {
    const a = (op >> 3) & 0x1f;
    const b = op & 0x07;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'SBIC',
      operands: `0x${a.toString(16).padStart(2, '0')}, ${b}`,
      length: 1,
    };
  }

  // SBIS (1001 1011 AAAA Abbb)
  if ((op & 0xff00) === 0x9b00) {
    const a = (op >> 3) & 0x1f;
    const b = op & 0x07;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic: 'SBIS',
      operands: `0x${a.toString(16).padStart(2, '0')}, ${b}`,
      length: 1,
    };
  }

  // Conditional Branch BRBS / BRBC (1111 00kk kkkk ksss / 1111 01kk kkkk ksss)
  if ((op & 0xfc00) === 0xf000 || (op & 0xfc00) === 0xf400) {
    const isSet = (op & 0x0400) === 0;
    const s = op & 0x07;
    let k = (op >> 3) & 0x7f;
    if (k >= 0x40) k -= 0x80;
    const target = pc + 1 + k;

    const branchNamesSet = ['BREQ', 'BRCS', 'BRMI', 'BRVS', 'BRLT', 'BRHS', 'BRTS', 'BRIE'];
    const branchNamesClr = ['BRNE', 'BRCC', 'BRPL', 'BRVC', 'BRGE', 'BRHC', 'BRTC', 'BRID'];
    const mnemonic = isSet ? branchNamesSet[s] : branchNamesClr[s];

    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: opHex,
      mnemonic,
      operands: `.+${k}  ; 0x${(target * 2).toString(16).padStart(4, '0')}`,
      length: 1,
    };
  }

  // PUSH (1001 001d dddd 1111)
  if ((op & 0xfe0f) === 0x920f) {
    const d = (op >> 4) & 0x1f;
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'PUSH', operands: `r${d}`, length: 1 };
  }

  // POP (1001 000d dddd 1111)
  if ((op & 0xfe0f) === 0x900f) {
    const d = (op >> 4) & 0x1f;
    return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'POP', operands: `r${d}`, length: 1 };
  }

  // Generic 2-register arithmetic (ADD, ADC, SUB, SBC, AND, OR, EOR, CP, CPC, MOV)
  const reg2 = (op & 0xfc00);
  const rd = (op >> 4) & 0x1f;
  const rr = ((op >> 5) & 0x10) | (op & 0x0f);

  if (reg2 === 0x0c00) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'ADD', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x1c00) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'ADC', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x1800) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'SUB', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x0800) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'SBC', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x2000) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'AND', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x2800) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'OR', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x2400) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'EOR', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x1400) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'CP', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x0400) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'CPC', operands: `r${rd}, r${rr}`, length: 1 };
  if (reg2 === 0x2c00) return { address: pc, byteAddress: pc * 2, opcode: op, opcodeHex: opHex, mnemonic: 'MOV', operands: `r${rd}, r${rr}`, length: 1 };

  // STS (1001 001d dddd 0000) - 32 bit
  if ((op & 0xfe0f) === 0x9200) {
    const d = (op >> 4) & 0x1f;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: `${opHex} ${nextOp.toString(16).padStart(4, '0').toUpperCase()}`,
      mnemonic: 'STS',
      operands: `0x${nextOp.toString(16).padStart(4, '0')}, r${d}`,
      length: 2,
    };
  }

  // LDS (1001 000d dddd 0000) - 32 bit
  if ((op & 0xfe0f) === 0x9000) {
    const d = (op >> 4) & 0x1f;
    return {
      address: pc,
      byteAddress: pc * 2,
      opcode: op,
      opcodeHex: `${opHex} ${nextOp.toString(16).padStart(4, '0').toUpperCase()}`,
      mnemonic: 'LDS',
      operands: `r${d}, 0x${nextOp.toString(16).padStart(4, '0')}`,
      length: 2,
    };
  }

  // Fallback raw word
  return {
    address: pc,
    byteAddress: pc * 2,
    opcode: op,
    opcodeHex: opHex,
    mnemonic: `.word`,
    operands: `0x${opHex}`,
    length: 1,
  };
}

export function disassembleRange(
  flash: Uint16Array,
  startWord: number = 0,
  maxInstructions: number = 200
): DisassembledInstruction[] {
  const result: DisassembledInstruction[] = [];
  let currentPc = startWord;

  while (currentPc < flash.length && result.length < maxInstructions) {
    const inst = disassembleInstruction(flash, currentPc);
    result.push(inst);
    currentPc += inst.length;
  }

  return result;
}
