/* ============================================================
   FGA — Journal engine
   Loads markdown entries and renders the index + full entries.

   HOW IT WORKS (for whoever maintains the site):
   - Every journal post is one Markdown file in /journal/entries/
   - The order they appear is set by /journal/entries.json (newest first)
   - Photos live alongside the .md files in /journal/entries/
   See README.md for the step-by-step "add a post" guide.
   ============================================================ */
(function () {
  'use strict';

  var MANIFEST = 'journal/entries.json';
  var ENTRIES_PATH = 'journal/entries/';

  /* ── Front-matter parser ──────────────────────────────────
     Reads the `key: value` block between the leading --- fences. */
  function parse(raw) {
    var meta = {}, body = raw;
    var m = raw.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
    if (m) {
      body = m[2];
      m[1].split(/\r?\n/).forEach(function (line) {
        var i = line.indexOf(':');
        if (i === -1) return;
        var key = line.slice(0, i).trim().toLowerCase();
        var val = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        if (key) meta[key] = val;
      });
    }
    return { meta: meta, body: body.trim() };
  }

  // "2024-11-14" -> "2024.11.14" (leaves other formats untouched)
  function fmtDate(d) {
    if (!d) return '';
    var m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[1] + '.' + m[2] + '.' + m[3] : d;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // Render markdown -> HTML using marked, with relative image/link
  // paths resolved against the entries folder.
  function renderMarkdown(md) {
    var html = window.marked ? window.marked.parse(md) : '<p>' + escapeHtml(md) + '</p>';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('img[src]').forEach(function (img) {
      var src = img.getAttribute('src');
      if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/') && !src.startsWith(ENTRIES_PATH)) {
        img.setAttribute('src', ENTRIES_PATH + src);
      }
      img.setAttribute('loading', 'lazy');
    });
    return tmp.innerHTML;
  }

  // First paragraph of the body, as plain text — used for index excerpts.
  function firstParagraph(md) {
    var lines = md.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l && !/^[#!>\-*]/.test(l)) {
        return l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '');
      }
    }
    return '';
  }

  // First image reference in the body — used for the index thumbnail.
  function firstImage(md) {
    var m = md.match(/!\[[^\]]*\]\(([^)\s]+)/);
    if (!m) return '';
    var src = m[1];
    return /^(https?:)?\/\//.test(src) || src.startsWith('/') ? src : ENTRIES_PATH + src;
  }

  function resolveSlug(slug) {
    return ENTRIES_PATH + slug + '.md';
  }

  function load(slug) {
    return fetch(resolveSlug(slug), { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('Missing entry: ' + slug);
        return r.text();
      })
      .then(function (raw) {
        var p = parse(raw);
        p.slug = slug;
        return p;
      });
  }

  /* ── Index page ──────────────────────────────────────────── */
  function renderIndex(container) {
    fetch(MANIFEST, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('Cannot load ' + MANIFEST);
        return r.json();
      })
      .then(function (slugs) {
        if (!Array.isArray(slugs) || !slugs.length) {
          container.innerHTML = '<div class="journal-status">No entries yet.</div>';
          return;
        }
        return Promise.all(slugs.map(function (slug) {
          return load(slug).catch(function (e) {
            console.warn(e.message);
            return null;
          });
        })).then(function (entries) {
          container.innerHTML = '';
          entries.filter(Boolean).forEach(function (e) {
            container.appendChild(cardFor(e));
          });
          if (!container.children.length) {
            container.innerHTML = '<div class="journal-status">No entries yet.</div>';
          }
        });
      })
      .catch(function (e) {
        console.error(e);
        container.innerHTML = '<div class="journal-status">Could not load entries. ' +
          'If you are previewing locally, run a local server (see README).</div>';
      });
  }

  function cardFor(e) {
    var meta = e.meta;
    var excerpt = meta.excerpt || firstParagraph(e.body);
    var thumb = meta.cover ?
      (/^(https?:)?\/\//.test(meta.cover) || meta.cover.startsWith('/') ? meta.cover : ENTRIES_PATH + meta.cover)
      : firstImage(e.body);
    var href = 'entry.html?e=' + encodeURIComponent(e.slug);

    var art = document.createElement('article');
    art.className = 'entry';

    var metaCol = '<div class="entry-meta">' +
      (meta.date ? '<span class="date">' + escapeHtml(fmtDate(meta.date)) + '</span>' : '') +
      (meta.location ? '<span class="loc">' + escapeHtml(meta.location) + '</span>' : '') +
      (meta.tag ? '<span class="tag">' + escapeHtml(meta.tag) + '</span>' : '') +
      '</div>';

    var bodyCol = '<div class="entry-body">' +
      '<h2><a href="' + href + '" style="color:inherit;">' + escapeHtml(meta.title || 'Untitled') + '</a></h2>' +
      (excerpt ? '<p>' + escapeHtml(excerpt) + '</p>' : '') +
      (thumb ? '<a href="' + href + '"><img class="entry-thumb" loading="lazy" src="' + escapeHtml(thumb) + '" alt=""></a>' : '') +
      '<a href="' + href + '" class="read">Read &rarr;</a>' +
      '</div>';

    art.innerHTML = metaCol + bodyCol;
    return art;
  }

  /* ── Single entry page ───────────────────────────────────── */
  function renderEntry(container) {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('e');
    if (!slug) {
      container.innerHTML = errorBlock('No entry specified.');
      return;
    }
    load(slug)
      .then(function (e) {
        var meta = e.meta;
        if (meta.title) document.title = meta.title + ' — FGA Journal';

        var tagline = [];
        if (meta.date) tagline.push('<span>' + escapeHtml(fmtDate(meta.date)) + '</span>');
        if (meta.location) tagline.push('<span>' + escapeHtml(meta.location) + '</span>');
        if (meta.tag) tagline.push('<span class="tag" style="border:.5px solid rgba(110,163,212,0.28);padding:3px 7px;text-transform:uppercase;">' + escapeHtml(meta.tag) + '</span>');

        container.innerHTML =
          '<a href="journal.html" class="back">&larr; Journal</a>' +
          (tagline.length ? '<div class="entry-tagline">' + tagline.join('') + '</div>' : '') +
          '<h1>' + escapeHtml(meta.title || 'Untitled') + '</h1>' +
          '<div class="content">' + renderMarkdown(e.body) + '</div>';
      })
      .catch(function (err) {
        console.error(err);
        container.innerHTML = errorBlock('Entry not found.');
      });
  }

  function errorBlock(msg) {
    return '<a href="journal.html" class="back">&larr; Journal</a>' +
      '<div class="journal-status">' + escapeHtml(msg) + '</div>';
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  function init() {
    var idx = document.getElementById('entries');
    if (idx) renderIndex(idx);
    var art = document.getElementById('article');
    if (art) renderEntry(art);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
