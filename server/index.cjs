const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Search paths for avr-gcc and avr-objcopy
function findToolchain() {
  const candidateDirs = [
    // Discovered on user's system:
    '/Users/adhi/Library/Arduino15/packages/arduino/tools/avr-gcc/7.3.0-atmel3.6.1-arduino7/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    path.join(os.homedir(), 'Library/Arduino15/packages/arduino/tools/avr-gcc/7.3.0-atmel3.6.1-arduino7/bin'),
  ];

  // Also check PATH
  const envPaths = (process.env.PATH || '').split(path.delimiter);
  const allDirs = [...candidateDirs, ...envPaths];

  let avrGccPath = null;
  let avrObjcopyPath = null;

  for (const dir of allDirs) {
    if (!dir) continue;
    const gccCandidate = path.join(dir, 'avr-gcc');
    const objcopyCandidate = path.join(dir, 'avr-objcopy');
    if (!avrGccPath && fs.existsSync(gccCandidate)) {
      avrGccPath = gccCandidate;
    }
    if (!avrObjcopyPath && fs.existsSync(objcopyCandidate)) {
      avrObjcopyPath = objcopyCandidate;
    }
    if (avrGccPath && avrObjcopyPath) break;
  }

  // Fallback check using which/command
  if (!avrGccPath) {
    try {
      avrGccPath = execSync('which avr-gcc', { encoding: 'utf8' }).trim();
    } catch (e) {}
  }
  if (!avrObjcopyPath) {
    try {
      avrObjcopyPath = execSync('which avr-objcopy', { encoding: 'utf8' }).trim();
    } catch (e) {}
  }

  return { avrGccPath, avrObjcopyPath };
}

let toolchain = findToolchain();

app.get('/api/status', (req, res) => {
  toolchain = findToolchain();
  if (toolchain.avrGccPath) {
    try {
      const versionOutput = execSync(`"${toolchain.avrGccPath}" --version`, { encoding: 'utf8' }).split('\n')[0];
      return res.json({
        ready: true,
        avrGccPath: toolchain.avrGccPath,
        avrObjcopyPath: toolchain.avrObjcopyPath,
        version: versionOutput,
        message: 'avr-gcc compiler is ready for ATmega8535',
      });
    } catch (err) {
      return res.json({
        ready: false,
        error: err.message,
        message: 'avr-gcc was found but failed to run',
      });
    }
  }

  res.json({
    ready: false,
    avrGccPath: null,
    message: 'avr-gcc not found on system. Install with: brew tap osx-cross/avr && brew install avr-gcc',
  });
});

app.post('/api/compile', (req, res) => {
  const { code, fCpu = 4000000, optimize = '2' } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'No C source code provided' });
  }

  toolchain = findToolchain();
  if (!toolchain.avrGccPath || !toolchain.avrObjcopyPath) {
    return res.status(503).json({
      success: false,
      error: 'Compiler backend unavailable',
      stderr: 'avr-gcc or avr-objcopy is not installed or not in PATH.\nInstall on macOS using: brew tap osx-cross/avr && brew install avr-gcc\nOr drag-and-drop a precompiled .hex file directly into the programmer.',
    });
  }

  // Create temporary compilation directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avr-build-'));
  const cFilePath = path.join(tempDir, 'main.c');
  const elfFilePath = path.join(tempDir, 'main.elf');
  const hexFilePath = path.join(tempDir, 'main.hex');

  try {
    fs.writeFileSync(cFilePath, code, 'utf8');

    // Build command: -mmcu=atmega8535 -DF_CPU=...
    const gccCmd = `"${toolchain.avrGccPath}" -mmcu=atmega8535 -DF_CPU=${fCpu}UL -O${optimize} -Wall -Wextra -std=gnu99 "${cFilePath}" -o "${elfFilePath}"`;
    const objcopyCmd = `"${toolchain.avrObjcopyPath}" -O ihex -R .eeprom "${elfFilePath}" "${hexFilePath}"`;

    exec(`${gccCmd} && ${objcopyCmd}`, { timeout: 15000 }, (error, stdout, stderr) => {
      try {
        if (error) {
          return res.json({
            success: false,
            error: error.message,
            stdout: stdout || '',
            stderr: stderr || error.message,
          });
        }

        if (!fs.existsSync(hexFilePath)) {
          return res.json({
            success: false,
            error: 'Compilation succeeded but .hex file was not generated',
            stdout: stdout || '',
            stderr: stderr || '',
          });
        }

        const hexContent = fs.readFileSync(hexFilePath, 'utf8');
        let codeSize = 0;
        try {
          const stat = fs.statSync(hexFilePath);
          codeSize = stat.size;
        } catch (e) {}

        return res.json({
          success: true,
          hex: hexContent,
          stdout: stdout || '',
          stderr: stderr || '',
          codeSize,
          fCpu,
        });
      } finally {
        // Cleanup temp files
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}
      }
    });
  } catch (err) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
    return res.status(500).json({
      success: false,
      error: err.message,
      stderr: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[AVR-Compiler-Backend] Running on http://localhost:${PORT}`);
  console.log(`[AVR-Compiler-Backend] avr-gcc: ${toolchain.avrGccPath || 'NOT FOUND'}`);
  console.log(`[AVR-Compiler-Backend] avr-objcopy: ${toolchain.avrObjcopyPath || 'NOT FOUND'}`);
});
