import { verifyAccess } from './access.js';
import {
  handleAdminApi,
  handlePublicApi,
  getPublishedIssue,
  listPublished,
  renderArchive,
  renderIssue,
} from './torch.js';

// Replaces the inner HTML of the element it is attached to.
//
// Field names here are not free: HTMLRewriter treats `text`, `comments`,
// `doctype`, and `end` on a handler object as handler callbacks. A property
// called `text` holding a string throws "the provided value is not of type
// 'function'", so the payload fields are named `markup` and `value`.
class ReplaceInner {
  constructor(markup) {
    this.markup = markup;
  }
  element(el) {
    el.setInnerContent(this.markup, { html: true });
  }
}

class SetText {
  constructor(value) {
    this.value = value;
  }
  element(el) {
    el.setInnerContent(this.value);
  }
}

function securityHeaders(res) {
  const h = new Headers(res.headers);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('X-Frame-Options', 'SAMEORIGIN');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ---- the homepage ---------------------------------------------------
      // html_handling is "none" so that /page.html serves without a redirect,
      // which also switches off the built-in "/" to index.html mapping.
      if (path === '/') {
        const rootUrl = new URL(request.url);
        rootUrl.pathname = '/index.html';
        return env.ASSETS.fetch(new Request(rootUrl, request));
      }

      // ---- public API -----------------------------------------------------
      if (path.startsWith('/api/torch/')) {
        const res = await handlePublicApi(request, env, url);
        if (res) return securityHeaders(res);
        return new Response('Not found', { status: 404 });
      }

      // ---- admin (Access-protected) ---------------------------------------
      if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/')) {
        const auth = await verifyAccess(request, env);
        if (!auth.ok) {
          const wantsJson = path.startsWith('/api/');
          return securityHeaders(
            wantsJson
              ? new Response(JSON.stringify({ error: auth.reason }), {
                  status: 403,
                  headers: { 'Content-Type': 'application/json' },
                })
              : new Response(
                  `<!doctype html><meta charset="utf-8"><title>Sign in required</title>` +
                    `<body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1.5rem;line-height:1.6">` +
                    `<h1 style="font-size:1.4rem">Sign in required</h1>` +
                    `<p>This page is for church staff. ${auth.reason}</p>` +
                    `<p><a href="/">Back to the website</a></p>`,
                  { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                )
          );
        }

        if (path.startsWith('/api/admin/')) {
          return securityHeaders(await handleAdminApi(request, env, url, auth.email));
        }

        // Serve the admin page itself from static assets.
        const assetUrl = new URL(request.url);
        if (assetUrl.pathname === '/admin') assetUrl.pathname = '/admin/index.html';
        const res = await env.ASSETS.fetch(new Request(assetUrl, request));
        return securityHeaders(
          new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), 'Cache-Control': 'no-store' } })
        );
      }

      // ---- the Torch page, server-rendered --------------------------------
      if (path === '/torch' || path === '/torch.html') {
        const slug = url.searchParams.get('issue');
        const [issue, archive] = await Promise.all([
          getPublishedIssue(env, slug),
          listPublished(env),
        ]);

        const assetUrl = new URL(request.url);
        assetUrl.pathname = '/torch.html';
        assetUrl.search = '';
        const page = await env.ASSETS.fetch(new Request(assetUrl, { method: 'GET' }));

        const body = renderIssue(issue, { archive: renderArchive(archive, issue?.slug) });
        let rewriter = new HTMLRewriter().on('#torchContent', new ReplaceInner(body));

        if (issue) {
          const label = `The Torch, ${issue.issue_label} | Roanoke Baptist Church, Roanoke Indiana`;
          rewriter = rewriter
            .on('title', new SetText(label))
            .on('meta[property="og:title"]', {
              element: (el) => el.setAttribute('content', label),
            })
            .on('meta[name="twitter:title"]', {
              element: (el) => el.setAttribute('content', label),
            });
        }

        const out = rewriter.transform(page);
        return securityHeaders(
          new Response(out.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
            },
          })
        );
      }

      // ---- everything else is a static asset ------------------------------
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('worker error', path, err && err.stack ? err.stack : err);
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Something went wrong on our end.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Never let a Torch-rendering failure take the page down: fall back to
      // the static file exactly as it sits in the repo.
      return env.ASSETS.fetch(request);
    }
  },
};
