/* SOUL.md Registry — marketplace app.
   No frameworks, no build step, no network calls beyond this origin. */

(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const state = {
    souls: [],
    query: '',
    category: '',
    tag: '',
    sort: 'name',
    active: null,
    tab: 'SOUL.md',
  };

  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* Resolve the registry data relative to this script, so the marketplace works
     whether it is served from the repository root or from any subpath. */
  const DATA_BASE = (() => {
    try {
      const src = (document.currentScript && document.currentScript.src) || '';
      return src ? new URL('./data/', src).href : 'data/';
    } catch {
      return 'data/';
    }
  })();

  /* ---------------------------------------------------------------- markdown */
  /* Deliberately small: headings, bold, italic, inline code, lists, hr, paragraphs. */

  function renderMarkdown(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let list = null; // 'ul' | 'ol'
    let para = [];

    const inline = (t) => {
      let s = esc(t);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      s = s.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return s;
    };

    const flushPara = () => {
      if (para.length) {
        out.push('<p>' + inline(para.join(' ')) + '</p>');
        para = [];
      }
    };
    const flushList = () => {
      if (list) {
        out.push('</' + list + '>');
        list = null;
      }
    };

    for (const raw of lines) {
      const line = raw.trimEnd();

      if (!line.trim()) { flushPara(); flushList(); continue; }
      if (/^---+$/.test(line.trim())) { flushPara(); flushList(); out.push('<hr>'); continue; }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara(); flushList();
        const level = Math.min(h[1].length + 1, 6); // ## -> h3 inside the modal
        out.push(`<h${level}>${inline(h[2])}</h${level}>`);
        continue;
      }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        flushPara();
        const want = ul ? 'ul' : 'ol';
        if (list !== want) { flushList(); out.push('<' + want + '>'); list = want; }
        out.push('<li>' + inline((ul || ol)[1]) + '</li>');
        continue;
      }

      if (/^>\s?/.test(line)) {
        flushPara(); flushList();
        out.push('<p><em>' + inline(line.replace(/^>\s?/, '')) + '</em></p>');
        continue;
      }

      flushList();
      para.push(line.trim());
    }
    flushPara();
    flushList();
    return out.join('\n');
  }

  /* ------------------------------------------------------------------ utils */

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2000);
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(label || 'Copied to clipboard');
    } catch {
      // clipboard API needs a secure context; fall back to a selection
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast(label || 'Copied to clipboard');
      } catch {
        toast('Copy failed — select the text manually');
      }
      document.body.removeChild(ta);
    }
  }

  function download(name, text) {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Downloading ' + name);
  }

  function initials(name) {
    return name.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  }

  /* --------------------------------------------------------------- filtering */

  function score(s, q) {
    q = q.toLowerCase();
    let n = 0;
    if (s.slug === q) n += 100;
    if (s.name.toLowerCase() === q) n += 100;
    if (s.slug.includes(q)) n += 40;
    if (s.name.toLowerCase().includes(q)) n += 30;
    if (s.category === q) n += 25;
    for (const t of s.tags) if (t.includes(q)) n += 20;
    if (s.description.toLowerCase().includes(q)) n += 10;
    if ((s.body || '').toLowerCase().includes(q)) n += 4;
    return n;
  }

  function visible() {
    let list = state.souls.slice();
    if (state.category) list = list.filter((s) => s.category === state.category);
    if (state.tag) list = list.filter((s) => s.tags.includes(state.tag));
    if (state.query) {
      const q = state.query.trim();
      list = list.map((s) => ({ s, n: score(s, q) }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .map((x) => x.s);
    }
    if (!state.query) {
      list.sort((a, b) => {
        if (state.sort === 'updated') return (b.updated || '').localeCompare(a.updated || '') || a.name.localeCompare(b.name);
        if (state.sort === 'category') return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
    }
    return list;
  }

  /* ---------------------------------------------------------------- rendering */

  function card(s) {
    const el = document.createElement('button');
    el.className = 'card';
    el.type = 'button';
    el.dataset.slug = s.slug;
    el.setAttribute('aria-label', `Open ${s.name}`);
    el.innerHTML = `
      <div class="top">
        <div class="avatar" aria-hidden="true">${esc(initials(s.name))}</div>
        <div>
          <h3>${esc(s.name)}</h3>
          <div class="meta">@${esc(s.author)} · v${esc(s.version)}</div>
        </div>
      </div>
      <p class="desc">${esc(s.description)}</p>
      <div class="foot">
        <span class="pill cat">${esc(s.category)}</span>
        ${s.tags.slice(0, 3).map((t) => `<span class="pill">${esc(t)}</span>`).join('')}
        <span class="pill ver">${esc(s.license)}</span>
      </div>`;
    el.addEventListener('click', () => openModal(s.slug));
    return el;
  }

  function render() {
    const list = visible();
    const grid = $('#grid');
    grid.innerHTML = '';
    if (!list.length) {
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = state.query
        ? `No soul matches “${state.query}”. Try “incident”, “citations”, or clear the filters.`
        : 'No souls match those filters.';
      grid.appendChild(d);
    } else {
      for (const s of list) grid.appendChild(card(s));
    }
    const bits = [`${list.length} of ${state.souls.length} souls`];
    if (state.category) bits.push(`category: ${state.category}`);
    if (state.tag) bits.push(`tag: ${state.tag}`);
    if (state.query) bits.push(`query: “${state.query}”`);
    $('#resultline').textContent = bits.join('  ·  ');
  }

  function renderTags() {
    const counts = new Map();
    for (const s of state.souls) for (const t of s.tags) counts.set(t, (counts.get(t) || 0) + 1);
    const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 16);
    const box = $('#tags');
    box.innerHTML = '';
    for (const [tag, n] of tags) {
      const b = document.createElement('button');
      b.className = 'tag' + (state.tag === tag ? ' on' : '');
      b.type = 'button';
      b.textContent = `${tag} ${n}`;
      b.addEventListener('click', () => {
        state.tag = state.tag === tag ? '' : tag;
        renderTags();
        render();
      });
      box.appendChild(b);
    }
  }

  function renderStats(stats) {
    const cats = Object.keys(stats.categories || {}).length;
    const tags = Object.keys(stats.tags || {}).length;
    const hosts = Object.keys(stats.compatibility || {}).length;
    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v); };
    set('#stat-souls', stats.souls ?? state.souls.length);
    set('#stat-cats', cats);
    set('#stat-tags', tags);
    set('#stat-hosts', hosts);
    if (stats.generated) {
      const d = new Date(stats.generated);
      const el = $('#built');
      if (el && !isNaN(d)) el.textContent = 'registry built ' + d.toISOString().slice(0, 10);
    }
  }

  /* -------------------------------------------------------------------- modal */

  function openModal(slug, keepTab) {
    const s = state.souls.find((x) => x.slug === slug);
    if (!s) return;
    state.active = s;
    if (!keepTab) state.tab = 'SOUL.md';

    $('#modal-title').textContent = s.name;
    $('#modal-meta').textContent =
      `@${s.author} · ${s.slug} · v${s.version} · ${s.category} · ${s.license}`;

    const actions = $('#modal-actions');
    actions.innerHTML = '';
    const mk = (label, fn, ghost = true) => {
      const b = document.createElement('button');
      b.className = 'btn' + (ghost ? ' ghost' : '');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      actions.appendChild(b);
    };
    mk('Copy SOUL.md', () => copyText(s.body, 'SOUL.md copied'));
    mk('Download .md', () => download(`${s.slug}-SOUL.md`, s.body));
    mk('Copy install command', () =>
      copyText(`npx github:ohgeeceee/soulregistry install ${s.slug} --to ./souls`, 'Install command copied'));

    const tabs = $('#modal-tabs');
    tabs.innerHTML = '';
    const files = ['SOUL.md', ...(s.extras || [])];
    for (const f of files) {
      const b = document.createElement('button');
      b.className = 'tab' + (f === state.tab ? ' on' : '');
      b.type = 'button';
      b.textContent = f;
      b.addEventListener('click', () => { state.tab = f; openModal(slug, true); });
      tabs.appendChild(b);
    }
    tabs.style.display = files.length > 1 ? 'flex' : 'none';

    const content = state.tab === 'SOUL.md' ? s.body : (s.extrasBody || {})[state.tab] || '';
    $('#modal-body').innerHTML = renderMarkdown(content);

    $('#modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#modal-close').focus();
  }

  function closeModal() {
    $('#modal').classList.remove('open');
    document.body.style.overflow = '';
    state.active = null;
  }

  /* --------------------------------------------------------------------- init */

  function wire() {
    const q = $('#q');
    q.addEventListener('input', () => { state.query = q.value; render(); });

    const cat = $('#cat');
    cat.addEventListener('change', () => { state.category = cat.value; render(); });

    const sort = $('#sort');
    sort.addEventListener('change', () => { state.sort = sort.value; render(); });

    $('#modal-close').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if ($('#modal').classList.contains('open')) closeModal(); return; }
      if (e.key === '/' && document.activeElement !== q && !$('#modal').classList.contains('open')) {
        e.preventDefault();
        q.focus();
      }
    });

    for (const el of document.querySelectorAll('[data-copy]')) {
      el.addEventListener('click', () => copyText(el.getAttribute('data-copy'), 'Copied to clipboard'));
    }
  }

  async function load() {
    try {
      const [soulsRes, statsRes] = await Promise.all([
        fetch(DATA_BASE + 'souls.json', { cache: 'no-cache' }),
        fetch(DATA_BASE + 'stats.json', { cache: 'no-cache' }).catch(() => null),
      ]);
      if (!soulsRes.ok) throw new Error(`HTTP ${soulsRes.status}`);
      const data = await soulsRes.json();
      state.souls = (data.souls || []).slice();

      const catSel = $('#cat');
      const cats = [...new Set(state.souls.map((s) => s.category))].sort();
      for (const c of cats) {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        catSel.appendChild(o);
      }

      renderStats(statsRes && statsRes.ok ? await statsRes.json() : {
        souls: state.souls.length,
        categories: {},
        tags: {},
        compatibility: {},
        generated: data.generated,
      });

      renderTags();
      render();
    } catch (e) {
      const grid = $('#grid');
      grid.innerHTML = `<div class="empty">Could not load the registry data (${esc(e.message)}).<br>
        If you are running this locally, serve the repository root over HTTP:<br>
        <code>python3 -m http.server 8080</code></div>`;
    }
  }

  wire();
  load();
})();