import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library/legacy";
import { withRelockPaused } from "./relockGuard";
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
 * Copia un archivo (elegido con MediaPickerModal o document-picker) hacia el
 * directorio privado de la boveda y guarda su metadata en SQLite.
 *
 * Si viene un mediaLibraryAssetId (foto/video elegido de la galeria), tambien
 * intenta borrar el original del carrete del telefono una vez copiado, para
 * que deje de aparecer en la Galeria/Fotos del sistema.
 */
export async function importFileToVault(params: {
  sourceUri: string;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
  mediaLibraryAssetId?: string | null;
}): Promise<{ item: VaultItem; removedFromGallery: boolean; galleryError?: string }> {
  ensureVaultDir();

  const safeName = `${Date.now()}_${params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const sourceFile = new File(params.sourceUri);
  const destFile = new File(vaultDir, safeName);

  await sourceFile.copy(destFile);

  const item = insertItem({
    name: params.fileName,
    type: guessType(params.mimeType),
    uri: destFile.uri,
    mimeType: params.mimeType ?? null,
    size: params.size ?? null,
    createdAt: Date.now(),
  });

  let removedFromGallery = false;
  let galleryError: string | undefined;

  if (params.mediaLibraryAssetId) {
    try {
      const perm = await withRelockPaused(() =>
        MediaLibrary.requestPermissionsAsync()
      );
      if (perm.granted) {
        const assetId = params.mediaLibraryAssetId;
        const ok = await withRelockPaused(() =>
          MediaLibrary.deleteAssetsAsync([assetId])
        );
        removedFromGallery = !!ok;
        if (!ok) galleryError = "El sistema no confirmó la eliminación";
      } else {
        galleryError = "Sin permiso para modificar la galería";
      }
    } catch (e) {
      // El usuario ya tiene su copia segura en la bóveda aunque esto falle;
      // solo avisamos que el original sigue visible en la galería.
      galleryError = e instanceof Error ? e.message : "No se pudo quitar de la galería";
    }
  }

  return { item, removedFromGallery, galleryError };
}

export function removeFileFromVault(uri: string) {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
