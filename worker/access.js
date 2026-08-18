// Cloudflare Access JWT verification.
//
// Access sits in front of /admin and /api/admin at the edge and will not let an
// unauthenticated request through. We verify the signed assertion here anyway,
// because the workers.dev hostname is not covered by the Access application and
// would otherwise be an unauthenticated side door. Belt and braces: also disable
// the workers.dev route in the dashboard once the custom domain is live.

const CERT_CACHE_TTL_MS = 60 * 60 * 1000; // Access rotates keys infrequently.
let certCache = { domain: null, expires: 0, keys: null };

function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeSegment(seg) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
}

async function getKeys(teamDomain) {
  const now = Date.now();
  if (certCache.keys && certCache.domain === teamDomain && certCache.expires > now) {
    return certCache.keys;
  }
  const url = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const res = await fetch(url, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) throw new Error(`Access certs fetch failed: ${res.status}`);
  const body = await res.json();
  const keys = {};
  for (const jwk of body.keys || []) {
    keys[jwk.kid] = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
  }
  certCache = { domain: teamDomain, expires: now + CERT_CACHE_TTL_MS, keys };
  return keys;
}

/**
 * Verify the Access assertion on a request.
 * Returns { ok: true, email, sub } or { ok: false, reason }.
 */
export async function verifyAccess(request, env) {
  const team = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  if (!team || team.startsWith('PASTE_') || !aud || aud.startsWith('PASTE_')) {
    return { ok: false, reason: 'Access is not configured yet (ACCESS_TEAM_DOMAIN / ACCESS_AUD).' };
  }

  const token =
    request.headers.get('Cf-Access-Jwt-Assertion') ||
    (request.headers.get('Cookie') || '').match(/CF_Authorization=([^;]+)/)?.[1];
  if (!token) return { ok: false, reason: 'No Access assertion on the request.' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'Malformed assertion.' };

  let header, payload;
  try {
    header = decodeSegment(parts[0]);
    payload = decodeSegment(parts[1]);
  } catch {
    return { ok: false, reason: 'Unreadable assertion.' };
  }

  const keys = await getKeys(team);
  const key = keys[header.kid];
  if (!key) return { ok: false, reason: 'Unknown signing key.' };

  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    b64urlToBytes(parts[2]),
    signed
  );
  if (!valid) return { ok: false, reason: 'Bad signature.' };

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { ok: false, reason: 'Assertion expired.' };
  if (payload.nbf && payload.nbf > now + 60) return { ok: false, reason: 'Assertion not yet valid.' };

  const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audList.includes(aud)) return { ok: false, reason: 'Assertion is for a different application.' };

  const issuer = `https://${team}.cloudflareaccess.com`;
  if (payload.iss !== issuer) return { ok: false, reason: 'Unexpected issuer.' };

  return { ok: true, email: payload.email || payload.common_name || 'unknown', sub: payload.sub };
}
