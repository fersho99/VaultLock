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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { deleteItem, listItems, VaultItem } from "../lib/db";
import { importFileToVault, removeFileFromVault } from "../lib/vaultStorage";

type Props = {
  onLock: () => void;
};

export default function VaultScreen({ onLock }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);

  const refresh = useCallback(() => {
    setItems(listItems());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    for (const asset of result.assets) {
      await importFileToVault({
        sourceUri: asset.uri,
        fileName: asset.fileName ?? asset.uri.split("/").pop() ?? "archivo",
        mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        size: asset.fileSize ?? null,
      });
    }
    refresh();
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
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
        <TouchableOpacity style={styles.actionButton} onPress={pickMedia}>
          <Text style={styles.actionText}>📷 Foto/Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={pickDocument}>
          <Text style={styles.actionText}>📄 Documento</Text>
        </TouchableOpacity>
      </View>
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
