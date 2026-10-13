import { ConfigurationError } from './config.mjs';

export function databaseFailure(error) {
  if (error instanceof ConfigurationError) return {code:error.code, error:'L’installation du service de données doit être terminée par le responsable du site.'};
  const chain=[]; let current=error;
  for (let i=0; current && i<5; i++,current=current.cause) chain.push(String(current.code||'')+' '+String(current.message||current));
  const text=chain.join(' ');
  if (/no such (table|column)|has no column|MIGRATIONS_UNTRACKED|SCHEMA_NOT_READY/i.test(text)) return {code:'DATABASE_SCHEMA_NOT_READY',error:'La base de données nécessite une mise à jour par le responsable du site.'};
  if (/SQLITE_CANTOPEN|Unable to open connection to local|ENOENT|EACCES|SQLITE_READONLY/i.test(text)) return {code:'DATABASE_STORAGE_UNAVAILABLE',error:'Le stockage de la pharmacie est inaccessible. Le responsable du site doit vérifier son installation.'};
  if (/UNAUTHORIZED|AUTH_FAILED|AUTH_EXPIRED|TOKEN_EXPIRED|JWT|SERVER_ERROR.*401|HTTP.*401|403 Forbidden/i.test(text)) return {code:'DATABASE_ACCESS_DENIED',error:'La connexion à la base est refusée. Le responsable du site doit vérifier les accès du serveur.'};
  if (/ECONN|ENOTFOUND|ETIMEDOUT|fetch failed|CONNECT|TIMEOUT|SERVER_ERROR|HRANA/i.test(text)) return {code:'DATABASE_UNAVAILABLE',error:'Le service de données est temporairement indisponible. Vos brouillons locaux sont conservés. Réessayez.'};
  return {code:'SERVER_ERROR',error:'Le service a rencontré une erreur. Vos brouillons locaux sont conservés. Communiquez la référence affichée au responsable du site.'};
}

export const LAST_MIGRATION='0005_accounts_and_product_families.sql';
export async function inspectSchema(db) {
  const last=await db.prepare('SELECT name FROM app_migrations WHERE name=?').bind(LAST_MIGRATION).first();
  if (!last) throw new Error('SCHEMA_NOT_READY');
  // Read actual columns too: a migration marker alone is not sufficient.
  await db.prepare('SELECT e.email,sl.kind,rl.taxCents FROM employees e LEFT JOIN saleLines sl ON 0 LEFT JOIN returnLines rl ON 0 LIMIT 0').all();
  const owner=await db.prepare("SELECT id FROM employees WHERE role='owner' LIMIT 1").first();
  return {firstAccount:!owner};
}
