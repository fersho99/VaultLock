import React, { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, StatusBar } from "react-native";
import LockScreen from "./src/screens/LockScreen";
import VaultScreen from "./src/screens/VaultScreen";
import { initDb } from "./src/lib/db";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    initDb();
  }, []);

  // Si la app pasa a background (el usuario sale o cambia de app),
  // volvemos a pedir biometria al regresar. Esto es clave para una
  // "boveda" real: no basta con proteger solo el arranque en frio.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (
        appState.current === "active" &&
        (next === "background" || next === "inactive")
      ) {
        setUnlocked(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" />
      {unlocked ? (
        <VaultScreen onLock={() => setUnlocked(false)} />
      ) : (
        <LockScreen onUnlock={() => setUnlocked(true)} />
      )}
    </>
  );
}
