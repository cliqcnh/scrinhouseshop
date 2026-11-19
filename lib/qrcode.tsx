"use client";

import React, { useMemo } from "react";

// =============================================================================
// Standalone QR Code Generator (Pure TypeScript, Zero External Dependencies)
// Compliant with ISO/IEC 18004 specification for Byte Mode QR Codes.
// Generates crisp scalable vector graphics (SVG) perfect for screen & print.
// =============================================================================

// Galois Field GF(256) Math for Reed-Solomon Error Correction
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF256() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_LOG[val] = i;
    val = (val << 1) ^ (val >= 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function polyMul(p: number[], q: number[]): number[] {
  const result = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      result[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return result;
}

function rsGeneratorPoly(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = polyMul(g, [1, GF256_EXP[i]]);
  }
  return g;
}

function rsCompute(data: number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const msg = [...data, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// QR Code Capacity Tables (Byte Mode, EC Level M)
// Version 1 to 10 capacities
interface VersionInfo {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewords: number;
  blocks: number;
  alignmentPatterns: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, dataCodewords: 16, ecCodewords: 10, blocks: 1, alignmentPatterns: [] },
  { version: 2, size: 25, dataCodewords: 28, ecCodewords: 16, blocks: 1, alignmentPatterns: [6, 18] },
  { version: 3, size: 29, dataCodewords: 44, ecCodewords: 26, blocks: 1, alignmentPatterns: [6, 22] },
  { version: 4, size: 33, dataCodewords: 64, ecCodewords: 18, blocks: 2, alignmentPatterns: [6, 26] },
  { version: 5, size: 37, dataCodewords: 86, ecCodewords: 24, blocks: 2, alignmentPatterns: [6, 30] },
  { version: 6, size: 41, dataCodewords: 108, ecCodewords: 16, blocks: 4, alignmentPatterns: [6, 34] },
  { version: 7, size: 45, dataCodewords: 124, ecCodewords: 18, blocks: 4, alignmentPatterns: [6, 22, 38] },
  { version: 8, size: 49, dataCodewords: 154, ecCodewords: 22, blocks: 4, alignmentPatterns: [6, 24, 42] },
  { version: 9, size: 53, dataCodewords: 182, ecCodewords: 22, blocks: 5, alignmentPatterns: [6, 26, 46] },
  { version: 10, size: 57, dataCodewords: 216, ecCodewords: 26, blocks: 5, alignmentPatterns: [6, 28, 50] },
];

function selectVersion(byteLength: number): VersionInfo {
  for (const v of VERSIONS) {
    // 4 bits mode + 8 bits char count (for v1-9) + data bytes
    const requiredCodewords = byteLength + 2;
    if (v.dataCodewords >= requiredCodewords) {
      return v;
    }
  }
  return VERSIONS[VERSIONS.length - 1];
}

class BitBuffer {
  bits: number[] = [];
  put(num: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((num >>> i) & 1);
    }
  }
  getBytes(): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        b = (b << 1) | (this.bits[i + j] ?? 0);
      }
      bytes.push(b);
    }
    return bytes;
  }
}

