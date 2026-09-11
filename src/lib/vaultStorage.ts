import { Directory, File, Paths } from "expo-file-system";
import { insertItem, VaultItem, VaultItemType } from "./db";

// Carpeta privada dentro del sandbox de la app. En Android/iOS otras apps
// NO pueden leer aqui sin root/jailbreak -- esta es la "proteccion real"
// de la que hablamos: el gate biometrico solo controla quien entra a la UI.
const vaultDir = new Directory(Paths.document, "vault");

export function ensureVaultDir() {
  if (!vaultDir.exists) {
    vaultDir.create({ intermediates: true });
  }
}

function guessType(mimeType: string | null | undefined): VaultItemType {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  return "document";
}

/**
 * Copia un archivo (elegido con image-picker o document-picker) hacia el
 * directorio privado de la boveda y guarda su metadata en SQLite.
 */
export async function importFileToVault(params: {
  sourceUri: string;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
}): Promise<VaultItem> {
  ensureVaultDir();

  const safeName = `${Date.now()}_${params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const sourceFile = new File(params.sourceUri);
  const destFile = new File(vaultDir, safeName);

  await sourceFile.copy(destFile);

  return insertItem({
    name: params.fileName,
    type: guessType(params.mimeType),
    uri: destFile.uri,
    mimeType: params.mimeType ?? null,
    size: params.size ?? null,
    createdAt: Date.now(),
  });
}

export function removeFileFromVault(uri: string) {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
