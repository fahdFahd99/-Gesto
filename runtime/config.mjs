export class ConfigurationError extends Error {
  constructor(code, message) { super(message); this.name = 'ConfigurationError'; this.code = code; }
}

export function isNetlify(env = process.env) {
  // NETLIFY is a build variable, not a guaranteed Functions runtime variable.
  return env.NETLIFY === 'true' || Boolean(env.SITE_ID && env.URL);
}

export function configuredOrigin(env = process.env) {
  const value = env.APP_ORIGIN?.trim();
  if (!value) throw new ConfigurationError('APP_ORIGIN_MISSING', 'APP_ORIGIN doit contenir l’adresse de cette installation.');
  let url;
  try { url = new URL(value); } catch { throw new ConfigurationError('APP_ORIGIN_INVALID', 'APP_ORIGIN doit être une adresse HTTP ou HTTPS valide.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && !isNetlify(env)))) {
    throw new ConfigurationError('APP_ORIGIN_INVALID', 'APP_ORIGIN doit être une origine HTTPS, sans chemin; HTTP est réservé au poste local.');
  }
  return url.origin;
}
