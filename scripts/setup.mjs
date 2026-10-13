import {prepareRuntime} from '../runtime/prepare.mjs';
await prepareRuntime();
console.log('Base prête. Lancez pnpm dev; le code du premier compte est dans .env.local (SETUP_TOKEN).');
