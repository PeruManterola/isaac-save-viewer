// A minimal PNG decoder and encoder, so that the data scripts can validate and crop icons without
// extra dependencies. It supports every non-interlaced PNG format (16-bit samples are reduced to 8
// bits), which covers every icon used by this project.

/* eslint-disable no-bitwise */

// cspell:words scanline IDAT IHDR IEND PLTE tRNS paeth

import { crc32, deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

interface RGBAImage {
  readonly width: number;
  readonly height: number;
  /** 4 bytes per pixel, row by row. */
  readonly data: Uint8Array;
}

const ColorType = {
  GRAYSCALE: 0,
  RGB: 2,
  PALETTE: 3,
  GRAYSCALE_ALPHA: 4,
  RGBA: 6,
} as const;

const CHANNELS: ReadonlyMap<number, number> = new Map([
  [ColorType.GRAYSCALE, 1],
  [ColorType.RGB, 3],
  [ColorType.PALETTE, 1],
  [ColorType.GRAYSCALE_ALPHA, 2],
  [ColorType.RGBA, 4],
]);

const VALID_BIT_DEPTHS: ReadonlyMap<number, readonly number[]> = new Map([
  [ColorType.GRAYSCALE, [1, 2, 4, 8, 16]],
  [ColorType.RGB, [8, 16]],
  [ColorType.PALETTE, [1, 2, 4, 8]],
  [ColorType.GRAYSCALE_ALPHA, [8, 16]],
  [ColorType.RGBA, [8, 16]],
]);

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

/** Decodes a PNG file. Throws an error if the file is not a valid, supported PNG. */
export function decodePNG(buffer: Buffer): RGBAImage {
  if (
    buffer.length < PNG_SIGNATURE.length
    || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)
  ) {
    throw new Error("Not a PNG file.");
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  let palette: Buffer | undefined;
  let transparency: Buffer | undefined;
  const idatChunks: Buffer[] = [];
  let sawEnd = false;

  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) {
      throw new Error(`Truncated PNG chunk: ${type}`);
    }
    const data = buffer.subarray(dataStart, dataEnd);
    const expectedCRC = buffer.readUInt32BE(dataEnd);
    if (crc32(buffer.subarray(offset + 4, dataEnd)) !== expectedCRC) {
      throw new Error(`Bad CRC in PNG chunk: ${type}`);
    }

    switch (type) {
      case "IHDR": {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data.readUInt8(8);
        colorType = data.readUInt8(9);
        interlace = data.readUInt8(12);
        break;
      }

      case "PLTE": {
        palette = data;
        break;
      }

      case "tRNS": {
        transparency = data;
        break;
      }

      case "IDAT": {
        idatChunks.push(data);
        break;
      }

      case "IEND": {
        sawEnd = true;
        break;
      }

      default: {
        break;
      }
    }

    offset = dataEnd + 4;
    if (sawEnd) {
      break;
    }
  }

  if (!sawEnd) {
    throw new Error("PNG has no IEND chunk.");
  }
  if (width === 0 || height === 0) {
    throw new Error("PNG has no valid IHDR chunk.");
  }
  const channels = CHANNELS.get(colorType);
  const validBitDepths = VALID_BIT_DEPTHS.get(colorType) ?? [];
  if (
    interlace !== 0
    || channels === undefined
    || !validBitDepths.includes(bitDepth)
  ) {
    throw new Error(
      `Unsupported PNG format: bit depth ${bitDepth}, color type ${colorType}, interlace ${interlace}.`,
    );
  }
  if (colorType === ColorType.PALETTE && palette === undefined) {
    throw new Error("Palette PNG has no PLTE chunk.");
  }

  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = Math.ceil((width * channels * bitDepth) / 8);
  const bytesPerPixel = Math.max(1, (channels * bitDepth) / 8);
  if (raw.length !== height * (stride + 1)) {
    throw new Error("PNG image data has the wrong size.");
  }

  // Undo the scanline filters.
  const bytes = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const value = raw[rowStart + x] ?? 0;
      const left =
        x >= bytesPerPixel ? (bytes[y * stride + x - bytesPerPixel] ?? 0) : 0;
      const up = y > 0 ? (bytes[(y - 1) * stride + x] ?? 0) : 0;
      const upLeft =
        x >= bytesPerPixel && y > 0
          ? (bytes[(y - 1) * stride + x - bytesPerPixel] ?? 0)
          : 0;

      let predictor: number;
      switch (filter) {
        case 0: {
          predictor = 0;
          break;
        }

        case 1: {
          predictor = left;
          break;
        }

        case 2: {
          predictor = up;
          break;
        }

        case 3: {
          predictor = Math.floor((left + up) / 2);
          break;
        }

        case 4: {
          predictor = paeth(left, up, upLeft);
          break;
        }

        default: {
          throw new Error(`Unknown PNG filter type: ${filter}`);
        }
      }
      bytes[y * stride + x] = (value + predictor) & 0xff;
    }
  }

  /** Returns a sample, scaled to 8 bits (or the raw index for palette images). */
  const getSample = (x: number, y: number, channel: number): number => {
    const sampleIndex = x * channels + channel;
    if (bitDepth === 16) {
      return bytes[y * stride + sampleIndex * 2] ?? 0;
    }
    if (bitDepth === 8) {
      return bytes[y * stride + sampleIndex] ?? 0;
    }
    const bitOffset = sampleIndex * bitDepth;
    const byte = bytes[y * stride + Math.floor(bitOffset / 8)] ?? 0;
    const shift = 8 - bitDepth - (bitOffset % 8);
    const sample = (byte >> shift) & ((1 << bitDepth) - 1);
    return colorType === ColorType.PALETTE
      ? sample
      : Math.round((sample * 255) / ((1 << bitDepth) - 1));
  };

  // Convert to RGBA.
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4;
      const s0 = getSample(x, y, 0);
      switch (colorType) {
        case ColorType.GRAYSCALE: {
          data.set([s0, s0, s0, 255], target);
          break;
        }

        case ColorType.RGB: {
          data.set([s0, getSample(x, y, 1), getSample(x, y, 2), 255], target);
          break;
        }

        case ColorType.PALETTE: {
          const entry = s0 * 3;
          if (palette === undefined || entry + 2 >= palette.length) {
            throw new Error("PNG palette index out of range.");
          }
          data.set(
            [
              palette[entry] ?? 0,
              palette[entry + 1] ?? 0,
              palette[entry + 2] ?? 0,
              transparency?.[s0] ?? 255,
            ],
            target,
          );
          break;
        }

        case ColorType.GRAYSCALE_ALPHA: {
          data.set([s0, s0, s0, getSample(x, y, 1)], target);
          break;
        }

        default: {
          data.set(
            [s0, getSample(x, y, 1), getSample(x, y, 2), getSample(x, y, 3)],
            target,
          );
          break;
        }
      }
    }
  }

  return { width, height, data };
}

function makeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes an RGBA image as a PNG file. */
export function encodePNG(image: RGBAImage): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header.writeUInt8(8, 8); // Bit depth
  header.writeUInt8(ColorType.RGBA, 9);
  header.writeUInt8(0, 10); // Compression
  header.writeUInt8(0, 11); // Filter
  header.writeUInt8(0, 12); // Interlace

  const stride = image.width * 4;
  const raw = Buffer.alloc(image.height * (stride + 1));
  for (let y = 0; y < image.height; y++) {
    raw[y * (stride + 1)] = 0; // Filter type "None"
    raw.set(
      image.data.subarray(y * stride, (y + 1) * stride),
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", header),
    makeChunk("IDAT", deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Returns a copy of a rectangular region of an image. */
export function cropImage(
  image: RGBAImage,
  x: number,
  y: number,
  width: number,
  height: number,
): RGBAImage {
  if (x < 0 || y < 0 || x + width > image.width || y + height > image.height) {
    throw new Error("Crop region is outside of the image.");
  }

  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const sourceStart = ((y + row) * image.width + x) * 4;
    data.set(
      image.data.subarray(sourceStart, sourceStart + width * 4),
      row * width * 4,
    );
  }

  return { width, height, data };
}
