/**
 * app.js — Trang bảng giá công khai
 * - Đọc dữ liệu từ data/prices.json (hoặc localStorage nếu ?preview=1)
 * - Hỗ trợ: tìm kiếm, filter tab, scroll-to-top, stats bar
 */
(function () {
  'use strict';

  // Emoji icon map cho từng danh mục
  const CAT_ICONS = {
    'nong-trai': '🌾',
    'thoi-tiet': '⛅',
    'tim-sao': '💖',
    'default': '🏷️',
  };

  const fmt = (n) =>
    n > 0
      ? n.toLocaleString('vi-VN') + 'đ'
      : null; // null = "Liên hệ"

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  /* ─── Load dữ liệu ─────────────────────────────────────────────── */
  async function load() {
    // Preview mode: đọc từ localStorage (cùng origin với admin)
    if (new URLSearchParams(location.search).has('preview')) {
      const draft = localStorage.getItem('prices-draft');
      if (draft) return JSON.parse(draft);
    }
    // Cache-bust để luôn lấy file mới nhất
    const res = await fetch('data/prices.json?v=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* ─── Render ────────────────────────────────────────────────────── */
  function render(data) {
    const tabs = document.getElementById('tabs');
    const content = document.getElementById('content');
    const statsBar = document.getElementById('statsBar');
    tabs.innerHTML = '';
    content.innerHTML = '';

    // --- Search bar ---
    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-wrap';
    const siteLang = window.__siteLang || 'vi';
    const searchPh = (window.__siteI18n && window.__siteI18n.searchPlaceholder) || 'Tìm dịch vụ…';
    searchWrap.innerHTML = `
      <span class="s-icon">🔍</span>
      <input type="search" id="searchInput" placeholder="${searchPh}" autocomplete="off" aria-label="Tìm dịch vụ">
    `;
    content.appendChild(searchWrap);

    // --- Stats ---
    let totalItems = 0;
    data.categories.forEach(c => { totalItems += (c.items || []).length; });
    if (statsBar) {
      statsBar.style.display = '';
      document.getElementById('statCats').textContent = data.categories.length;
      document.getElementById('statItems').textContent = totalItems;
    }

    // --- Tabs & sections ---
    const sections = [];
    data.categories.forEach((cat, idx) => {
      const icon = CAT_ICONS[cat.id] || CAT_ICONS.default;

      // Tab
      const tab = el('a', '');
      tab.href = '#' + cat.id;
      tab.style.setProperty('--c', cat.color);
      tab.innerHTML = `<span>${icon} ${cat.title}</span>`;
      if (idx === 0) tab.classList.add('active');
      tabs.appendChild(tab);

      // Section
      const sec = el('section', 'section');
      sec.id = cat.id;
      sec.style.setProperty('--c', cat.color);

      const head = el('div', 'section-head');
      const h2 = el('h2');
      h2.innerHTML = `<span>${icon}</span> ${cat.title}`;
      head.appendChild(h2);
      if (cat.note) head.appendChild(el('p', '', cat.note));
      sec.appendChild(head);

      const grid = el('div', 'grid');
      grid.dataset.catId = cat.id;

      (cat.items || []).forEach((it) => {
        const card = el('div', 'item');
        card.dataset.name = (it.name + ' ' + (it.note || '') + ' ' + (it.description || '')).toLowerCase();
        const info = el('div');
        info.appendChild(el('div', 'item-name', it.name));
        if (it.description) info.appendChild(el('div', 'item-desc', it.description));
        if (it.note) info.appendChild(el('div', 'item-note', it.note));

        const priceFormatted = fmt(it.price);
        if (priceFormatted) {
          info.appendChild(el('div', 'item-price', priceFormatted));
        } else {
          const contact = el('div', 'item-price-contact');
          contact.innerHTML = '📞 Liên hệ';
          info.appendChild(contact);
        }
        card.appendChild(info);
        grid.appendChild(card);
      });

      sec.appendChild(grid);
      content.appendChild(sec);
      sections.push(sec);
    });

    // --- Cập nhật ngày & contact ---
    document.getElementById('updated').textContent = data.updated || 'N/A';
    const contactEl = document.getElementById('contact');
    if (data.contact) {
      document.getElementById('contactLabel').textContent = data.contact.label || 'Liên hệ đặt dịch vụ';
      contactEl.href = data.contact.link || '#';
    }

    // --- Active tab on scroll (Intersection Observer) ---
    const tabLinks = [...tabs.querySelectorAll('a')];
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              tabLinks.forEach((a) => a.classList.remove('active'));
              const active = tabLinks.find((a) => a.getAttribute('href') === '#' + entry.target.id);
              if (active) active.classList.add('active');
            }
          });
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      sections.forEach((s) => obs.observe(s));
    }

    // --- Search / filter ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        const noResultText = (window.__siteI18n && window.__siteI18n.noResult) || '😕 Không tìm thấy dịch vụ phù hợp';
        sections.forEach((sec) => {
          const grid = sec.querySelector('.grid');
          const cards = [...grid.querySelectorAll('.item')];
          let visible = 0;
          cards.forEach((card) => {
            const match = !q || card.dataset.name.includes(q);
            card.style.display = match ? '' : 'none';
            if (match) visible++;
          });
          // No-results message
          let noRes = grid.querySelector('.no-results');
          if (visible === 0 && q) {
            if (!noRes) {
              noRes = el('p', 'no-results', noResultText);
              grid.appendChild(noRes);
            } else {
              noRes.textContent = noResultText;
            }
          } else {
            if (noRes) noRes.remove();
          }
        });
      });

      // React to language change
      document.addEventListener('langchange', (e) => {
        const i18n = e.detail && e.detail.i18n;
        if (i18n && i18n.searchPlaceholder) searchInput.placeholder = i18n.searchPlaceholder;
        // Update contact label
        const contactLabelEl = document.getElementById('contactLabel');
        if (contactLabelEl && i18n && i18n.contact) {
          // Only override if it's still the default
          const defaultLabels = ['Liên hệ đặt dịch vụ', 'Contact to order'];
          if (defaultLabels.includes(contactLabelEl.textContent.trim())) {
            contactLabelEl.textContent = i18n.contact;
          }
        }
      });
    }
  }

  /* ─── Scroll to top ─────────────────────────────────────────────── */
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('show', window.scrollY > 300);
    }, { passive: true });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Boot ──────────────────────────────────────────────────────── */
  load()
    .then(render)
    .catch((err) => {
      const content = document.getElementById('content');
      content.innerHTML = '';
      const msg = el('p', 'error');
      msg.innerHTML = `⚠️ Không tải được bảng giá. Vui lòng thử lại sau.<br><small style="opacity:.6">${err.message}</small>`;
      content.appendChild(msg);
    });
})();
