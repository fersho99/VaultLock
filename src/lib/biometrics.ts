import * as LocalAuthentication from "expo-local-authentication";

export type BiometricCheck = {
  hasHardware: boolean;
  isEnrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
};

/**
 * Revisa si el dispositivo tiene sensor biométrico y si el usuario
 * ya registró huella/rostro en el sistema operativo (no en la app).
 */
export async function checkBiometricSupport(): Promise<BiometricCheck> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { hasHardware, isEnrolled, types };
}

/**
 * Dispara el prompt nativo de biometría (huella / Face ID).
 * disableDeviceFallback=false permite que, si la biometría falla,
 * el propio SO ofrezca el PIN/patrón como respaldo (recomendado en
 * apps reales: nunca dejar al usuario sin poder entrar).
 */
export async function authenticate(
  promptMessage = "Desbloquea VaultLock"
): Promise<{ success: boolean; error?: string }> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancelar",
    disableDeviceFallback: false,
    fallbackLabel: "Usar PIN del dispositivo",
  });

  if (result.success) return { success: true };
  return { success: false, error: result.error };
}
