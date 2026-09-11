import * as SQLite from "expo-sqlite";

export type VaultItemType = "image" | "video" | "document";

export type VaultItem = {
  id: number;
  name: string;
  type: VaultItemType;
  uri: string; // ruta dentro del sandbox privado de la app
  mimeType: string | null;
  size: number | null;
  createdAt: number;
};

const db = SQLite.openDatabaseSync("vaultlock.db");

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS vault_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      uri TEXT NOT NULL,
      mimeType TEXT,
      size INTEGER,
      createdAt INTEGER NOT NULL
    );
  `);
}

export function insertItem(item: Omit<VaultItem, "id">): VaultItem {
  const result = db.runSync(
    `INSERT INTO vault_items (name, type, uri, mimeType, size, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [item.name, item.type, item.uri, item.mimeType, item.size, item.createdAt]
  );
  return { id: result.lastInsertRowId, ...item };
}

export function listItems(): VaultItem[] {
  return db.getAllSync<VaultItem>(
    `SELECT * FROM vault_items ORDER BY createdAt DESC`
  );
}

export function deleteItem(id: number) {
  db.runSync(`DELETE FROM vault_items WHERE id = ?`, [id]);
}
