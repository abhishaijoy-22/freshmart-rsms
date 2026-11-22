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
      'groceries & staples': '2Vl1JZFmtOw',
      'dairy & eggs': 'c6TKtsi8C1k',
      'bakery & fresh': 'PO2GsmeN8hU',
      'fruits & vegetables': 'GPxxXAbzsXU'
    },
    products: {                           // full product name (lower case) -> photo id
      'milk (1 l)': '5SN5N5-JM3c',
      'whole wheat bread (400g)': 'nymRFkQD8Og',
      'multigrain bread (400 g)': '6D9C0lEkYVk',
      'pav buns (6 pack)': 'q-PulMeewiw'
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

  /* ---------- 3. Categories page (table rows) ---------- */
  function categoryPhotos() {
    const view = document.getElementById('view-categories');
    if (!view) return;
    view.querySelectorAll('tbody tr').forEach((row) => {
      if (row.dataset.ph) return;
      row.dataset.ph = '1';
      const name = row.querySelector('td strong');
      const id = name && PHOTOS.categories[name.textContent.trim().toLowerCase()];
      if (!id) return;
      const holder = name.parentElement;           // the inline-flex wrapper
      const icon = holder.firstElementChild;       // coloured icon square
      const img = new Image();
      img.className = 'ph-cat-thumb'; img.alt = ''; img.loading = 'lazy';
      img.onload = () => { if (icon && icon !== name) icon.replaceWith(img); else holder.prepend(img); };
      img.src = url(id, 200);                      // if it fails to load, the icon stays
    });
  }

  /* ---------- 4. Product cards and product tables ---------- */
  function productPhotos() {
    if (!Object.keys(PHOTOS.products).length) return;
    document.querySelectorAll('img.product-img, img.table-prod-thumb').forEach((el) => {
      if (el.dataset.ph) return;
      el.dataset.ph = '1';
      const id = PHOTOS.products[(el.alt || '').trim().toLowerCase()];
      if (!id) return;
      const original = el.src;
      el.onerror = () => { el.onerror = null; el.src = original; el.classList.remove('ph-photo'); };
      el.src = url(id, 400);
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
