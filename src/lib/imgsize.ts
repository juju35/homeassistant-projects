// Width and height of the hot-linked screenshots, read at build time from the first bytes of each file,
// so pages reserve their space (no layout shift) and very tall captures can be framed differently.
export interface Size {
  w: number;
  h: number;
}

const cache = new Map<string, Promise<Size | null>>();

export function imageSize(url: string): Promise<Size | null> {
  if (!cache.has(url)) cache.set(url, probe(url));
  return cache.get(url)!;
}

async function probe(url: string): Promise<Size | null> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-65535" } });
    if (!res.ok) return null;
    return parse(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

function parse(b: Uint8Array): Size | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  // PNG: IHDR right after the signature
  if (b[0] === 0x89 && b[1] === 0x50) return { w: dv.getUint32(16), h: dv.getUint32(20) };
  // GIF: logical screen size
  if (b[0] === 0x47 && b[1] === 0x49) return { w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
  // WebP
  if (b[0] === 0x52 && b[8] === 0x57) {
    const kind = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (kind === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (kind === "VP8 ") return { w: dv.getUint16(26, true) & 0x3fff, h: dv.getUint16(28, true) & 0x3fff };
    if (kind === "VP8L") {
      const n = dv.getUint32(21, true);
      return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
    }
  }
  // JPEG: walk the segments to the first SOFn
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      const len = dv.getUint16(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: dv.getUint16(i + 7), h: dv.getUint16(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}
