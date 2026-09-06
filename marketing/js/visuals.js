/**
 * RivicQ CryptoBOM — Interactive Visual Engine
 * Canvas network graph, animated charts, and live metric simulations
 */
(function () {
  'use strict';

  const COLORS = {
    blue: '#6366f1',
    purple: '#7c3aed',
    green: '#10b981',
    gold: '#fbbf24',
    red: '#ef4444',
    muted: '#64748b',
  };

  /* ── Hero Network Canvas ─────────────────────────────────── */
  function initHeroNetwork() {
    const canvas = document.getElementById('heroNetwork');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let w, h, nodes, edges, mouse = { x: -999, y: -999 };
    let animId;

    const NODE_DEFS = [
      { label: 'AES-256', type: 'classic' },
      { label: 'RSA-4096', type: 'critical' },
      { label: 'ECDSA', type: 'classic' },
      { label: 'TLS 1.3', type: 'safe' },
      { label: 'Kyber-768', type: 'pqc' },
      { label: 'Dilithium', type: 'pqc' },
      { label: 'SHA-3', type: 'safe' },
      { label: 'ChaCha20', type: 'safe' },
      { label: 'HSM/KMS', type: 'infra' },
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
      initNodes();
    }

    function initNodes() {
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.32;
      nodes = NODE_DEFS.map((def, i) => {
        const angle = (i / NODE_DEFS.length) * Math.PI * 2 - Math.PI / 2;
        return {
          ...def,
          x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
          y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
          baseX: cx + Math.cos(angle) * radius,
          baseY: cy + Math.sin(angle) * radius,
          r: def.type === 'infra' ? 14 : 10,
          pulse: Math.random() * Math.PI * 2,
        };
      });
      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        edges.push([i, (i + 1) % nodes.length]);
        if (i % 3 === 0) edges.push([i, (i + 3) % nodes.length]);
      }
      edges.push([4, 5]); // PQC link
    }

    function nodeColor(type) {
      switch (type) {
        case 'critical': return COLORS.red;
        case 'pqc': return COLORS.purple;
        case 'safe': return COLORS.green;
        case 'infra': return COLORS.gold;
        default: return COLORS.blue;
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(148,163,184,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Center hub pulse
      const cx = w / 2, cy = h / 2;
      const hubPulse = 0.5 + 0.5 * Math.sin(t * 0.002);
      const hubR = 28 + hubPulse * 6;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR * 2);
      grad.addColorStop(0, 'rgba(79,70,229,0.3)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, hubR * 2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#4f46e5';
      ctx.beginPath(); ctx.arc(cx, cy, hubR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CBOM', cx, cy - 6);
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('Engine', cx, cy + 8);

      // Edges with data flow particles
      edges.forEach(([a, b], ei) => {
        const na = nodes[a], nb = nodes[b];
        ctx.strokeStyle = 'rgba(99,102,241,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.stroke();

        const progress = ((t * 0.0003 + ei * 0.17) % 1);
        const px = na.x + (nb.x - na.x) * progress;
        const py = na.y + (nb.y - na.y) * progress;
        ctx.fillStyle = 'rgba(129,140,248,0.8)';
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
      });

      // Nodes
      nodes.forEach((n, i) => {
        n.pulse += 0.03;
        const hoverDist = Math.hypot(mouse.x - n.x, mouse.y - n.y);
        const hover = hoverDist < 30;
        const pulseR = n.r + Math.sin(n.pulse) * 2 + (hover ? 4 : 0);

        if (hover) {
          n.x += (mouse.x - n.x) * 0.02;
          n.y += (mouse.y - n.y) * 0.02;
        } else {
          n.x += (n.baseX - n.x) * 0.04;
          n.y += (n.baseY - n.y) * 0.04;
        }

        const color = nodeColor(n.type);
        ctx.shadowColor = color;
        ctx.shadowBlur = hover ? 20 : 10;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#e2e8f0';
        ctx.font = `${hover ? '600' : '500'} ${hover ? 11 : 10}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + pulseR + 14);
      });

      animId = requestAnimationFrame(draw);
    }

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animId);
  }

  /* ── Mini Bar Chart (Feature Card) ───────────────────────── */
  function initFeatureChart() {
    const canvas = document.getElementById('featureChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const data = [
      { label: 'Critical', value: 12, color: COLORS.red },
      { label: 'High', value: 28, color: '#ea580c' },
      { label: 'Medium', value: 45, color: COLORS.gold },
      { label: 'Low', value: 89, color: COLORS.green },
      { label: 'PQC Ready', value: 34, color: COLORS.purple },
    ];
    let progress = 0;

    function draw() {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const barW = (w - 60) / data.length;
      const maxVal = Math.max(...data.map(d => d.value));

      data.forEach((d, i) => {
        const x = 30 + i * barW + barW * 0.15;
        const barH = (d.value / maxVal) * (h - 50) * Math.min(progress, 1);
        const y = h - 30 - barH;

        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(x, y, barW * 0.7, barH, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, x + barW * 0.35, h - 10);

        if (progress >= 1) {
          ctx.fillStyle = '#f1f5f9';
          ctx.font = '600 10px JetBrains Mono, monospace';
          ctx.fillText(d.value, x + barW * 0.35, y - 6);
        }
      });

      if (progress < 1) {
        progress += 0.02;
        requestAnimationFrame(draw);
      }
    }

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
    draw();
  }

  /* ── Live Metric Simulation ──────────────────────────────── */
  function initLiveMetrics() {
    const metrics = [
      { id: 'metricAssets', base: 12847, variance: 12, suffix: '' },
      { id: 'metricFindings', base: 342, variance: 3, suffix: '' },
      { id: 'metricPQC', base: 67, variance: 0, suffix: '%' },
    ];

    metrics.forEach(m => {
      const el = document.getElementById(m.id);
      if (!el) return;
      setInterval(() => {
        const val = m.base + Math.floor((Math.random() - 0.5) * m.variance * 2);
        el.textContent = val.toLocaleString() + m.suffix;
      }, 3000);
    });

    // Hero overlay metrics
    const overlayMetrics = [
      { id: 'heroCritical', base: 23, color: 'critical' },
      { id: 'heroPQC', base: 67, color: 'quantum', suffix: '%' },
      { id: 'heroCompliant', base: 94, color: 'success', suffix: '%' },
    ];

    overlayMetrics.forEach(m => {
      const el = document.getElementById(m.id);
      if (!el) return;
      setInterval(() => {
        const delta = Math.floor((Math.random() - 0.5) * 4);
        const val = Math.max(0, Math.min(100, m.base + delta));
        el.textContent = val + (m.suffix || '');
      }, 4000);
    });
  }

  /* ── Posture Score Animation ─────────────────────────────── */
  function initPostureScore() {
    const ring = document.getElementById('postureRing');
    const scoreEl = document.getElementById('postureScoreValue');
    const section = document.getElementById('postureSection');
    if (!ring || !scoreEl || !section) return;

    const targetScore = 78;
    const circumference = 754;
    let animated = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          const offset = circumference - (targetScore / 100) * circumference;
          ring.style.strokeDashoffset = offset;

          let current = 0;
          const step = () => {
            current += 1;
            scoreEl.textContent = current;
            if (current < targetScore) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);

          document.querySelectorAll('.posture-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width + '%';
          });
        }
      });
    }, { threshold: 0.3 });

    observer.observe(section);
  }

  /* ── Animated Counters ───────────────────────────────────── */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        const start = performance.now();

        function tick(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(target * eased).toLocaleString() + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }

  /* ── Cloud Provider Interaction ──────────────────────────── */
  function initCloudProviders() {
    const providers = document.querySelectorAll('.cloud-provider');
    const stats = {
      aws: { assets: '4,821', keys: '892', findings: '47', score: '82' },
      azure: { assets: '3,156', keys: '634', findings: '31', score: '79' },
      gcp: { assets: '2,890', keys: '521', findings: '28', score: '85' },
      ibm: { assets: '1,980', keys: '412', findings: '19', score: '88' },
      k8s: { assets: '6,240', keys: '1,204', findings: '62', score: '74' },
    };

    providers.forEach(btn => {
      btn.addEventListener('click', () => {
        providers.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.dataset.provider;
        const s = stats[key];
        if (!s) return;
        ['cloudAssets', 'cloudKeys', 'cloudFindings', 'cloudScore'].forEach((id, i) => {
          const el = document.getElementById(id);
          if (el) {
            el.style.opacity = '0';
            setTimeout(() => {
              el.textContent = Object.values(s)[i];
              el.style.opacity = '1';
            }, 150);
          }
        });
      });
    });

    if (providers[0]) providers[0].click();
  }

  /* ── Scroll Reveal ───────────────────────────────────────── */
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .timeline-item');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => observer.observe(el));
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    initHeroNetwork();
    initFeatureChart();
    initLiveMetrics();
    initPostureScore();
    initCounters();
    initCloudProviders();
    initScrollReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
