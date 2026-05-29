export type StoreZipEntry = {
  filename: string;
  data: Uint8Array;
};

const ZIP_VERSION_NEEDED = 20;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;
const DOS_TIME = 0;
const DOS_DATE = ((2024 - 1980) << 9) | (1 << 5) | 1;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;

let crcTable: Uint32Array | null = null;

export function createStoreZip(entries: StoreZipEntry[]) {
  if (entries.length > MAX_UINT16) {
    throw new Error("ZIP 文件数量超过上限");
  }

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filename = safeZipEntryFilename(entry.filename);
    const filenameBytes = new TextEncoder().encode(filename);
    const data = entry.data;
    assertZipPartSize(filenameBytes.length, "ZIP 文件名过长");
    assertZipPartSize(data.length, "ZIP 图片过大");
    assertZipPartSize(offset, "ZIP 文件过大");

    const checksum = crc32(data);
    const localHeader = buildLocalHeader(filenameBytes, data, checksum);
    const centralHeader = buildCentralHeader(filenameBytes, data, checksum, offset);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  assertZipPartSize(centralDirectory.length, "ZIP 文件过大");
  assertZipPartSize(offset, "ZIP 文件过大");

  const endRecord = buildEndRecord(entries.length, centralDirectory.length, offset);
  return concatUint8Arrays([...localParts, centralDirectory, endRecord]);
}

function buildLocalHeader(filenameBytes: Uint8Array, data: Uint8Array, checksum: number) {
  const header = new Uint8Array(30 + filenameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, ZIP_VERSION_NEEDED, true);
  view.setUint16(6, ZIP_UTF8_FLAG, true);
  view.setUint16(8, ZIP_STORE_METHOD, true);
  view.setUint16(10, DOS_TIME, true);
  view.setUint16(12, DOS_DATE, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, filenameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(filenameBytes, 30);
  return header;
}

function buildCentralHeader(filenameBytes: Uint8Array, data: Uint8Array, checksum: number, offset: number) {
  const header = new Uint8Array(46 + filenameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, ZIP_VERSION_NEEDED, true);
  view.setUint16(6, ZIP_VERSION_NEEDED, true);
  view.setUint16(8, ZIP_UTF8_FLAG, true);
  view.setUint16(10, ZIP_STORE_METHOD, true);
  view.setUint16(12, DOS_TIME, true);
  view.setUint16(14, DOS_DATE, true);
  view.setUint32(16, checksum, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, filenameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  header.set(filenameBytes, 46);
  return header;
}

function buildEndRecord(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return header;
}

function safeZipEntryFilename(value: string) {
  const sanitized = value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[^\w.-]+/g, "-")
    .slice(0, 120);
  return sanitized || "image.jpg";
}

function assertZipPartSize(value: number, message: string) {
  if (value > MAX_UINT32) {
    throw new Error(message);
  }
}

function concatUint8Arrays(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function crc32(data: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getCrcTable() {
  if (crcTable) return crcTable;

  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  crcTable = table;
  return table;
}
