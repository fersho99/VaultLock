// Cuando la app misma dispara un dialogo del sistema (permiso, selector de
// archivos, compartir), Android puede mandar la Activity a "background" por
// un instante — y eso no debe contar como que el usuario salio de la app.
// Este modulo deja que cualquier pantalla le avise a App.tsx "estoy a punto
// de abrir algo del sistema, no te bloquees" y luego "ya termine".
//
// Es un contador (no un booleano) para soportar llamadas anidadas sin que
// una se pise con otra.

let pauseCount = 0;

export function isRelockPaused(): boolean {
  return pauseCount > 0;
}

export function pauseRelock(): void {
  pauseCount += 1;
}

export function resumeRelock(): void {
  pauseCount = Math.max(0, pauseCount - 1);
}

/**
 * Envuelve una promesa (por ejemplo, un pedido de permiso o un picker)
 * pausando el re-bloqueo mientras esta en curso, y reanudandolo pase lo
 * que pase (exito o error).
 */
export async function withRelockPaused<T>(fn: () => Promise<T>): Promise<T> {
  pauseRelock();
  try {
    return await fn();
  } finally {
    resumeRelock();
  }
}
