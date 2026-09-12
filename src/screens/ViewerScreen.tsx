import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Sharing from "expo-sharing";
import { VaultItem } from "../lib/db";
import { withRelockPaused } from "../lib/relockGuard";

type Props = {
  item: VaultItem | null;
  onClose: () => void;
};

function VideoViewer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });

  return (
    <VideoView
      style={styles.media}
      player={player}
      nativeControls
      contentFit="contain"
    />
  );
}

export default function ViewerScreen({ item, onClose }: Props) {
  if (!item) return null;

  const openWithSystemApp = async () => {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert(
        "No disponible",
        "Este dispositivo no puede abrir documentos con apps externas."
      );
      return;
    }
    try {
      await withRelockPaused(() =>
        Sharing.shareAsync(item.uri, {
          mimeType: item.mimeType ?? undefined,
          dialogTitle: item.name,
        })
      );
    } catch {
      Alert.alert("Error", "No se pudo abrir el documento.");
    }
  };

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {item.type === "image" && (
            <Image
              source={{ uri: item.uri }}
              style={styles.media}
              resizeMode="contain"
            />
          )}

          {item.type === "video" && <VideoViewer uri={item.uri} />}

          {item.type === "document" && (
            <View style={styles.docPlaceholder}>
              <Text style={styles.docEmoji}>📄</Text>
              <Text style={styles.docName}>{item.name}</Text>
              <TouchableOpacity
                style={styles.openButton}
                onPress={openWithSystemApp}
              >
                <Text style={styles.openButtonText}>Abrir documento</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1, marginRight: 12 },
  closeButton: { color: "#818CF8", fontSize: 15, fontWeight: "600" },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  media: { width: "100%", height: "100%" },
  docPlaceholder: { alignItems: "center", padding: 24 },
  docEmoji: { fontSize: 64, marginBottom: 16 },
  docName: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 24 },
  openButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  openButtonText: { color: "#fff", fontWeight: "600" },
});
