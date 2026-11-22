/**
 * FreshMart RSMS - photos.js
 * Adds free-licence Unsplash photos: login background, dashboard banner, category photos, product photos.
 * Every photo has a fallback: if it cannot load (offline, blocked link), the page looks as it did before.
 *
 * To add or change a photo, edit the PHOTOS table below. The id is the last part of the photo's
 * Unsplash page address, e.g. https://unsplash.com/photos/some-title-GPxxXAbzsXU  ->  GPxxXAbzsXU
 */
(function () {
  'use strict';

  const PHOTOS = {
    login: 'N_e5v6g-IXc',                 // bright supermarket aisle
    banner: 'ezeC8-clZSs',                // food aisle
    categories: {                         // category name (lower case) -> photo id
      'fruits & vegetables': 'GPxxXAbzsXU'
    },
    products: {                           // word in the product name (lower case) -> photo id
      // 'banana': 'PHOTO_ID',
    }
  };

  const url = (id, w) => `https://unsplash.com/photos/${id}/download?w=${w || 1000}`;
  const db = () => window.rsmsDB;

  /* ---------- 1. Login page background ---------- */
  function loginPhoto() {
    const screen = document.getElementById('loginScreen');
    if (!screen || !PHOTOS.login) return;
    const img = new Image();
    img.onload = () => {
      if (getComputedStyle(screen).position === 'static') screen.style.position = 'relative';
      screen.style.setProperty('--ph-login', `url("${img.src}")`);
      screen.classList.add('ph-ready');
    };
    img.src = url(PHOTOS.login, 1600);
  }

  /* ---------- 2. Dashboard banner ---------- */
  function dashboardBanner() {
    const view = document.getElementById('view-dashboard');
    if (!view || !PHOTOS.banner || document.getElementById('phBanner')) return;
    const grid = view.querySelector('.stats-grid');
    if (!grid) return;
    const s = (db() && db().getSettings()) || {};
    const box = document.createElement('div');
    box.className = 'ph-banner'; box.id = 'phBanner';
    const img = document.createElement('img');
    img.alt = ''; img.loading = 'lazy'; img.src = url(PHOTOS.banner, 1400);
    img.onerror = () => box.remove();
    const text = document.createElement('div'); text.className = 'ph-banner-text';
    const h = document.createElement('strong'); h.textContent = s.storeName || 'FreshMart';
    const t = document.createElement('span'); t.textContent = s.tagline || '';
    text.append(h, t);
    const credit = document.createElement('div'); credit.className = 'ph-credit'; credit.textContent = 'Photo: Unsplash';
    box.append(img, text, credit);
    grid.parentNode.insertBefore(box, grid);
  }

  /* ---------- 3. Category cards ---------- */
  function categoryPhotos() {
    const view = document.getElementById('view-categories');
    if (!view || !db()) return;
    const names = db().getCategories().map((c) => c.name);
    view.querySelectorAll('[class*="card"]').forEach((card) => {
      if (card.dataset.ph || card.querySelector('[class*="card"]')) return;
      const text = card.textContent.toLowerCase();
      const name = names.find((n) => text.includes(n.toLowerCase()));
      const id = name && PHOTOS.categories[name.toLowerCase()];
      card.dataset.ph = '1';
      if (!id) return;
      const strip = document.createElement('div'); strip.className = 'ph-cat-photo';
      const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = url(id, 600);
      img.onerror = () => strip.remove();
      strip.appendChild(img);
      card.insertBefore(strip, card.firstChild);
    });
  }

  /* ---------- 4. Product cards ---------- */
  function productPhotos() {
    const keys = Object.keys(PHOTOS.products);
    if (!keys.length) return;
    document.querySelectorAll('.product-card .product-img').forEach((el) => {
      if (el.tagName !== 'IMG' || el.dataset.ph) return;
      const text = (el.closest('.product-card').textContent || '').toLowerCase();
      const key = keys.find((k) => text.includes(k));
      el.dataset.ph = '1';
      if (!key) return;
      const original = el.src;
      el.onerror = () => { el.onerror = null; el.src = original; el.classList.remove('ph-photo'); };
      el.src = url(PHOTOS.products[key], 400);
      el.classList.add('ph-photo');
    });
  }

  function run() { try { dashboardBanner(); categoryPhotos(); productPhotos(); } catch (e) { console.warn('[photos]', e); } }

  loginPhoto();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; run(); });
  }).observe(document.body, { childList: true, subtree: true });
  run();
})();