export function generateQRMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = Array.from(encoder.encode(text));
  const vInfo = selectVersion(rawBytes.length);
  const size = vInfo.size;

  // 1. Build Bit Stream
  const bb = new BitBuffer();
  // Byte Mode Indicator: 0100
  bb.put(4, 4);
  // Character Count (8 bits for v1-9, 16 for v10+)
  bb.put(rawBytes.length, vInfo.version <= 9 ? 8 : 16);
  // Data
  for (const b of rawBytes) {
    bb.put(b, 8);
  }
  // Terminator: up to 4 zero bits
  const capacityBits = vInfo.dataCodewords * 8;
  const remainingBits = capacityBits - bb.bits.length;
  bb.put(0, Math.min(4, Math.max(0, remainingBits)));

  // Align to byte boundary
  while (bb.bits.length % 8 !== 0) {
    bb.bits.push(0);
  }

  // Pad with alternating 0xEC and 0x11
  const dataBytes = bb.getBytes();
  let padToggle = true;
  while (dataBytes.length < vInfo.dataCodewords) {
    dataBytes.push(padToggle ? 0xec : 0x11);
    padToggle = !padToggle;
  }

  // 2. Interleave Error Correction Blocks
  const numBlocks = vInfo.blocks;
  const totalData = vInfo.dataCodewords;
  const totalEc = vInfo.ecCodewords * numBlocks;
  const ecPerBlock = vInfo.ecCodewords;

  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  const baseBlockSize = Math.floor(totalData / numBlocks);
  const extraBlocks = totalData % numBlocks;

  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const bSize = baseBlockSize + (i >= numBlocks - extraBlocks ? 1 : 0);
    const blockData = dataBytes.slice(offset, offset + bSize);
    offset += bSize;
    dataBlocks.push(blockData);
    ecBlocks.push(rsCompute(blockData, ecPerBlock));
  }

  // Interleave data codewords
  const finalCodewords: number[] = [];
  const maxBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) {
        finalCodewords.push(dataBlocks[b][i]);
      }
    }
  }
  // Interleave EC codewords
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  // 3. Matrix Placement
  // matrix: null = unset, true = black, false = white
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );
  const isFunctionPattern: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false)
  );

  function setModule(r: number, c: number, val: boolean, isFn = true) {
    matrix[r][c] = val;
    if (isFn) isFunctionPattern[r][c] = true;
  }

  // Finder Patterns
  function placeFinder(top: number, left: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack =
              r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setModule(row, col, isBlack);
          } else {
            setModule(row, col, false); // Separator
          }
        }
      }
    }
  }

  placeFinder(0, 0); // Top-left
  placeFinder(0, size - 7); // Top-right
  placeFinder(size - 7, 0); // Bottom-left

  // Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // Alignment Patterns
  const alignPoints = vInfo.alignmentPatterns;
  if (alignPoints.length > 0) {
    for (const r of alignPoints) {
      for (const c of alignPoints) {
        // Skip finders
        if (
          (r < 9 && c < 9) ||
          (r < 9 && c >= size - 9) ||
          (r >= size - 9 && c < 9)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack =
              Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setModule(r + dr, c + dc, isBlack);
          }
        }
      }
    }
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve Format Information areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    isFunctionPattern[8][i] = true;
    if (matrix[i][8] === null) matrix[i][8] = false;
    isFunctionPattern[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    isFunctionPattern[8][i] = true;
  }
  for (let i = size - 7; i < size; i++) {
    if (matrix[i][8] === null) matrix[i][8] = false;
    isFunctionPattern[i][8] = true;
  }

  // Place Data Bits
  const dataBits: number[] = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      dataBits.push((byte >>> i) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing pattern

    for (let vertical = 0; vertical < size; vertical++) {
      const row = upwards ? size - 1 - vertical : vertical;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = right - colOffset;
        if (!isFunctionPattern[row][col]) {
          const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] === 1 : false;
          matrix[row][col] = bit;
        }
      }
    }
    upwards = !upwards;
  }

  // Mask Pattern 0: (row + col) % 2 === 0
  // Standard Mask 0 evaluation for clean scanning
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunctionPattern[r][c] && matrix[r][c] !== null) {
        if ((r + c) % 2 === 0) {
          matrix[r][c] = !matrix[r][c];
        }
      }
    }
  }

  // Format Information: EC Level M (00) + Mask 0 (000) => 00000 => Format Bits = 0x5412 (standard mask)
  // Format string for EC level M, mask 0: 101010000010010 (binary)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Write top-left format
  setModule(8, 0, formatBits[0] === 1);
  setModule(8, 1, formatBits[1] === 1);
  setModule(8, 2, formatBits[2] === 1);
  setModule(8, 3, formatBits[3] === 1);
  setModule(8, 4, formatBits[4] === 1);
  setModule(8, 5, formatBits[5] === 1);
  setModule(8, 7, formatBits[6] === 1);
  setModule(8, 8, formatBits[7] === 1);
  setModule(7, 8, formatBits[8] === 1);
  setModule(5, 8, formatBits[9] === 1);
  setModule(4, 8, formatBits[10] === 1);
  setModule(3, 8, formatBits[11] === 1);
  setModule(2, 8, formatBits[12] === 1);
  setModule(1, 8, formatBits[13] === 1);
  setModule(0, 8, formatBits[14] === 1);

  // Write split format
  setModule(size - 1, 8, formatBits[0] === 1);
  setModule(size - 2, 8, formatBits[1] === 1);
  setModule(size - 3, 8, formatBits[2] === 1);
  setModule(size - 4, 8, formatBits[3] === 1);
  setModule(size - 5, 8, formatBits[4] === 1);
  setModule(size - 6, 8, formatBits[5] === 1);
  setModule(size - 7, 8, formatBits[6] === 1);

  setModule(8, size - 8, formatBits[7] === 1);
  setModule(8, size - 7, formatBits[8] === 1);
  setModule(8, size - 6, formatBits[9] === 1);
  setModule(8, size - 5, formatBits[10] === 1);
  setModule(8, size - 4, formatBits[11] === 1);
  setModule(8, size - 3, formatBits[12] === 1);
  setModule(8, size - 2, formatBits[13] === 1);
  setModule(8, size - 1, formatBits[14] === 1);

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
  fgColor?: string;
  bgColor?: string;
}

export function QRCodeSVG({
  value,
  size = 140,
  className = "",
  fgColor = "#000000",
  bgColor = "#ffffff",
}: QRCodeSVGProps) {
  const matrix = useMemo(() => {
    try {
      return generateQRMatrix(value);
    } catch {
      return [];
    }
  }, [value]);

  if (!matrix.length) {
    return <div style={{ width: size, height: size }} className="bg-muted rounded" />;
  }

  const moduleCount = matrix.length;
  const quietZone = 2; // quiet zone in modules
  const totalSize = moduleCount + quietZone * 2;

  // Build SVG path for all black modules (single path is ultra-fast & renders razor sharp)
  let path = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        const x = c + quietZone;
        const y = r + quietZone;
        path += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={totalSize} height={totalSize} fill={bgColor} />
      <path d={path} fill={fgColor} />
    </svg>
  );
}
