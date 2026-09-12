import React, { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, StatusBar } from "react-native";
import LockScreen from "./src/screens/LockScreen";
import VaultScreen from "./src/screens/VaultScreen";
import { initDb } from "./src/lib/db";
import { isRelockPaused } from "./src/lib/relockGuard";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    initDb();
  }, []);

  // Si la app pasa a background de verdad (el usuario sale o cambia de app),
  // volvemos a pedir biometria al regresar. Esto es clave para una
  // "boveda" real: no basta con proteger solo el arranque en frio.
  //
  // OJO: solo "background" cuenta. "inactive" tambien se dispara con
  // dialogos transitorios del sistema (permisos, selector de archivos,
  // compartir, etc.) que NO significan que el usuario salio de la app —
  // si reaccionamos a "inactive" tambien, la boveda se re-bloquea sola
  // cada vez que se abre uno de esos dialogos.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (
        appState.current === "active" &&
        next === "background" &&
        !isRelockPaused()
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
