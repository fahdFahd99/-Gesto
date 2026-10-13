import { createClient } from '@libsql/client';
import { ConfigurationError, isNetlify } from './config.mjs';

/** Same transactional SQL adapter for local SQLite and remote durable libSQL. */
export function createConnection(config) {
  const client = createClient(config);
  let initialization;
  // A temporary connection failure must not poison this process forever.
  // Retry only initialization on the next request, never an application write.
  const ready = () => initialization ??= client.execute('PRAGMA foreign_keys=ON').catch(error => { initialization = undefined; throw error; });
  const normalize = r => ({ success: true, results: r.rows.map(row => Object.fromEntries(Object.entries(row))), meta: { changes: r.rowsAffected } });
  const prepare = (sql, args = []) => ({
    sql, args,
    bind(...values) { return prepare(sql, values); },
    async all() { await ready(); return normalize(await client.execute({ sql, args })); },
    async first(column) { const r = (await this.all()).results[0]; return r ? (column ? r[column] : r) : null; },
    async run() { return this.all(); },
  });
  return {
    prepare,
    async batch(statements) {
      await ready();
      // One transaction: any failing statement rolls back every write.
      return (await client.batch(statements.map(s => ({ sql: s.sql, args: s.args })), 'write')).map(normalize);
    },
    async exec(sql) { await ready(); await client.executeMultiple(sql); },
    async close() { client.close(); },
  };
}

export function connectionConfig(env = process.env) {
  // Always require explicit configuration: never create an accidental empty
  // SQLite database inside a production function or after a missing env file.
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new ConfigurationError('DATABASE_URL_MISSING', 'DATABASE_URL manquante. Configurez la base persistante avant de lancer le site.');
  if (!/^(file:|libsql:\/\/|https:\/\/)/.test(url)) throw new ConfigurationError('DATABASE_URL_INVALID', 'DATABASE_URL doit être une URL libSQL/HTTPS, ou un fichier SQLite sur le poste local.');
  if (isNetlify(env) && !/^(libsql|https):\/\//.test(url)) throw new ConfigurationError('DATABASE_LOCAL_ON_NETLIFY', 'Netlify nécessite une base libSQL distante; une base SQLite locale n’est pas autorisée.');
  if (!url.startsWith('file:') && !env.DATABASE_AUTH_TOKEN?.trim()) throw new ConfigurationError('DATABASE_TOKEN_MISSING', 'DATABASE_AUTH_TOKEN manquant.');
  return { url, authToken: env.DATABASE_AUTH_TOKEN || undefined, intMode: 'number' };
}
