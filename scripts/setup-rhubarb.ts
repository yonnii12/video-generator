import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubReleaseResponse {
  tag_name: string;
  assets: GitHubReleaseAsset[];
}

const GITHUB_API_LATEST =
  'https://api.github.com/repos/DanielSWolf/rhubarb-lip-sync/releases/latest';
const FALLBACK_MACOS_URL =
  'https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-macOS.zip';

const BIN_DIR = path.resolve(process.cwd(), 'bin');
const TARGET_BINARY = path.join(BIN_DIR, 'rhubarb');

function findFileRecursive(dir: string, targetName: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === targetName) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, targetName);
      if (found) return found;
    }
  }
  return null;
}

async function resolveMacOsDownloadUrl(): Promise<{
  tag: string;
  url: string;
}> {
  try {
    const response = await fetch(GITHUB_API_LATEST, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'orchestrator-2d-remotion-setup',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API HTTP ${response.status}`);
    }

    const release = (await response.json()) as GitHubReleaseResponse;
    const macAsset = release.assets.find((asset) =>
      /macOS\.zip$|osx\.zip$/i.test(asset.name)
    );

    if (macAsset) {
      return {
        tag: release.tag_name,
        url: macAsset.browser_download_url,
      };
    }
  } catch (err) {
    console.warn(
      `⚠️ No se pudo consultar GitHub Releases API (${(err as Error).message}). Usando URL oficial v1.13.0 de respaldo.`
    );
  }

  return {
    tag: 'v1.13.0',
    url: FALLBACK_MACOS_URL,
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(BIN_DIR, { recursive: true });

  console.log('🔍 Consultando release oficial de Rhubarb Lip Sync para macOS...');
  const { tag, url } = await resolveMacOsDownloadUrl();
  console.log(`⬇️ Descargando Rhubarb Lip Sync (${tag}) desde:\n   ${url}`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rhubarb-setup-'));
  const zipPath = path.join(tmpDir, 'rhubarb-macos.zip');
  const extractDir = path.join(tmpDir, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'orchestrator-2d-remotion-setup' },
    });
    if (!res.ok) {
      throw new Error(`Fallo en la descarga HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(zipPath, Buffer.from(arrayBuffer));

    console.log('📦 Extrayendo archivo ZIP...');
    execFileSync('unzip', ['-q', '-o', zipPath, '-d', extractDir]);

    const extractedBinary = findFileRecursive(extractDir, 'rhubarb');
    if (!extractedBinary) {
      throw new Error(
        'No se encontró el binario `rhubarb` dentro del archivo descargado.'
      );
    }

    fs.copyFileSync(extractedBinary, TARGET_BINARY);
    fs.chmodSync(TARGET_BINARY, 0o755);

    // Copiar directorio `res/` adyacente si existe (requerido por Rhubarb para modelos acústicos)
    const extractedResDir = path.join(path.dirname(extractedBinary), 'res');
    if (fs.existsSync(extractedResDir)) {
      const targetResDir = path.join(BIN_DIR, 'res');
      fs.cpSync(extractedResDir, targetResDir, { recursive: true, force: true });
    }

    console.log(`✅ Binario instalado y con permisos +x en: ${TARGET_BINARY}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('❌ Error instalando Rhubarb Lip Sync:', error);
  process.exit(1);
});
