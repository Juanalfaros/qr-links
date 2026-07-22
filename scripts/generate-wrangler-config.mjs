#!/usr/bin/env node
// Generates wrangler.jsonc (gitignored) from wrangler.template.jsonc (tracked),
// substituting deployment-specific placeholders with values from the
// environment — so a real Cloudflare resource id never has to be committed.
// Run manually after `wrangler kv namespace create RATE_LIMIT_KV`, and again
// any time RATE_LIMIT_KV_ID changes. See README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(root, 'wrangler.template.jsonc');
const outputPath = path.join(root, 'wrangler.jsonc');
const devVarsPath = path.join(root, '.dev.vars');

// RATE_LIMIT_KV_ID configures a Wrangler *binding*, not something the Worker
// reads at runtime via env.X — but .dev.vars is already the project's
// established "real values live here, never in git" location, so it's read
// from there too for local convenience. CI/Cloudflare Workers Builds set it
// as a plain build-time environment variable instead (no .dev.vars there).
function readDevVar(name) {
  if (!fs.existsSync(devVarsPath)) return undefined;
  const line = fs
    .readFileSync(devVarsPath, 'utf-8')
    .split('\n')
    .find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

const kvId = process.env.RATE_LIMIT_KV_ID ?? readDevVar('RATE_LIMIT_KV_ID');

if (!kvId) {
  console.error(
    'RATE_LIMIT_KV_ID is not set.\n' +
      'Create the namespace with `wrangler kv namespace create RATE_LIMIT_KV`, then either:\n' +
      '  - add RATE_LIMIT_KV_ID=<id> to .dev.vars (local dev), or\n' +
      '  - set RATE_LIMIT_KV_ID as a build environment variable (CI / Cloudflare Workers Builds).',
  );
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf-8');
fs.writeFileSync(outputPath, template.replaceAll('__RATE_LIMIT_KV_ID__', kvId));
console.log(`wrangler.jsonc generated (RATE_LIMIT_KV_ID=${kvId}).`);
