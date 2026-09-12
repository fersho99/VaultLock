import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { deleteItem, listItems, VaultItem } from "../lib/db";
import { importFileToVault, removeFileFromVault } from "../lib/vaultStorage";
import { withRelockPaused } from "../lib/relockGuard";
import ViewerScreen from "./ViewerScreen";
import MediaPickerModal, { PickedMediaAsset } from "./MediaPickerModal";

type Props = {
  onLock: () => void;
};

export default function VaultScreen({ onLock }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [viewing, setViewing] = useState<VaultItem | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const refresh = useCallback(() => {
    setItems(listItems());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleMediaPicked = async (assets: PickedMediaAsset[]) => {
    setPickerVisible(false);
    if (assets.length === 0) return;

    let anyGalleryError = false;
    const galleryErrors: string[] = [];

    for (const picked of assets) {
      try {
        const { galleryError } = await importFileToVault({
          sourceUri: picked.uri,
          fileName: picked.filename,
          mimeType:
            picked.mediaType === "video" ? "video/mp4" : "image/jpeg",
          size: null,
          mediaLibraryAssetId: picked.id,
        });
        if (galleryError) {
          anyGalleryError = true;
          galleryErrors.push(galleryError);
        }
      } catch (e) {
        anyGalleryError = true;
        galleryErrors.push(e instanceof Error ? e.message : "Error desconocido");
      }
    }

    refresh();

    if (anyGalleryError) {
      Alert.alert(
        "Guardado en la bóveda",
        `El archivo ya está protegido, pero no se pudo quitar el original de la galería.\n\nDetalle: ${galleryErrors.join(", ")}`
      );
    }
  };

  const pickDocument = async () => {
    const result = await withRelockPaused(() =>
      DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      })
    );
    if (result.canceled || !result.assets?.length) return;

    for (const asset of result.assets) {
      await importFileToVault({
        sourceUri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType ?? null,
        size: asset.size ?? null,
      });
    }
    refresh();
  };

  const handleDelete = (item: VaultItem) => {
    Alert.alert("Eliminar", `¿Eliminar "${item.name}" de la bóveda?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          removeFileFromVault(item.uri);
          deleteItem(item.id);
          refresh();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: VaultItem }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => setViewing(item)}
      onLongPress={() => handleDelete(item)}
    >
      {item.type === "image" ? (
        <Image source={{ uri: item.uri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbEmoji}>
            {item.type === "video" ? "🎬" : "📄"}
          </Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowSubtitle}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi bóveda</Text>
        <TouchableOpacity onPress={onLock}>
          <Text style={styles.lockButton}>Bloquear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No hay nada guardado todavía. Agrega una foto, video o documento.
          </Text>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.actionText}>📷 Foto/Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={pickDocument}>
          <Text style={styles.actionText}>📄 Documento</Text>
        </TouchableOpacity>
      </View>

      <ViewerScreen item={viewing} onClose={() => setViewing(null)} />
      <MediaPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={handleMediaPicked}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  lockButton: { color: "#F87171", fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { color: "#64748B", textAlign: "center", marginTop: 60 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#334155" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbEmoji: { fontSize: 22 },
  rowText: { marginLeft: 12, flex: 1 },
  rowTitle: { color: "#fff", fontSize: 15, fontWeight: "500" },
  rowSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  actions: {
    flexDirection: "row",
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "600" },
});
