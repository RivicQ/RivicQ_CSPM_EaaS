/**
 * RivicQ CryptoBOM — Interactive Showcase Dashboard
 */
(function () {
  'use strict';

  const COLORS = {
    rsa: '#ef4444',
    ecdsa: '#ea580c',
    aes: '#6366f1',
    sha: '#ca8a04',
    tls: '#10b981',
    pqc: '#7c3aed',
    other: '#64748b',
  };

  /* ── Donut Chart ─────────────────────────────────────────── */
  function initAlgoChart() {
    const canvas = document.getElementById('algoChart');
    const legend = document.getElementById('algoLegend');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const data = [
      { label: 'RSA', value: 28, color: COLORS.rsa },
      { label: 'ECDSA/ECDH', value: 22, color: COLORS.ecdsa },
      { label: 'AES', value: 24, color: COLORS.aes },
      { label: 'SHA/Hash', value: 12, color: COLORS.sha },
      { label: 'TLS/SSL', value: 8, color: COLORS.tls },
      { label: 'PQC', value: 6, color: COLORS.pqc },
    ];
    let progress = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) * 0.38;
      const innerR = outerR * 0.58;
      const total = data.reduce((s, d) => s + d.value, 0);
      let angle = -Math.PI / 2;

      data.forEach(d => {
        const slice = (d.value / total) * Math.PI * 2 * Math.min(progress, 1);
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, angle, angle + slice);
        ctx.arc(cx, cy, innerR, angle + slice, angle, true);
        ctx.closePath();
        ctx.fillStyle = d.color;
        ctx.fill();
        angle += slice;
      });

      // Center text
      if (progress >= 0.5) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '700 28px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total.toString(), cx, cy - 8);
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Algorithms', cx, cy + 14);
      }

      if (progress < 1) {
        progress += 0.025;
        requestAnimationFrame(draw);
      }
    }

    if (legend) {
      legend.innerHTML = data.map(d =>
        `<div class="legend-item"><span class="legend-dot" style="background:${d.color}"></span>${d.label} (${d.value}%)</div>`
      ).join('');
    }

    resize();
    window.addEventListener('resize', () => { resize(); progress = 1; draw(); });
    draw();
  }

  /* ── Asset Topology Map ────────────────────────────────────── */
  function initAssetMap() {
    const canvas = document.getElementById('assetMap');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let w, h, nodes, animId;

    const ZONES = [
      { label: 'AWS', x: 0.25, y: 0.3, color: '#ff9900', count: 38 },
      { label: 'Azure', x: 0.75, y: 0.25, color: '#0078d4', count: 25 },
      { label: 'GCP', x: 0.5, y: 0.7, color: '#4285f4', count: 18 },
      { label: 'K8s', x: 0.2, y: 0.75, color: '#326ce5', count: 12 },
      { label: 'IBM', x: 0.8, y: 0.65, color: '#054ada', count: 7 },
    ];

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = ZONES.map(z => ({
        ...z,
        px: z.x * w,
        py: z.y * h,
        r: 20 + z.count * 0.5,
        pulse: Math.random() * Math.PI * 2,
      }));
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);

      // Connections to center
      const cx = w / 2, cy = h / 2;
      nodes.forEach(n => {
        ctx.strokeStyle = 'rgba(99,102,241,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(n.px, n.py);
        ctx.stroke();

        const progress = ((t * 0.0004) % 1);
        const px = cx + (n.px - cx) * progress;
        const py = cy + (n.py - cy) * progress;
        ctx.fillStyle = 'rgba(129,140,248,0.6)';
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
      });

      // Center hub
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '600 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CBOM', cx, cy);

      // Zone nodes
      nodes.forEach(n => {
        n.pulse += 0.02;
        const pulseR = n.r + Math.sin(n.pulse) * 3;

        ctx.fillStyle = n.color + '22';
        ctx.beginPath(); ctx.arc(n.px, n.py, pulseR + 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = n.color;
        ctx.beginPath(); ctx.arc(n.px, n.py, pulseR, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.px, n.py + pulseR + 16);
        ctx.font = '500 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(n.count + '%', n.px, n.py + pulseR + 28);
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(draw);
  }

  /* ── Findings Filter Tabs ────────────────────────────────── */
  function initFindingsFilter() {
    const tabs = document.querySelectorAll('.panel-tab[data-filter]');
    const rows = document.querySelectorAll('#findingsBody tr');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;

        rows.forEach(row => {
          const sev = row.dataset.severity;
          const show = filter === 'all' ||
            (filter === 'critical' && sev === 'critical') ||
            (filter === 'pqc' && (sev === 'pqc' || row.querySelector('.algo-tag')?.textContent.includes('Kyber')));
          row.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* ── Cloud Bar Animation ───────────────────────────────────── */
  function initCloudBars() {
    const bars = document.querySelectorAll('.cloud-row-fill');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.dataset.width + '%';
        }
      });
    }, { threshold: 0.5 });
    bars.forEach(b => observer.observe(b));
  }

  /* ── Simulated Scan ────────────────────────────────────────── */
  function initScanSimulation() {
    const btn = document.getElementById('scanBtn');
    const progress = document.getElementById('scanProgress');
    const bar = document.getElementById('scanProgressBar');
    const kpiAssets = document.getElementById('kpiAssets');
    const kpiCritical = document.getElementById('kpiCritical');
    const feed = document.getElementById('activityFeed');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (btn.classList.contains('scanning')) return;
      btn.classList.add('scanning');
      btn.innerHTML = '⏳ Scanning…';
      progress.classList.add('visible');
      bar.style.width = '0%';

      let pct = 0;
      const interval = setInterval(() => {
        pct += Math.random() * 15 + 5;
        if (pct >= 100) {
          pct = 100;
          clearInterval(interval);
          setTimeout(() => {
            btn.classList.remove('scanning');
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Run CBOM Scan';
            progress.classList.remove('visible');

            // Update KPIs
            if (kpiAssets) kpiAssets.textContent = (12847 + Math.floor(Math.random() * 200)).toLocaleString();
            if (kpiCritical) kpiCritical.textContent = Math.max(15, 23 - Math.floor(Math.random() * 5));

            // Add activity
            if (feed) {
              const item = document.createElement('div');
              item.className = 'activity-item';
              item.innerHTML = `
                <div class="activity-icon scan">🔍</div>
                <div>
                  <div class="activity-text">CBOM scan completed — <strong>${Math.floor(Math.random() * 50 + 10)} new assets</strong> discovered</div>
                  <div class="activity-time">Just now</div>
                </div>`;
              feed.prepend(item);
            }
          }, 500);
        }
        bar.style.width = pct + '%';
      }, 300);
    });
  }

  /* ── Live KPI Ticker ───────────────────────────────────────── */
  function initKPITicker() {
    setInterval(() => {
      const pqc = document.getElementById('kpiPQC');
      if (pqc) {
        const val = 67 + Math.floor((Math.random() - 0.5) * 2);
        pqc.textContent = val + '%';
      }
    }, 5000);
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    initAlgoChart();
    initAssetMap();
    initFindingsFilter();
    initCloudBars();
    initScanSimulation();
    initKPITicker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
