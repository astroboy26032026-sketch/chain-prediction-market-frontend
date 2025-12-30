/**
 * api.index.ts
 * Switch API layer theo NEXT_PUBLIC_USE_MOCK
 * An toàn cho Next.js (client + server)
 */

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ⚠️ QUAN TRỌNG:
// dùng export * tĩnh, KHÔNG require động
// nhưng tách file theo env NGAY LÚC LOAD MODULE

if (USE_MOCK) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  module.exports = require('./api.mock');
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  module.exports = require('./api');
}
