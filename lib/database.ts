import { createConnection, connectionConfig } from '../runtime/database.mjs';
import type { SqlDatabase } from './sql';
const state = globalThis as typeof globalThis & { ijjaiDb?: SqlDatabase };
export function database(): SqlDatabase {
  return state.ijjaiDb ??= createConnection(connectionConfig()) as unknown as SqlDatabase;
}
