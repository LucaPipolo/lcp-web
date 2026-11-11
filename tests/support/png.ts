/**
 * Reads a PNG's dimensions from its header, so a test can check an image was
 * drawn at the size it asked for without decoding it.
 *
 * @param png - The image.
 *
 * @returns Its width and height, in pixels.
 *
 * @throws When the bytes aren't a PNG.
 */
export function pngSize(png: Buffer): { height: number; width: number } {
  if (!png.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    throw new Error("Not a PNG")
  }

  return { height: png.readUInt32BE(20), width: png.readUInt32BE(16) }
}
