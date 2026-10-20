/**
 * app.js — Trang bảng giá công khai
 * - Đọc dữ liệu từ data/prices.json (hoặc localStorage nếu ?preview=1)
 * - Hỗ trợ: tìm kiếm, filter tab, scroll-to-top, stats bar
 * - i18n: Khi đổi ngôn ngữ → re-render toàn bộ nội dung (title, note, item name, …)
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
      : null; // null = "Liên hệ" / "Contact"

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  /* ─── State ─────────────────────────────────────────────────────── */
  let _data = null;
  let _lang = window.__siteLang || localStorage.getItem('site-lang') || 'vi';

  /* ─── Helper: lấy field theo ngôn ngữ ──────────────────────────── */
  // Nếu có field `xxx_en` và đang dùng EN → trả về field đó; fallback về field gốc
  function L(obj, field) {
    if (_lang === 'en') {
      const enVal = obj[field + '_en'];
      if (enVal !== undefined && enVal !== null) return enVal;
    }
    return obj[field] || '';
  }

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
    _data = data;

    const tabs = document.getElementById('tabs');
    const content = document.getElementById('content');
    const statsBar = document.getElementById('statsBar');
    tabs.innerHTML = '';
    content.innerHTML = '';

    // --- Search bar ---
    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-wrap';
    const searchPh = (window.__siteI18n && window.__siteI18n.searchPlaceholder)
      || (_lang === 'en' ? 'Search services…' : 'Tìm dịch vụ…');
    searchWrap.innerHTML = `
      <span class="s-icon">🔍</span>
      <input type="search" id="searchInput" placeholder="${searchPh}" autocomplete="off" aria-label="Search services">
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
      const catTitle = L(cat, 'title');
      const catNote  = L(cat, 'note');

      // Tab
      const tab = el('a', '');
      tab.href = '#' + cat.id;
      tab.style.setProperty('--c', cat.color);
      tab.innerHTML = `<span>${icon} ${catTitle}</span>`;
      if (idx === 0) tab.classList.add('active');
      tabs.appendChild(tab);

      // Section
      const sec = el('section', 'section');
      sec.id = cat.id;
      sec.style.setProperty('--c', cat.color);

      const head = el('div', 'section-head');
      const h2 = el('h2');
      h2.innerHTML = `<span>${icon}</span> ${catTitle}`;
      head.appendChild(h2);
      if (catNote) head.appendChild(el('p', '', catNote));
      sec.appendChild(head);

      const grid = el('div', 'grid');
      grid.dataset.catId = cat.id;

      (cat.items || []).forEach((it) => {
        const itemName = L(it, 'name');
        const itemNote = L(it, 'note');
        const itemDesc = L(it, 'description');

        const card = el('div', 'item');
        // dataset.name dùng để search – ghép cả vi lẫn en để tìm được cả hai
        const searchStr = [
          it.name, it.name_en, it.note, it.note_en, it.description, it.description_en
        ].filter(Boolean).join(' ').toLowerCase();
        card.dataset.name = searchStr;

        const info = el('div');
        info.appendChild(el('div', 'item-name', itemName));
        if (itemDesc) info.appendChild(el('div', 'item-desc', itemDesc));
        if (itemNote) info.appendChild(el('div', 'item-note', itemNote));

        const priceFormatted = fmt(it.price);
        if (priceFormatted) {
          info.appendChild(el('div', 'item-price', priceFormatted));
        } else {
          const contact = el('div', 'item-price-contact');
          contact.innerHTML = _lang === 'en' ? '📞 Contact' : '📞 Liên hệ';
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
      const contactLabel = document.getElementById('contactLabel');
      if (contactLabel) {
        contactLabel.textContent = L(data.contact, 'label') || (_lang === 'en' ? 'Contact to order' : 'Liên hệ đặt dịch vụ');
      }
      if (contactEl) contactEl.href = data.contact.link || '#';
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
        const noResultText = (window.__siteI18n && window.__siteI18n.noResult)
          || (_lang === 'en' ? '😕 No matching service found' : '😕 Không tìm thấy dịch vụ phù hợp');
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
    }
  }

  /* ─── React to language change → full re-render ─────────────────── */
  document.addEventListener('langchange', (e) => {
    _lang = (e.detail && e.detail.lang) || 'vi';
    // Cập nhật __siteLang để L() dùng đúng
    window.__siteLang = _lang;
    if (_data) {
      // Ghi nhớ vị trí scroll để không nhảy lên đầu
      const scrollY = window.scrollY;
      render(_data);
      // Cập nhật search placeholder từ i18n
      const si = document.getElementById('searchInput');
      if (si && e.detail && e.detail.i18n) si.placeholder = e.detail.i18n.searchPlaceholder;
      window.scrollTo({ top: scrollY });
    }
  });

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
