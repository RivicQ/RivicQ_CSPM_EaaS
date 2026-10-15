/* RivicQ rendered docs. Hash #types opens the library. #types/<slug> renders one file. */
(function () {
  'use strict';

  var FILES = {
    security: ['SECURITY.md'],
    legal: ['LEGAL.md'],
    privacy: ['PRIVACY.md'],
    trademarks: ['TRADEMARKS.md'],
    contributing: ['CONTRIBUTING.md'],
    datasets: ['DATASETS.md'],
    notice: ['NOTICE'],
    readme: ['README.md'],
    architecture: ['ARCHITECTURE.md'],
    bom_framework: ['BOM_FRAMEWORK.md'],
    client_architecture: ['CLIENT_ARCHITECTURE.md'],
    contact: ['CONTACT.md'],
    known_limitations: ['KNOWN_LIMITATIONS.md'],
    pqc_migration: ['PQC_MIGRATION.md'],
    editions: ['editions.md'],
    roadmap: ['ROADMAP.md'],
    product_status: ['PRODUCT_STATUS.md'],
    platform: ['PLATFORM.md'],
    fabric: ['FABRIC.md'],
    graph: ['GRAPH.md'],
    integrations: ['INTEGRATIONS.md'],
    render: ['RENDER.md'],
    core_engine: ['CORE_ENGINE.md'],
    design_system: ['DESIGN_SYSTEM.md'],
    engineering_audit: ['ENGINEERING_AUDIT.md'],
    qiskit_pipeline: ['QISKIT_PIPELINE.md']
  };

  var CATALOG = [
    { slug: 'security', title: 'Security policy', note: 'How to report a vulnerability. No public exploit issues.' },
    { slug: 'legal', title: 'Legal', note: 'Apache-2.0 Community. Enterprise needs a written license.' },
    { slug: 'privacy', title: 'Privacy', note: 'What the public Pages demo does and does not collect.' },
    { slug: 'trademarks', title: 'Trademarks', note: 'Names and marks. RivicQ is not an IBM product.' },
    { slug: 'editions', title: 'Editions', note: 'Community CBOM/SBOM versus Enterprise layers.' },
    { slug: 'bom_framework', title: 'BOM lenses', note: 'CSPM, CBOM, SBOM, HBOM, AIBOM, IBOM, and QBOM.' },
    { slug: 'pqc_migration', title: 'PQC migration', note: 'Planning notes. This site does not rotate keys.' },
    { slug: 'architecture', title: 'Architecture', note: 'How the engine, console, and Pages build fit together.' },
    { slug: 'roadmap', title: 'Roadmap', note: 'What is in the Community tree and what stays licensed.' },
    { slug: 'known_limitations', title: 'Known limitations', note: 'What a scan does not claim.' },
    { slug: 'contact', title: 'Contact', note: 'Public desks. Admin mailboxes are not product contacts.' },
    { slug: 'readme', title: 'Repository readme', note: 'How to build and what the project is.' }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugFromHash() {
    var hash = (location.hash || '').replace(/^#/, '');
    if (hash === 'types') return '';
    if (hash.indexOf('types/') === 0) return decodeURIComponent(hash.slice('types/'.length)).toLowerCase();
    return null;
  }

  function fileNames(slug) {
    if (FILES[slug]) return FILES[slug];
    if (!slug) return [];
    return [slug + '.md', slug.toUpperCase() + '.md'];
  }

  function candidates(name) {
    return ['library/' + name, '../../' + name, '../../docs/' + name];
  }

  function fetchFirst(names) {
    var queue = [];
    names.forEach(function (name) {
      candidates(name).forEach(function (path) { queue.push(path); });
    });
    function next(index) {
      if (index >= queue.length) return Promise.reject(new Error('missing'));
      return fetch(queue[index], { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) return next(index + 1);
        return response.text();
      }).catch(function () { return next(index + 1); });
    }
    return next(0);
  }

  function rewriteHref(href) {
    var cleaned = href.trim().replace(/^\.\//, '');
    var name = cleaned.split('/').pop() || '';
    var stem = name.replace(/\.md$/i, '');
    if (/\.md$/i.test(name) || name === 'NOTICE') {
      return '#types/' + stem.toLowerCase();
    }
    if (cleaned.indexOf('contact.html') !== -1) return '#types/contact';
    return href;
  }

  function inline(text) {
    var safe = escapeHtml(text);
    safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var url = rewriteHref(href.replace(/&amp;/g, '&'));
      var external = /^https?:/i.test(url) || /^mailto:/i.test(url);
      var attrs = external ? ' href="' + escapeHtml(url) + '" rel="noreferrer"' : ' href="' + escapeHtml(url) + '"';
      return '<a' + attrs + '>' + label + '</a>';
    });
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    return safe;
  }

  function renderMarkdown(source) {
    var lines = source.replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var i = 0;
    function flushParagraph(buf) {
      if (!buf.length) return;
      html.push('<p>' + inline(buf.join(' ')) + '</p>');
    }
    var para = [];
    while (i < lines.length) {
      var line = lines[i];
      if (/^```/.test(line)) {
        flushParagraph(para);
        para = [];
        var code = [];
        i += 1;
        while (i < lines.length && !/^```/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
        i += 1;
        continue;
      }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        flushParagraph(para);
        para = [];
        var headers = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(splitRow(lines[i]));
          i += 1;
        }
        html.push(tableHtml(headers, rows));
        continue;
      }
      if (/^#{1,4}\s+/.test(line)) {
        flushParagraph(para);
        para = [];
        var level = line.match(/^#+/)[0].length;
        html.push('<h' + level + '>' + inline(line.replace(/^#{1,4}\s+/, '')) + '</h' + level + '>');
        i += 1;
        continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        flushParagraph(para);
        para = [];
        var items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push('<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>');
          i += 1;
        }
        html.push('<ul>' + items.join('') + '</ul>');
        continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        flushParagraph(para);
        para = [];
        var ordered = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          ordered.push('<li>' + inline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>');
          i += 1;
        }
        html.push('<ol>' + ordered.join('') + '</ol>');
        continue;
      }
      if (/^\s*>/.test(line)) {
        flushParagraph(para);
        para = [];
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i += 1;
        }
        html.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
        continue;
      }
      if (/^\s*$/.test(line) || /^---\s*$/.test(line)) {
        flushParagraph(para);
        para = [];
        i += 1;
        continue;
      }
      para.push(line.trim());
      i += 1;
    }
    flushParagraph(para);
    return html.join('\n');
  }

  function splitRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) {
      return cell.trim();
    });
  }

  function tableHtml(headers, rows) {
    var head = '<tr>' + headers.map(function (cell) { return '<th>' + inline(cell) + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + inline(cell) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<div class="doc-table-scroll"><table>' + head + body + '</table></div>';
  }

  function catalogHtml(active) {
    return CATALOG.map(function (item) {
      var pressed = item.slug === active ? ' aria-current="page"' : '';
      return '<a class="doc-link"' + pressed + ' href="#types/' + item.slug + '"><strong>' + item.title + '</strong><span>' + item.note + '</span></a>';
    }).join('');
  }

  var nav = document.getElementById('doc-nav');
  var article = document.getElementById('doc-article');
  if (!nav || !article) return;

  function showCatalog() {
    nav.innerHTML = catalogHtml('');
    article.innerHTML = '<h2>Documents</h2><p>Policies, editions, and the scan story render here. Tables scroll. This Pages build is a labeled synthetic demo: mappings are not certifications, and secret values are not published.</p>';
  }

  function showDoc(slug) {
    nav.innerHTML = catalogHtml(slug);
    article.innerHTML = '<p>Loading ' + escapeHtml(slug) + '…</p>';
    var names = fileNames(slug);
    fetchFirst(names).then(function (text) {
      article.innerHTML = renderMarkdown(text);
    }).catch(function () {
      article.innerHTML = '<h2>Document not in this build</h2><p>No rendered copy of <code>' + escapeHtml(slug) + '</code> was found next to this page. The source file stays in the repository. Mappings are not certifications, and this site does not publish secrets.</p>';
    });
  }

  function sync() {
    var slug = slugFromHash();
    if (slug === null) return;
    if (!slug) showCatalog();
    else showDoc(slug);
    if ((location.hash || '').indexOf('#types') === 0) {
      var section = document.getElementById('doc-article') || document.getElementById('types');
      if (section) section.scrollIntoView();
    }
  }

  window.addEventListener('hashchange', sync);
  if ((location.hash || '').indexOf('#types') === 0) sync();
  else showCatalog();
})();
