/**
 * Intel HEX file parser for ATmega flash / EEPROM memory.
 * Parses standard Intel HEX records (:LLAAAATTDD...CC)
 */

export interface HexRecord {
  byteCount: number;
  address: number;
  recordType: number;
  data: number[];
  checksum: number;
}

export interface ParsedHex {
  data: Uint8Array;
  startAddress: number;
  endAddress: number;
  byteLength: number;
}

export function parseHex(hexString: string, memorySize: number = 8192): ParsedHex {
  const data = new Uint8Array(memorySize);
  let baseAddress = 0;
  let minAddress = memorySize;
  let maxAddress = 0;
  let totalBytes = 0;

  const lines = hexString.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex].trim();
    if (!rawLine || !rawLine.startsWith(':')) {
      continue;
    }

    const byteCount = parseInt(rawLine.slice(1, 3), 16);
    const address = parseInt(rawLine.slice(3, 7), 16);
    const recordType = parseInt(rawLine.slice(7, 9), 16);

    if (isNaN(byteCount) || isNaN(address) || isNaN(recordType)) {
      continue;
    }

    // Verify line checksum
    let sum = 0;
    for (let i = 1; i < 9 + byteCount * 2 + 2; i += 2) {
      if (i + 2 <= rawLine.length) {
        sum += parseInt(rawLine.slice(i, i + 2), 16);
      }
    }
    if ((sum & 0xff) !== 0) {
      console.warn(`[hexParser] Checksum mismatch on line ${lineIndex + 1}`);
    }

    switch (recordType) {
      case 0x00: {
        // Data Record
        const targetAddress = baseAddress + address;
        for (let i = 0; i < byteCount; i++) {
          const byteVal = parseInt(rawLine.slice(9 + i * 2, 11 + i * 2), 16);
          const currentAddr = targetAddress + i;
          if (currentAddr < memorySize) {
            data[currentAddr] = byteVal;
            if (currentAddr < minAddress) minAddress = currentAddr;
            if (currentAddr > maxAddress) maxAddress = currentAddr;
            totalBytes++;
          }
        }
        break;
      }

      case 0x01: {
        // End Of File Record
        break;
      }

      case 0x02: {
        // Extended Segment Address Record
        const segment = parseInt(rawLine.slice(9, 13), 16);
        baseAddress = segment << 4;
        break;
      }

      case 0x04: {
        // Extended Linear Address Record
        const upper = parseInt(rawLine.slice(9, 13), 16);
        baseAddress = upper << 16;
        break;
      }

      default:
        // Ignore unsupported record types
        break;
    }
  }

  return {
    data,
    startAddress: minAddress < memorySize ? minAddress : 0,
    endAddress: maxAddress,
    byteLength: totalBytes,
  };
}

/**
 * Converts a byte array (Uint8Array) of Flash memory to a 16-bit word array (Uint16Array)
 * used by avr8js CPU.
 */
export function bytesToWords(bytes: Uint8Array): Uint16Array {
  const words = new Uint16Array(Math.ceil(bytes.length / 2));
  for (let i = 0; i < words.length; i++) {
    const low = bytes[i * 2] || 0;
    const high = bytes[i * 2 + 1] || 0;
    words[i] = (high << 8) | low;
  }
  return words;
}
