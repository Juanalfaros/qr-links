import { handle } from '@astrojs/cloudflare/handler';
import { sendWeeklyDigest } from './lib/cron/digest';
import { checkAlertRules } from './lib/cron/alerts';

// Astro's default Workers entrypoint only exports `fetch`. Cron Triggers
// need a `scheduled` handler too, so this wraps the documented
// @astrojs/cloudflare/handler export (see astro's Cloudflare adapter docs —
// "create a standard Cloudflare Worker export object directly") instead of
// using the adapter's default entrypoint module. wrangler.jsonc's `main`
// points here. The two cron expressions below must match `triggers.crons`
// there exactly.
const WEEKLY_DIGEST_CRON = '0 8 * * 1';

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    if (event.cron === WEEKLY_DIGEST_CRON) {
      ctx.waitUntil(sendWeeklyDigest(env));
    } else {
      ctx.waitUntil(checkAlertRules(env));
    }
  },
} satisfies ExportedHandler<Env>;
