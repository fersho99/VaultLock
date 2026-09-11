import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { authenticate, checkBiometricSupport } from "../lib/biometrics";

type Props = {
  onUnlock: () => void;
};

export default function LockScreen({ onUnlock }: Props) {
  const [checking, setChecking] = useState(true);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    (async () => {
      const support = await checkBiometricSupport();
      if (!support.hasHardware) {
        setSupportMessage(
          "Este dispositivo no tiene sensor biométrico disponible."
        );
      } else if (!support.isEnrolled) {
        setSupportMessage(
          "No hay huella o rostro registrado en el sistema. Configúralo en Ajustes del teléfono."
        );
      }
      setChecking(false);
    })();
  }, []);

  const handleUnlock = async () => {
    setAuthenticating(true);
    const result = await authenticate("Desbloquea VaultLock");
    setAuthenticating(false);
    if (result.success) {
      onUnlock();
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔒 VaultLock</Text>
      <Text style={styles.subtitle}>Tus archivos protegidos</Text>

      {supportMessage && <Text style={styles.warning}>{supportMessage}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleUnlock}
        disabled={authenticating}
      >
        {authenticating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Desbloquear</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: "700", color: "#fff", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#94A3B8", marginBottom: 32 },
  warning: {
    color: "#FBBF24",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
