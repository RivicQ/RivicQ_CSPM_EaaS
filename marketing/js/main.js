/**
 * RivicQ CryptoBOM — Marketing Site Interactions
 */
(function () {
  'use strict';

  /* ── Navigation scroll effect ────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile nav toggle ───────────────────────────────────── */
  const navToggle = document.getElementById('navToggle');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
    nav.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  /* ── Smooth anchor scroll with nav offset ────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── Compliance card hover highlight ─────────────────────── */
  document.querySelectorAll('.compliance-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      document.querySelectorAll('.compliance-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  /* ── Platform link resolver ──────────────────────────────── */
  const platformBase = detectPlatformUrl();
  document.querySelectorAll('[data-platform-link]').forEach(el => {
    el.href = platformBase + (el.dataset.platformPath || '');
  });

  function detectPlatformUrl() {
    const host = window.location.hostname;
    if (host.includes('github.io')) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const repo = parts[0] || 'RivicQ_CSPM_EaaS';
      return `/${repo}/platform`;
    }
    if (window.location.port === '5500' || window.location.port === '8080') {
      return 'http://localhost:3000/platform';
    }
    return '/platform';
  }
})();
