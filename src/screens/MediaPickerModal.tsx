import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as MediaLibrary from "expo-media-library/legacy";
import { withRelockPaused } from "../lib/relockGuard";

export type PickedMediaAsset = {
  id: string;
  uri: string;
  filename: string;
  mediaType: MediaLibrary.MediaTypeValue;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (assets: PickedMediaAsset[]) => void;
};

const NUM_COLUMNS = 4;

export default function MediaPickerModal({ visible, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MediaLibrary.Asset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set());
    setLoading(true);
    setPermissionDenied(false);

    (async () => {
      try {
        const perm = await withRelockPaused(() =>
          MediaLibrary.requestPermissionsAsync()
        );
        if (!perm.granted) {
          setPermissionDenied(true);
          setLoading(false);
          return;
        }
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: ["photo", "video"],
          sortBy: [["creationTime", false]],
          first: 120,
        });
        setItems(page.assets);
      } catch (e) {
        setPermissionDenied(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const picked = items
      .filter((i) => selected.has(i.id))
      .map((i) => ({
        id: i.id,
        uri: i.uri,
        filename: i.filename ?? "archivo",
        mediaType: i.mediaType,
      }));
    onConfirm(picked);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Elegir de la galería</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={selected.size === 0}
          >
            <Text
              style={[
                styles.headerButton,
                styles.confirmButton,
                selected.size === 0 && styles.disabled,
              ]}
            >
              Agregar ({selected.size})
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        )}

        {!loading && permissionDenied && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              Necesitamos permiso de acceso completo a tu galería para poder
              elegir y luego ocultar el original.
            </Text>
          </View>
        )}

        {!loading && !permissionDenied && items.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay fotos ni videos.</Text>
          </View>
        )}

        {!loading && !permissionDenied && items.length > 0 && (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => {
              const isSelected = selected.has(item.id);
              const isVideo = item.mediaType === "video";
              return (
                <TouchableOpacity
                  style={styles.cell}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.8}
                >
                  {isVideo ? (
                    <View style={[styles.cellImage, styles.videoPlaceholder]}>
                      <Text style={styles.videoEmoji}>🎬</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: item.uri }} style={styles.cellImage} />
                  )}
                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <Text style={styles.selectedCheck}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const CELL_SIZE = 90;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  headerButton: { color: "#94A3B8", fontSize: 14 },
  confirmButton: { color: "#818CF8", fontWeight: "700" },
  disabled: { opacity: 0.4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: "#64748B", textAlign: "center" },
  grid: { padding: 4 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 2,
  },
  cellImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#1E293B",
  },
  videoPlaceholder: { alignItems: "center", justifyContent: "center" },
  videoEmoji: { fontSize: 28 },
  selectedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(79,70,229,0.45)",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheck: { color: "#fff", fontSize: 24, fontWeight: "800" },
});
