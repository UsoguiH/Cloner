import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';

export async function writeAssets(assetMap) {
  for (const entry of assetMap.values()) {
    await fsp.mkdir(path.dirname(entry.localPath), { recursive: true });
    await fsp.writeFile(entry.localPath, entry.body);
    delete entry.body; // free memory after write
  }
}

export function packageZip(srcDir, zipPath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(zipPath);
    const zip = archiver('zip', { zlib: { level: 9 } });
    out.on('close', resolve);
    zip.on('error', reject);
    zip.pipe(out);
    zip.directory(srcDir, false);
    zip.finalize();
  });
}
