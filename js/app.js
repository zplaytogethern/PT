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

  /* ─── Dọn dẹp cache cũ & Service Worker nếu có ───────────────────── */
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      }).catch(() => {});
    }
    if (window.sessionStorage) {
      sessionStorage.removeItem('prices-cache');
      sessionStorage.removeItem('prices-data');
    }
  } catch (e) {
    /* ignore */
  }

  /* ─── State ─────────────────────────────────────────────────────── */
  let _data = null;
  let _lang = window.__siteLang || (window.sessionStorage && sessionStorage.getItem('site-lang')) || 'vi';
  let _lastFetchTime = 0;
  let _isFetching = false;
  let _lastSignature = '';

  /* ─── Helper: lấy field theo ngôn ngữ ──────────────────────────── */
  // Nếu có field `xxx_en` và đang dùng EN → trả về field đó; fallback về field gốc
  function L(obj, field) {
    if (_lang === 'en') {
      const enVal = obj[field + '_en'];
      if (enVal !== undefined && enVal !== null) return enVal;
    }
    return obj[field] || '';
  }

  /* ─── Helper: Chữ ký dữ liệu để nhận biết thay đổi ─────────────── */
  function getSignature(data) {
    if (!data) return '';
    try {
      return (data.version || '') + '__' + (data.updated || '') + '__' + (data.categories || []).map((c) =>
        c.id + ':' + (c.items || []).map((i) => i.name + '=' + i.price).join(',')
      ).join(';');
    } catch (e) {
      return JSON.stringify(data);
    }
  }

  /* ─── Load dữ liệu mới nhất (chống cache đa tầng) ──────────────── */
  async function loadData() {
    // Preview mode: chỉ kích hoạt khi có ?preview trên URL từ admin
    if (new URLSearchParams(location.search).has('preview')) {
      const draft = localStorage.getItem('prices-draft');
      if (draft) {
        try {
          return JSON.parse(draft);
        } catch (e) {
          console.warn('Cannot parse draft:', e);
        }
      }
    }

    // Anti-cache: kết hợp epoch timestamp nano + chuỗi ngẫu nhiên
    // Thêm cache: 'no-store' & Header no-cache để vượt qua cả cache trình duyệt lẫn WebView (Zalo, FB, TikTok)
    const nonce = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const res = await fetch('data/prices.json?v=' + nonce, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
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

    // --- Cập nhật ngày, version & contact ---
    document.getElementById('updated').textContent = data.updated || 'N/A';
    const verEl = document.getElementById('heroVersion');
    if (verEl) {
      const v = String(data.version || '1.0').trim();
      if (!/^version/i.test(v)) {
        const num = v.replace(/^v/i, '').trim();
        verEl.textContent = 'Version ' + (num || '1.0');
      } else {
        verEl.textContent = v;
      }
    }
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

  /* ─── Thông báo Toast nổi ───────────────────────────────────────── */
  function showToast(text, duration = 3000) {
    let toast = document.getElementById('priceToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'priceToast';
      toast.className = 'price-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  /* ─── Cơ chế tự động cập nhật & làm mới giá ─────────────────────── */
  async function refresh(opts = {}) {
    const { silent = false, showToastOnSuccess = false } = opts;
    if (_isFetching) return;
    _isFetching = true;

    const btnRefresh = document.getElementById('btnRefreshPrice');
    if (btnRefresh && !silent) {
      btnRefresh.classList.add('is-loading');
    }

    try {
      const freshData = await loadData();
      _lastFetchTime = Date.now();
      const newSig = getSignature(freshData);
      const isFirstLoad = !_data;
      const hasChanged = !_data || _lastSignature !== newSig;

      if (hasChanged) {
        _lastSignature = newSig;

        // Giữ lại từ khóa tìm kiếm và vị trí cuộn trang hiện tại
        const searchInput = document.getElementById('searchInput');
        const prevSearch = searchInput ? searchInput.value : '';
        const prevScrollY = window.scrollY;

        render(freshData);

        // Khôi phục bộ lọc tìm kiếm nếu người dùng đang tìm
        if (prevSearch) {
          const newSearchInput = document.getElementById('searchInput');
          if (newSearchInput) {
            newSearchInput.value = prevSearch;
            newSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        // Khôi phục scroll nếu không phải lần đầu mở web
        if (!isFirstLoad && prevScrollY > 0) {
          window.scrollTo({ top: prevScrollY, behavior: 'instant' });
        }

        if (!isFirstLoad) {
          const updateMsg = _lang === 'en'
            ? '✨ Prices refreshed with latest data!'
            : '✨ Bảng giá vừa được tự động cập nhật!';
          showToast(updateMsg);
        } else if (showToastOnSuccess) {
          const successMsg = _lang === 'en'
            ? '✅ Prices updated to latest!'
            : '✅ Đã tải bảng giá mới nhất!';
          showToast(successMsg);
        }
      } else {
        // Dữ liệu không đổi nhưng người dùng bấm nút làm mới thủ công
        if (!silent || showToastOnSuccess) {
          const latestMsg = _lang === 'en'
            ? '✅ Prices are already the latest!'
            : '✅ Bạn đang xem bảng giá mới nhất!';
          showToast(latestMsg);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh prices:', err);
      if (!_data) {
        const content = document.getElementById('content');
        content.innerHTML = '';
        const msg = el('p', 'error');
        msg.innerHTML = `⚠️ Không tải được bảng giá. Vui lòng thử lại sau.<br><small style="opacity:.6">${err.message}</small>`;
        content.appendChild(msg);
      }
    } finally {
      _isFetching = false;
      if (btnRefresh) {
        btnRefresh.classList.remove('is-loading');
      }
    }
  }

  /* ─── React to language change → full re-render ─────────────────── */
  document.addEventListener('langchange', (e) => {
    _lang = (e.detail && e.detail.lang) || 'vi';
    window.__siteLang = _lang;
    if (_data) {
      const scrollY = window.scrollY;
      const searchInput = document.getElementById('searchInput');
      const prevSearch = searchInput ? searchInput.value : '';

      render(_data);

      if (prevSearch) {
        const newSearchInput = document.getElementById('searchInput');
        if (newSearchInput) {
          newSearchInput.value = prevSearch;
          newSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

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

  /* ─── Lifecycle Triggers: Xử lý triệt để session cũ của trình duyệt ─ */

  // 1. bfcache (Back/Forward Cache): Khi khách ấn Back, mở lại app hoặc khôi phục tab đã lưu session
  window.addEventListener('pageshow', (e) => {
    if (e.persisted || (Date.now() - _lastFetchTime > 10000)) {
      refresh({ silent: true });
    }
  });

  // 2. Chuyển tab hoặc chuyển ứng dụng (Zalo/Messenger/TikTok/Safari tab) rồi quay lại
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Nếu đã hơn 15 giây kể từ lần tải gần nhất → tự động kiểm tra giá mới
      if (Date.now() - _lastFetchTime > 15000) {
        refresh({ silent: true });
      }
    }
  });

  // 3. Window focus (click lại vào cửa sổ trình duyệt)
  window.addEventListener('focus', () => {
    if (Date.now() - _lastFetchTime > 25000) {
      refresh({ silent: true });
    }
  });

  // 4. Polling ngầm: Tự động kiểm tra giá mới mỗi 60 giây khi khách đang xem trang
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      refresh({ silent: true });
    }
  }, 60000);

  // 5. Bấm nút "Làm mới giá" thủ công trên giao diện
  const btnRefresh = document.getElementById('btnRefreshPrice');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      refresh({ silent: false, showToastOnSuccess: true });
    });
  }

  // Xuất hàm refresh ra window để tiện kiểm tra hoặc gọi từ ngoài
  window.__refreshPrices = refresh;

  /* ─── Boot ──────────────────────────────────────────────────────── */
  refresh({ silent: true });
})();
