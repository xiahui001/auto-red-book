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

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filename = safeZipEntryFilename(entry.filename);
    const filenameBytes = Buffer.from(filename, "utf8");
    const data = Buffer.from(entry.data);
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

  const centralDirectory = Buffer.concat(centralParts);
  assertZipPartSize(centralDirectory.length, "ZIP 文件过大");
  assertZipPartSize(offset, "ZIP 文件过大");

  const endRecord = buildEndRecord(entries.length, centralDirectory.length, offset);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function buildLocalHeader(filenameBytes: Buffer, data: Buffer, checksum: number) {
  const header = Buffer.alloc(30 + filenameBytes.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(ZIP_VERSION_NEEDED, 4);
  header.writeUInt16LE(ZIP_UTF8_FLAG, 6);
  header.writeUInt16LE(ZIP_STORE_METHOD, 8);
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(filenameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  filenameBytes.copy(header, 30);
  return header;
}

function buildCentralHeader(filenameBytes: Buffer, data: Buffer, checksum: number, offset: number) {
  const header = Buffer.alloc(46 + filenameBytes.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(ZIP_VERSION_NEEDED, 4);
  header.writeUInt16LE(ZIP_VERSION_NEEDED, 6);
  header.writeUInt16LE(ZIP_UTF8_FLAG, 8);
  header.writeUInt16LE(ZIP_STORE_METHOD, 10);
  header.writeUInt16LE(DOS_TIME, 12);
  header.writeUInt16LE(DOS_DATE, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(filenameBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  filenameBytes.copy(header, 46);
  return header;
}

function buildEndRecord(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);
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
