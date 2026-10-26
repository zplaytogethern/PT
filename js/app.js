/**
 * app.js — Trang bảng giá ZPlayN (Client-side)
 * - Tự động tải dữ liệu từ data/prices.json (hoặc draft nếu ?preview=1)
 * - Tối ưu tần suất tải mạng (3 phút ngầm + kiểm tra thông minh khi focus)
 * - An toàn dữ liệu tuyệt đối: Sử dụng DOM API textContent & kiểm tra giao thức URL (chống XSS)
 * - Nút "Đặt dịch vụ" trên từng thẻ + Cửa sổ xác nhận đặt hàng (Order Modal) tiện lợi
 * - Tự động tạo mẫu tin nhắn đặt hàng & sao chép 1-click gửi Zalo / Instagram
 * - Giao diện lỗi có nút "Thử lại ngay" và liên kết bảng giá nguồn dự phòng
 * - Hỗ trợ đa ngôn ngữ (VIE / ENG) toàn diện & Định dạng ngày DD/MM/YYYY chuẩn mực
 */
(function () {
  'use strict';

  // Emoji icon map cho từng danh mục
  const CAT_ICONS = {
    'nong-trai': '🌾',
    'thoi-tiet': '⛅',
    'tim-sao': '💖',
    'hat-dua-hau--hat-giong': '🍉',
    'khac': '🏷️',
    'default': '🏷️',
  };

  /* ─── URL Sanitizer (P1 - An toàn giao thức) ────────────────────── */
  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const clean = url.trim();
    if (/^(https?:|tel:|mailto:|zalo:)/i.test(clean)) {
      return clean;
    }
    return '#';
  }

  /* ─── Helper bỏ dấu tiếng Việt để tìm kiếm thông minh ─── */
  function stripAccents(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .toLowerCase()
      .trim();
  }

  /* ─── Từ điển dịch tự động dự phòng (khi dữ liệu Git thiếu field _en) ─── */
  const FALLBACK_TRANSLATIONS = {
    'nông trại': 'Farm',
    'thời tiết': 'Weather',
    'tim và sao': 'Hearts & Stars',
    'khác': 'Other',
    'hạt dưa hấu (hạt giống)': 'Watermelon Seeds',
    'hạt dưa hấu ( hạt giống)': 'Watermelon Seeds',
    'hạt dưa hấu': 'Watermelon Seeds',
    'xu nông trại': 'Farm Coins',
    'nhân sâm': 'Ginseng',
    'ảnh avt zingid': 'ZingID Avatar',
    'avt zingid': 'ZingID Avatar',
    'ảnh bìa nhà': 'House Exterior Photo',
    'combo full': 'Full Combo (Avatar & Cover)',
    'key kdg vip 7d': '7-Day KDG VIP Key',
    'key kdg vip 30d': '30-Day KDG VIP Key',
    'done thư cây phong': 'Delivered via Maple Tree mailbox',
    'done thư': 'Delivered via mailbox',
    'cần đăng nhập': 'Need to Login',
    'có link tùy chỉnh': 'Custom by Link',
    'liên hệ': 'Contact',
    'giá liên hệ': 'Contact for price',
  };

  function smartTranslateEn(text) {
    if (!text) return '';
    const clean = text.trim();
    const lower = clean.toLowerCase();
    if (FALLBACK_TRANSLATIONS[lower]) return FALLBACK_TRANSLATIONS[lower];

    let res = clean
      .replace(/xu nông trại/gi, 'Farm Coins')
      .replace(/thời tiết tự chọn/gi, 'Custom Weather')
      .replace(/thời tiết/gi, 'Weather')
      .replace(/nhân sâm/gi, 'Ginseng')
      .replace(/hạt giống/gi, 'Seeds')
      .replace(/hạt dưa hấu/gi, 'Watermelon Seeds')
      .replace(/ảnh avt zingid/gi, 'ZingID Avatar')
      .replace(/ảnh bìa nhà/gi, 'House Exterior Photo')
      .replace(/combo full/gi, 'Full Combo')
      .replace(/(\d+)\s*hạt/gi, '$1 Seeds')
      .replace(/(\d+)\s*củ/gi, '$1 Roots')
      .replace(/done thư cây phong/gi, 'Delivered via Maple Tree mailbox')
      .replace(/done thư/gi, 'Delivered via mailbox')
      .replace(/cần đăng nhập/gi, 'Need to Login')
      .replace(/có link tùy chỉnh/gi, 'Custom by Link')
      .replace(/chừa 1 slot cho clone, tự chạy/gi, 'Keep 1 slot for clone, auto-run')
      .replace(/yêu cầu tên nhân vật và id game/gi, 'Character name & Game ID required')
      .replace(/yêu cầu tên nhân vật/gi, 'Character name required');

    return res;
  }

  /* ─── Định dạng tiền tệ theo ngôn ngữ ─────────────────────────────── */
  const fmtPrice = (n, lang) => {
    if (!n || n <= 0) return null;
    if (lang === 'en') {
      return n.toLocaleString('en-US') + ' VND';
    }
    return n.toLocaleString('vi-VN') + 'đ';
  };

  /* ─── Định dạng ngày tháng DD/MM/YYYY chuẩn ───────────────────────── */
  function formatDate(dateStr, lang) {
    if (!dateStr || dateStr === '…') return '…';
    try {
      const parts = String(dateStr).trim().split(/[-/]/);
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) {
          if (lang === 'en') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[m]} ${d}, ${y}`;
          }
          const dd = String(d).padStart(2, '0');
          const mm = String(m + 1).padStart(2, '0');
          return `${dd}/${mm}/${y}`;
        }
      }
    } catch (e) { }
    return dateStr;
  }

  /* ─── DOM Element Creator ─────────────────────────────────────────── */
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  };

  /* ─── State ─────────────────────────────────────────────────────── */
  let _data = null;
  let _lang = (function () {
    try {
      return localStorage.getItem('site-lang') || (window.sessionStorage && sessionStorage.getItem('site-lang')) || 'vi';
    } catch (e) {
      return 'vi';
    }
  })();
  let _lastFetchTime = 0;
  let _isFetching = false;
  let _lastSignature = '';
  let _currentSelectedService = null;

  /* ─── Helper: lấy field theo ngôn ngữ chuẩn xác ─────────────────── */
  function L(obj, field) {
    if (!obj) return '';
    if (_lang === 'en') {
      const enVal = obj[field + '_en'];
      if (enVal !== undefined && enVal !== null && String(enVal).trim() !== '') {
        return String(enVal).trim();
      }
      const viVal = obj[field] || '';
      return smartTranslateEn(viVal);
    }
    return obj[field] || '';
  }

  /* ─── Helper: Chữ ký dữ liệu để nhận biết thay đổi ─────────────── */
  function getSignature(data) {
    if (!data) return '';
    try {
      return (data.version || '') + '__' + (data.updated || '') + '__' + (data.categories || []).map((c) =>
        c.id + ':' + (c.items || []).map((i) => (i.name || '') + '=' + (i.price || 0)).join(',')
      ).join(';');
    } catch (e) {
      return JSON.stringify(data);
    }
  }

  /* ─── Load dữ liệu mới nhất (chống cache nhẹ nhàng) ───────────────── */
  async function loadData() {
    // Chế độ xem thử từ trang Admin
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

    // Cache-busting với epoch minute (giúp tránh cache trình duyệt mà không spam server vô tận)
    const epochMinute = Math.floor(Date.now() / 60000);
    const res = await fetch('data/prices.json?v=' + epochMinute, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* ─── Mở QR Zalo Modal ─────────────────────────────────────────── */
  function openQRModal() {
    if (typeof window.__openQRModal === 'function') {
      window.__openQRModal();
    } else {
      const modal = document.getElementById('qrModal');
      if (modal) modal.classList.add('open');
    }
  }

  /* ─── Helper phân loại Badge ───────────────────────────────────── */
  function getBadgeClass(noteText) {
    if (!noteText) return '';
    const lower = noteText.toLowerCase();
    if (lower.includes('sale')) return 'sale';
    if (lower.includes('đăng nhập') || lower.includes('login')) return 'login';
    if (lower.includes('thư') || lower.includes('mailbox')) return 'mail';
    if (lower.includes('link') || lower.includes('tùy chỉnh')) return 'custom';
    return 'default';
  }

  /* ─── Order Modal Management ───────────────────────────────────── */
  function openOrderModal(it, cat) {
    _currentSelectedService = { item: it, category: cat };
    const modal = document.getElementById('orderModal');
    if (!modal) return;

    const itemName = L(it, 'name');
    const itemDesc = L(it, 'description');
    const itemNote = L(it, 'note');
    const catTitle = L(cat, 'title');
    const catIcon = CAT_ICONS[cat.id] || CAT_ICONS.default;
    const priceFormatted = fmtPrice(it.price, _lang) || (_lang === 'en' ? 'Contact for price' : 'Liên hệ báo giá');

    // Cập nhật thông tin trên Modal
    const orderCatBadge = document.getElementById('orderCatBadge');
    if (orderCatBadge) {
      orderCatBadge.textContent = `${catIcon} ${catTitle}`;
      orderCatBadge.style.background = (cat.color || '#58a6ff') + '22';
      orderCatBadge.style.color = cat.color || '#58a6ff';
      orderCatBadge.style.borderColor = (cat.color || '#58a6ff') + '44';
    }

    const orderItemIcon = document.getElementById('orderItemIcon');
    if (orderItemIcon) orderItemIcon.textContent = catIcon;

    const orderItemName = document.getElementById('orderItemName');
    if (orderItemName) orderItemName.textContent = itemName;

    const orderItemDesc = document.getElementById('orderItemDesc');
    if (orderItemDesc) {
      if (itemDesc) {
        orderItemDesc.textContent = itemDesc;
        orderItemDesc.style.display = 'block';
      } else {
        orderItemDesc.style.display = 'none';
      }
    }

    const orderItemPrice = document.getElementById('orderItemPrice');
    if (orderItemPrice) {
      orderItemPrice.textContent = priceFormatted;
      orderItemPrice.style.color = cat.color || '#58a6ff';
    }

    const orderItemBadge = document.getElementById('orderItemBadge');
    if (orderItemBadge) {
      if (itemNote) {
        orderItemBadge.textContent = itemNote;
        orderItemBadge.className = 'order-note-tag ' + getBadgeClass(itemNote);
        orderItemBadge.style.display = 'inline-block';
      } else {
        orderItemBadge.style.display = 'none';
      }
    }

    // Gợi ý điều kiện hoặc thông tin cần chuẩn bị
    const orderReqText = document.getElementById('orderReqText');
    if (orderReqText) {
      let reqHtml = '';
      const noteLower = (it.note || '').toLowerCase();
      const descLower = (it.description || '').toLowerCase();

      if (noteLower.includes('đăng nhập')) {
        reqHtml = _lang === 'en'
          ? '🔒 <strong>Requirement:</strong> ZingID account & password required. Shop commits to 100% security.'
          : '🔒 <strong>Yêu cầu:</strong> Dịch vụ cần tài khoản & mật khẩu ZingID. Shop cam kết bảo mật 100%.';
      } else if (descLower.includes('thư cây phong') || descLower.includes('thư')) {
        reqHtml = _lang === 'en'
          ? '📬 <strong>Delivery:</strong> Delivered via Maple Tree mailbox. Please provide in-game character name.'
          : '📬 <strong>Giao dịch:</strong> Giao qua hộp thư cây Phong. Bạn chỉ cần gửi Tên nhân vật trong game.';
      } else if (cat.id === 'thoi-tiet') {
        reqHtml = _lang === 'en'
          ? '⛅ <strong>Weather:</strong> Any number of players supported, save 1 slot for clone. Custom link supported.'
          : '⛅ <strong>Thời tiết:</strong> Bao nhiêu người cũng chạy được, vui lòng chừa 1 slot cho clone.';
      } else if (cat.id === 'tim-sao') {
        reqHtml = _lang === 'en'
          ? '💖 <strong>Hearts & Stars:</strong> Fast delivery to character profile. Only need Character Name & Game ID.'
          : '💖 <strong>Tim & Sao:</strong> Giao nhanh qua trang cá nhân, chỉ cần Tên nhân vật & ID Game.';
      } else {
        reqHtml = _lang === 'en'
          ? '💡 <strong>Order guide:</strong> Copy message below and tap Zalo or Instagram to order instantly.'
          : '💡 <strong>Hướng dẫn:</strong> Bấm "Sao chép tin nhắn" bên dưới rồi bấm nút Zalo hoặc Instagram để gửi cho shop.';
      }
      orderReqText.innerHTML = reqHtml;
    }

    // Tự sinh mẫu nội dung tin nhắn gửi shop
    const msgTemplateVi = `[ZPlayN] Đặt dịch vụ: ${it.name}
• Giá: ${fmtPrice(it.price, 'vi') || 'Liên hệ'}
• Danh mục: ${cat.title}
${it.note ? '• Ghi chú: ' + it.note + '\n' : ''}${it.description ? '• Chi tiết: ' + it.description + '\n' : ''}• Thời gian: ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    const msgTemplateEn = `[ZPlayN] Order Service: ${L(it, 'name')}
• Price: ${fmtPrice(it.price, 'en') || 'Contact'}
• Category: ${catTitle}
${itemNote ? '• Note: ' + itemNote + '\n' : ''}${itemDesc ? '• Details: ' + itemDesc + '\n' : ''}• Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    const orderMsgText = document.getElementById('orderMsgText');
    const orderText = _lang === 'en' ? msgTemplateEn : msgTemplateVi;
    if (orderMsgText) orderMsgText.textContent = orderText;

    // Reset nút copy
    const btnCopyText = document.getElementById('btnCopyText');
    const copyIcon = document.getElementById('copyIcon');
    if (btnCopyText) btnCopyText.textContent = _lang === 'en' ? 'Copy Message' : 'Sao chép tin nhắn';
    if (copyIcon) copyIcon.textContent = '📋';

    // Đường dẫn Zalo & Instagram
    const zaloUrl = (_data && _data.contact && _data.contact.zalo_link) || 'https://zalo.me/0388486348';
    const igUrl = (_data && _data.contact && _data.contact.instagram_link) || (_data && _data.contact && _data.contact.link) || 'https://instagram.com/juhere04';

    const orderBtnZalo = document.getElementById('orderBtnZalo');
    if (orderBtnZalo) orderBtnZalo.href = sanitizeUrl(zaloUrl);

    const orderBtnIg = document.getElementById('orderBtnInstagram');
    if (orderBtnIg) orderBtnIg.href = sanitizeUrl(igUrl);

    // Mở modal
    modal.classList.add('open');
  }

  function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.remove('open');
  }

  /* ─── Init Order Modal Listeners ───────────────────────────────── */
  (function initOrderModal() {
    const modal = document.getElementById('orderModal');
    const closeBtn = document.getElementById('orderClose');
    const copyBtn = document.getElementById('btnCopyOrder');

    if (closeBtn) closeBtn.addEventListener('click', closeOrderModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeOrderModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
        closeOrderModal();
      }
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const orderMsgText = document.getElementById('orderMsgText');
        const textToCopy = orderMsgText ? orderMsgText.textContent : '';
        if (!textToCopy) return;

        const copySuccess = () => {
          const btnCopyText = document.getElementById('btnCopyText');
          const copyIcon = document.getElementById('copyIcon');
          if (btnCopyText) btnCopyText.textContent = _lang === 'en' ? 'Copied!' : 'Đã chép!';
          if (copyIcon) copyIcon.textContent = '✅';
          showToast(_lang === 'en' ? '📋 Order details copied to clipboard!' : '📋 Đã sao chép nội dung đơn hàng!');
          setTimeout(() => {
            if (btnCopyText) btnCopyText.textContent = _lang === 'en' ? 'Copy Message' : 'Sao chép tin nhắn';
            if (copyIcon) copyIcon.textContent = '📋';
          }, 2400);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(copySuccess).catch(() => {
            fallbackCopy(textToCopy, copySuccess);
          });
        } else {
          fallbackCopy(textToCopy, copySuccess);
        }
      });
    }

    function fallbackCopy(text, callback) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        callback();
      } catch (e) {
        showToast('⚠️ Không thể tự động sao chép, vui lòng chọn và sao chép thủ công.');
      }
      document.body.removeChild(ta);
    }
  })();

  /* ─── Render Giao Diện Bảng Giá ─────────────────────────────────── */
  function render(data) {
    _data = data;

    const tabs = document.getElementById('tabs');
    const content = document.getElementById('content');
    const statsBar = document.getElementById('statsBar');
    tabs.innerHTML = '';
    content.innerHTML = '';

    // --- Search Bar với Nút Xóa Nhanh ---
    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-wrap';
    const searchPh = (window.__siteI18n && window.__siteI18n.searchPlaceholder)
      || (_lang === 'en' ? 'Search service, pack or category…' : 'Tìm dịch vụ theo tên, gói hoặc danh mục…');
    searchWrap.innerHTML = `
      <span class="s-icon">🔍</span>
      <input type="text" id="searchInput" placeholder="${searchPh}" autocomplete="off" aria-label="${searchPh}">
      <button type="button" class="search-clear-btn" id="searchClearBtn" title="Clear">✕</button>
    `;
    content.appendChild(searchWrap);

    // --- Stats Bar ---
    let totalItems = 0;
    (data.categories || []).forEach((c) => { totalItems += (c.items || []).length; });
    if (statsBar) {
      statsBar.style.display = '';
      const statCats = document.getElementById('statCats');
      const statItems = document.getElementById('statItems');
      if (statCats) statCats.textContent = (data.categories || []).length;
      if (statItems) statItems.textContent = totalItems;
    }

    // --- Tabs & Danh mục (P1: DOM API an toàn, textContent) ---
    const sections = [];
    (data.categories || []).forEach((cat, idx) => {
      const icon = CAT_ICONS[cat.id] || CAT_ICONS.default;
      const catTitle = L(cat, 'title');
      const catNote  = L(cat, 'note');

      // Tab điều hướng
      const tab = el('a', '');
      tab.href = '#' + cat.id;
      tab.style.setProperty('--c', cat.color || '#58a6ff');

      const tabSpan = el('span');
      const tabIconSpan = el('span', 'tab-icon', icon + ' ');
      tabSpan.appendChild(tabIconSpan);
      tabSpan.appendChild(document.createTextNode(catTitle));
      tab.appendChild(tabSpan);

      if (idx === 0) tab.classList.add('active');
      tabs.appendChild(tab);

      // Section danh mục
      const sec = el('section', 'section');
      sec.id = cat.id;
      sec.style.setProperty('--c', cat.color || '#58a6ff');

      const head = el('div', 'section-head');
      const h2 = el('h2');
      const h2IconSpan = el('span', 'sec-icon', icon + ' ');
      h2.appendChild(h2IconSpan);
      h2.appendChild(document.createTextNode(catTitle));
      head.appendChild(h2);

      if (catNote) {
        head.appendChild(el('p', '', catNote));
      }
      sec.appendChild(head);

      const grid = el('div', 'grid');
      grid.dataset.catId = cat.id;

      (cat.items || []).forEach((it) => {
        const itemName = L(it, 'name');
        const itemNote = L(it, 'note');
        const itemDesc = L(it, 'description');

        const card = el('div', 'item');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('title', _lang === 'en' ? `Order ${itemName}` : `Bấm để đặt ${itemName}`);

        // Từ khóa tìm kiếm: không dấu, có dấu, tiếng Anh
        const searchKeywords = [
          it.name, stripAccents(it.name),
          it.name_en,
          it.note, it.note_en,
          it.description, stripAccents(it.description), it.description_en,
          cat.title, stripAccents(cat.title), cat.title_en,
        ].filter(Boolean).join(' ').toLowerCase();

        card.dataset.name = searchKeywords;

        // Card Content
        const info = el('div', 'item-content');
        info.appendChild(el('div', 'item-name', itemName));

        if (itemDesc) {
          info.appendChild(el('div', 'item-desc', itemDesc));
        }

        if (itemNote) {
          const badgeCls = getBadgeClass(itemNote);
          const noteBadge = el('span', 'item-note ' + badgeCls, itemNote);
          info.appendChild(noteBadge);
        }

        card.appendChild(info);

        // Price wrap + Action button
        const priceWrap = el('div', 'item-price-wrap');
        const priceFormatted = fmtPrice(it.price, _lang);

        if (priceFormatted) {
          priceWrap.appendChild(el('div', 'item-price', priceFormatted));
        } else {
          priceWrap.appendChild(el('div', 'item-price item-price-contact-text', _lang === 'en' ? 'Contact' : 'Liên hệ'));
        }

        // Nút "Đặt dịch vụ" trên từng thẻ (P0 & 2A)
        const orderBtn = el('button', 'item-order-btn');
        orderBtn.type = 'button';
        orderBtn.innerHTML = `<span>🛒</span> <span>${_lang === 'en' ? 'Order' : 'Đặt dịch vụ'}</span>`;
        orderBtn.title = _lang === 'en' ? `Order ${itemName}` : `Đặt dịch vụ ${itemName}`;

        orderBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openOrderModal(it, cat);
        });

        // Click cả thẻ cũng mở modal
        card.addEventListener('click', () => {
          openOrderModal(it, cat);
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openOrderModal(it, cat);
          }
        });

        priceWrap.appendChild(orderBtn);
        card.appendChild(priceWrap);
        grid.appendChild(card);
      });

      sec.appendChild(grid);
      content.appendChild(sec);
      sections.push(sec);
    });

    // --- Cập nhật ngày, version & contact links ---
    const updatedEl = document.getElementById('updated');
    if (updatedEl) {
      updatedEl.textContent = formatDate(data.updated, _lang);
    }

    const verEl = document.getElementById('heroVersion');
    if (verEl) {
      const v = String(data.version || '2.0').trim();
      if (!/^version/i.test(v)) {
        const num = v.replace(/^v/i, '').trim();
        verEl.textContent = 'Version ' + (num || '2.0');
      } else {
        verEl.textContent = v;
      }
    }

    // Liên kết liên hệ (Zalo, Instagram, v.v.)
    if (data.contact) {
      const zaloUrl = data.contact.zalo_link || 'https://zalo.me/0388486348';
      const igUrl = data.contact.instagram_link || data.contact.link || 'https://instagram.com/juhere04';

      const heroZaloBtn = document.getElementById('heroZaloBtn');
      if (heroZaloBtn) heroZaloBtn.href = sanitizeUrl(zaloUrl);

      const heroIgBtn = document.getElementById('heroIgBtn');
      if (heroIgBtn) heroIgBtn.href = sanitizeUrl(igUrl);

      const footerZalo = document.getElementById('footerZalo');
      if (footerZalo) footerZalo.href = sanitizeUrl(zaloUrl);

      const footerIg = document.getElementById('footerIg');
      if (footerIg) footerIg.href = sanitizeUrl(igUrl);

      const qrDirectLink = document.getElementById('qrDirectLink');
      if (qrDirectLink) qrDirectLink.href = sanitizeUrl(zaloUrl);
    }

    // --- Tab Scrollspy (Intersection Observer) ---
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
        { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
      );
      sections.forEach((s) => obs.observe(s));
    }

    // --- Tìm kiếm thông minh + Nút Clear ---
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');

    if (searchInput) {
      const handleSearch = () => {
        const raw = searchInput.value.trim().toLowerCase();
        const stripped = stripAccents(raw);

        if (searchClearBtn) {
          searchClearBtn.classList.toggle('visible', raw.length > 0);
        }

        const noResultText = (window.__siteI18n && window.__siteI18n.noResult)
          || (_lang === 'en' ? '😕 No matching service found' : '😕 Không tìm thấy dịch vụ phù hợp');

        sections.forEach((sec) => {
          const grid = sec.querySelector('.grid');
          const cards = [...grid.querySelectorAll('.item')];
          let visibleCount = 0;

          cards.forEach((card) => {
            const cardKeywords = card.dataset.name || '';
            const match = !raw || cardKeywords.includes(raw) || cardKeywords.includes(stripped);
            card.style.display = match ? '' : 'none';
            if (match) visibleCount++;
          });

          // Hiển thị thông báo không tìm thấy
          let noRes = grid.querySelector('.no-results');
          if (visibleCount === 0 && raw) {
            if (!noRes) {
              noRes = el('p', 'no-results', noResultText);
              grid.appendChild(noRes);
            } else {
              noRes.textContent = noResultText;
            }
          } else if (noRes) {
            noRes.remove();
          }
        });
      };

      searchInput.addEventListener('input', handleSearch);

      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
          searchInput.value = '';
          handleSearch();
          searchInput.focus();
        });
      }
    }
  }

  /* ─── Hiển thị Lỗi Tải Bảng Giá Có Phương Án Dự Phòng (P0) ───────── */
  function renderError(err) {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = '';

    const errBox = el('div', 'load-error-box');

    const icon = el('div', 'load-error-icon', '⚠️');
    errBox.appendChild(icon);

    const title = el('h3', 'load-error-title', _lang === 'en' ? 'Unable to load service prices' : 'Không thể tải bảng giá dịch vụ');
    errBox.appendChild(title);

    const desc = el('p', 'load-error-desc', _lang === 'en'
      ? 'Network connection issue or file not found. Please try again or view the backup source.'
      : 'Kết nối mạng bị gián đoạn hoặc tệp dữ liệu tạm thời không khả dụng. Quý khách vui lòng thử lại hoặc mở bảng giá nguồn dự phòng.');
    errBox.appendChild(desc);

    const btnRow = el('div', 'load-error-actions');

    const retryBtn = el('button', 'btn-retry', _lang === 'en' ? '🔄 Try Again' : '🔄 Thử lại ngay');
    retryBtn.type = 'button';
    retryBtn.addEventListener('click', () => {
      refresh({ silent: false, showToastOnSuccess: true });
    });
    btnRow.appendChild(retryBtn);

    const backupLink = el('a', 'btn-fallback-src', _lang === 'en' ? '📂 View Backup JSON' : '📂 Xem bảng giá dự phòng (JSON)');
    backupLink.href = 'data/prices.json';
    backupLink.target = '_blank';
    backupLink.rel = 'noopener';
    btnRow.appendChild(backupLink);

    errBox.appendChild(btnRow);

    const contactNotice = el('div', 'load-error-contact');
    contactNotice.innerHTML = _lang === 'en'
      ? `Need quick assistance? Message Zalo: <a href="https://zalo.me/0388486348" target="_blank" rel="noopener"><strong>0388486348</strong></a> or Instagram: <a href="https://instagram.com/juhere04" target="_blank" rel="noopener"><strong>@juhere04</strong></a>`
      : `Cần đặt dịch vụ gấp? Nhắn trực tiếp Zalo: <a href="https://zalo.me/0388486348" target="_blank" rel="noopener"><strong>0388486348</strong></a> hoặc Instagram: <a href="https://instagram.com/juhere04" target="_blank" rel="noopener"><strong>@juhere04</strong></a>`;
    errBox.appendChild(contactNotice);

    content.appendChild(errBox);
  }

  /* ─── Thông báo Toast nổi ───────────────────────────────────────── */
  function showToast(text, duration = 2800) {
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

        const searchInput = document.getElementById('searchInput');
        const prevSearch = searchInput ? searchInput.value : '';
        const prevScrollY = window.scrollY;

        render(freshData);

        if (prevSearch) {
          const newSearchInput = document.getElementById('searchInput');
          if (newSearchInput) {
            newSearchInput.value = prevSearch;
            newSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

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
            ? '✅ Prices loaded successfully!'
            : '✅ Đã tải bảng giá mới nhất!';
          showToast(successMsg);
        }
      } else {
        if (!silent || showToastOnSuccess) {
          const latestMsg = _lang === 'en'
            ? '✅ Prices are already up-to-date!'
            : '✅ Bạn đang xem bảng giá mới nhất!';
          showToast(latestMsg);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh prices:', err);
      if (!_data) {
        renderError(err);
      } else {
        showToast(_lang === 'en' ? '⚠️ Network issue, showing cached prices.' : '⚠️ Kết nối mạng chậm, đang hiển thị giá đã lưu.');
      }
    } finally {
      _isFetching = false;
      if (btnRefresh) {
        btnRefresh.classList.remove('is-loading');
      }
    }
  }

  /* ─── Phản hồi khi chuyển ngôn ngữ ──────────────────────────────── */
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

  const floatingBtn = document.getElementById('floatingOrderBtn');
  if (floatingBtn) {
    floatingBtn.addEventListener('click', () => {
      if (_currentSelectedService) {
        openOrderModal(_currentSelectedService.item, _currentSelectedService.category);
      } else {
        const tabs = document.getElementById('tabs') || document.getElementById('content');
        if (tabs) {
          tabs.scrollIntoView({ behavior: 'smooth' });
          showToast(_lang === 'en' ? '👇 Please tap "Order" on any service below!' : '👇 Vui lòng bấm "Đặt dịch vụ" trên gói bạn muốn mua!');
        } else {
          openQRModal();
        }
      }
    });
  }

  /* ─── Tối ưu Tải Mạng & Lifecycle Triggers ───────────────────────── */
  // Chỉ tải lại khi người dùng quay lại tab sau hơn 2 phút (120,000ms)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted || (Date.now() - _lastFetchTime > 120000)) {
      refresh({ silent: true });
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (Date.now() - _lastFetchTime > 120000) {
        refresh({ silent: true });
      }
    }
  });

  window.addEventListener('focus', () => {
    if (Date.now() - _lastFetchTime > 120000) {
      refresh({ silent: true });
    }
  });

  // Polling ngầm mỗi 3 phút (180,000ms) thay vì 60s
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      refresh({ silent: true });
    }
  }, 180000);

  // Nút làm mới thủ công
  const btnRefresh = document.getElementById('btnRefreshPrice');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      refresh({ silent: false, showToastOnSuccess: true });
    });
  }

  window.__refreshPrices = refresh;

  /* ─── Khởi động ─────────────────────────────────────────────────── */
  refresh({ silent: true });
})();
