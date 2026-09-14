/* Kisa: the notification bell.
 *
 * Tells you when someone likes or comments on a report you posted. The rows
 * are created by database triggers, never by the browser, so nobody can
 * forge one. See backend/migrations/003_notifications.sql.
 *
 * Injects itself into .nav-right beside the account menu, on every page that
 * has one. Load after kisa-store.js and kisa-auth-ui.js.
 */
(function (global) {
  'use strict';

  var POLL_MS = 60000;   /* a minute is often enough for a community app */
  var pollTimer = null;
  var currentUser = null;

  var BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
           + 'stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;">'
           + '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>'
           + '<path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function timeAgo(iso) {
    if (global.KisaFeed && global.KisaFeed.timeAgo) return global.KisaFeed.timeAgo(iso);
    var mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' h ago';
    return Math.floor(hrs / 24) + ' d ago';
  }

  function describe(n) {
    var who = (n.actor && n.actor.display_name) || 'Someone';
    var what = n.type === 'like' ? ' liked your report' : ' commented on your report';
    var where = n.sightings && n.sightings.location_text;
    return { who: who, what: what, where: where };
  }

  function build(navRight) {
    var wrap = el('div', 'kisa-notif-wrap');

    var btn = el('button', 'kisa-notif-btn');
    btn.type = 'button';
    btn.id = 'kisaNotifBtn';
    btn.setAttribute('aria-label', 'Notifications');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = BELL;                      /* fixed markup, never user data */

    var dot = el('span', 'kisa-notif-count');
    dot.hidden = true;
    btn.appendChild(dot);

    var panel = el('div', 'kisa-notif-panel');
    panel.id = 'kisaNotifPanel';
    panel.setAttribute('role', 'menu');

    var head = el('div', 'kisa-notif-head');
    head.appendChild(el('span', 'kisa-notif-title', 'Notifications'));
    var readAll = el('button', 'kisa-notif-readall', 'Mark all read');
    readAll.type = 'button';
    head.appendChild(readAll);
    panel.appendChild(head);

    var list = el('div', 'kisa-notif-list');
    panel.appendChild(list);

    wrap.appendChild(btn);
    wrap.appendChild(panel);

    /* Before the account menu, so the bell sits left of the avatar. */
    var account = navRight.querySelector('.account-wrap');
    if (account) navRight.insertBefore(wrap, account);
    else navRight.appendChild(wrap);

    return { wrap: wrap, btn: btn, dot: dot, panel: panel, list: list, readAll: readAll };
  }

  function renderList(ui, rows) {
    ui.list.innerHTML = '';
    if (!rows.length) {
      ui.list.appendChild(el('div', 'kisa-notif-empty',
        'Nothing yet. When someone likes or comments on a report you posted, it shows up here.'));
      return;
    }
    rows.forEach(function (n) {
      var d = describe(n);
      var item = el('a', 'kisa-notif-item' + (n.read_at ? '' : ' unread'));
      item.href = 'community.html';

      var line = el('div', 'kisa-notif-text');
      /* Names are user supplied, so build this from text nodes rather than
         a template string. */
      var strong = el('strong', null, d.who);
      line.appendChild(strong);
      line.appendChild(document.createTextNode(d.what));
      item.appendChild(line);

      if (d.where) item.appendChild(el('div', 'kisa-notif-where', d.where));
      item.appendChild(el('div', 'kisa-notif-time', timeAgo(n.created_at)));

      item.addEventListener('click', function () {
        if (!n.read_at) KisaStore.notifications.markRead(n.id).catch(function () {});
      });
      ui.list.appendChild(item);
    });
  }

  function setCount(ui, count) {
    if (count > 0) {
      ui.dot.textContent = count > 9 ? '9+' : String(count);
      ui.dot.hidden = false;
      ui.btn.classList.add('has-unread');
    } else {
      ui.dot.hidden = true;
      ui.btn.classList.remove('has-unread');
    }
  }

  function refresh(ui) {
    if (!currentUser) return Promise.resolve();
    return KisaStore.notifications.unreadCount()
      .then(function (c) { setCount(ui, c); })
      .catch(function () { /* table not installed yet: stay quiet */ });
  }

  function mount(user) {
    var navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    var existing = navRight.querySelector('.kisa-notif-wrap');

    if (!user) {
      currentUser = null;
      if (existing) existing.remove();
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      return;
    }
    if (existing) return;      /* already mounted for this session */
    currentUser = user;

    var ui = build(navRight);

    ui.btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = ui.panel.classList.contains('open');
      ui.panel.classList.toggle('open', !open);
      ui.btn.setAttribute('aria-expanded', String(!open));
      if (open) return;
      ui.list.innerHTML = '';
      ui.list.appendChild(el('div', 'kisa-notif-empty', 'Loading...'));
      KisaStore.notifications.list(20).then(function (rows) {
        renderList(ui, rows);
      }).catch(function (err) {
        ui.list.innerHTML = '';
        var msg = /notifications|schema cache|does not exist/i.test(err.message || '')
          ? 'Notifications need one more setup step: run backend/migrations/003_notifications.sql in Supabase.'
          : (err.message || 'Could not load notifications.');
        ui.list.appendChild(el('div', 'kisa-notif-empty', msg));
      });
    });

    ui.readAll.addEventListener('click', function (e) {
      e.stopPropagation();
      KisaStore.notifications.markAllRead().then(function () {
        setCount(ui, 0);
        [].forEach.call(ui.list.querySelectorAll('.unread'), function (n) {
          n.classList.remove('unread');
        });
      }).catch(function () {});
    });

    document.addEventListener('click', function (e) {
      if (!ui.wrap.contains(e.target)) {
        ui.panel.classList.remove('open');
        ui.btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        ui.panel.classList.remove('open');
        ui.btn.setAttribute('aria-expanded', 'false');
      }
    });

    refresh(ui);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () { refresh(ui); }, POLL_MS);
  }

  function start() {
    if (!global.KisaStore) return;
    KisaStore.auth.onChange(function (user) { mount(user); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
