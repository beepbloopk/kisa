/* Kisa: shared auth state for the navigation bar.
 *
 * Before this existed, index.html always showed "Log In / Sign Up" and every
 * other page always showed an avatar and a "Log Out" menu, regardless of
 * whether anyone was signed in. A stranger opening the dashboard saw a
 * logged-in navbar.
 *
 * This does not rebuild .nav-right, it toggles between the two states. The
 * per-page dropdown scripts capture #accountBtn on load, so replacing the
 * markup would silently break them. Anything this file injects, it wires
 * itself; anything the page already owns, it leaves alone.
 *
 * Load after kisa-store.js:
 *   <script src="assets/js/kisa-auth-ui.js" defer></script>
 */
(function () {
  'use strict';

  /* Pages that make no sense signed out. Sends you to login and back. */
  var PROTECTED = ['profile.html', 'dashboard.html'];

  /* The reverse: showing a login form to someone already signed in is just
     confusing, and submitting it would sign them in as themselves again. */
  var AUTH_PAGES = ['login.html', 'signup.html'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  /* Read the session straight out of storage so the correct navbar paints on
     the first frame. Supabase's getSession() is async, and waiting for it
     makes the wrong state flash first. Confirmed against the real session
     immediately afterwards. */
  function cachedSession() {
    /* Both stores: with "remember me" off the session lives in
       sessionStorage instead, and the navbar has to find it there too. */
    var stores;
    try { stores = [localStorage, sessionStorage]; }
    catch (e) { return null; }

    for (var s = 0; s < stores.length; s++) {
      try {
        for (var i = 0; i < stores[s].length; i++) {
          var k = stores[s].key(i);
          if (/^sb-.*-auth-token$/.test(k)) {
            var v = JSON.parse(stores[s].getItem(k));
            if (v && v.access_token && v.user) return v;
          }
        }
      } catch (e) { /* private mode, blocked storage: treat as signed out */ }
    }
    return null;
  }

  function build(navRight) {
    var out = navRight.querySelector('.kisa-auth-out');
    var inn = navRight.querySelector('.account-wrap');

    /* The signed-out links: present on index.html, missing everywhere else. */
    if (!out) {
      var existing = navRight.querySelectorAll('.btn-nav-ghost, .btn-nav-fill');
      out = document.createElement('div');
      out.className = 'kisa-auth-out';
      if (existing.length) {
        navRight.insertBefore(out, existing[0]);
        Array.prototype.forEach.call(existing, function (el) { out.appendChild(el); });
      } else {
        out.innerHTML =
          '<a href="login.html" class="btn-nav-ghost">Log In</a>' +
          '<a href="signup.html" class="btn-nav-fill">Sign Up</a>';
        navRight.appendChild(out);
      }
    }

    /* The signed-in account menu: present everywhere except index.html. */
    var injected = false;
    if (!inn) {
      inn = document.createElement('div');
      inn.className = 'account-wrap';
      inn.innerHTML =
        '<button class="account-btn" id="accountBtn" type="button" aria-haspopup="true" ' +
        'aria-expanded="false" aria-controls="accountMenu" aria-label="Account menu">' +
        '<i data-lucide="circle-user-round" style="width:22px;height:22px;"></i></button>' +
        '<div class="account-menu" id="accountMenu" role="menu">' +
        '<a href="profile.html" role="menuitem"><i data-lucide="user"></i> My Account</a>' +
        '<div class="account-menu-divider"></div>' +
        '<a href="#" id="logoutLink" role="menuitem"><i data-lucide="log-out"></i> Log Out</a>' +
        '</div>';
      navRight.appendChild(inn);
      injected = true;
    }
    return { out: out, in: inn, injected: injected };
  }

  /* Only for a dropdown this file created. Pages that ship their own
     account menu already wire it, and wiring it twice would mean two
     toggles per click, which cancel out and the menu never opens. */
  function wireDropdown(scope) {
    var btn = scope.querySelector('#accountBtn');
    var menu = scope.querySelector('#accountMenu');
    if (!btn || !menu) return;
    function close() {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.classList.contains('open');
      menu.classList.toggle('open', !open);
      btn.classList.toggle('open', !open);
      btn.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* Show who is signed in, above the menu items. */
  function showName(menu, name) {
    if (!menu || !name) return;
    var row = menu.querySelector('.kisa-account-name');
    if (!row) {
      row = document.createElement('div');
      row.className = 'kisa-account-name';
      menu.insertBefore(row, menu.firstChild);
    }
    /* textContent, never innerHTML: display_name is user supplied. */
    row.textContent = name;
  }

  function applyMobile(signedIn, name) {
    var menu = document.getElementById('mobileMenu');
    if (!menu) return;

    var logout = document.getElementById('logoutLinkMobile');
    if (logout) logout.hidden = !signedIn;

    var block = menu.querySelector('.kisa-mobile-auth');
    if (!block) {
      block = document.createElement('div');
      block.className = 'kisa-mobile-auth';
      block.innerHTML =
        '<a href="login.html">Log In</a>' +
        '<a href="signup.html">Sign Up</a>';
      menu.appendChild(block);
    }
    block.hidden = signedIn;

    var who = menu.querySelector('.kisa-mobile-who');
    if (signedIn && name) {
      if (!who) {
        who = document.createElement('div');
        who.className = 'kisa-mobile-who';
        menu.insertBefore(who, menu.firstChild);
      }
      who.textContent = 'Signed in as ' + name;
      who.hidden = false;
    } else if (who) {
      who.hidden = true;
    }
  }

  function wireLogout() {
    /* profile.html has a third one in its sidebar. */
    ['logoutLink', 'logoutLinkMobile', 'logoutSidebar'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.dataset.kisaLogout) return;
      el.dataset.kisaLogout = '1';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var done = function () { location.href = 'index.html'; };
        if (window.KisaStore) {
          KisaStore.auth.signOut().then(done).catch(done);
        } else {
          done();
        }
      }, true);
    });
  }

  function render(user) {
    var navRight = document.querySelector('.nav-right');
    if (!navRight) return;
    var parts = build(navRight);

    /* Pages hide their nav actions at different widths (900px on most,
       960px on livemap and profile), so rather than guess a breakpoint,
       follow the page: if its hamburger is showing, the mobile menu is in
       charge and the desktop auth buttons stand down. */
    var hamburger = document.querySelector('.hamburger');
    var mobile = hamburger && getComputedStyle(hamburger).display !== 'none';

    parts.out.hidden = !!user || mobile;
    parts.in.hidden = !user || mobile;

    if (parts.injected) wireDropdown(parts.in);
    wireLogout();

    if (user) {
      var name = (user.user_metadata && user.user_metadata.full_name) || user.email || '';
      showName(parts.in.querySelector('#accountMenu'), name);
      applyMobile(true, name);
    } else {
      applyMobile(false, null);
    }

    if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
  }

  function guard(user) {
    var page = currentPage();
    if (user) {
      if (AUTH_PAGES.indexOf(page) !== -1) location.replace('dashboard.html');
      return;
    }
    if (PROTECTED.indexOf(page) === -1) return;
    location.replace('login.html?next=' + encodeURIComponent(page));
  }

  function start() {
    var cached = cachedSession();
    render(cached ? cached.user : null);
    guard(cached ? cached.user : null);

    /* Now confirm with the real session: the cached copy can be stale if the
       token expired or the account was signed out in another tab. */
    if (!window.KisaStore) return;
    KisaStore.auth.onChange(function (user) {
      render(user);
      guard(user);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  /* Re-evaluate on resize: crossing the breakpoint changes which set of
     controls should be visible. */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var cached = cachedSession();
      render(cached ? cached.user : null);
    }, 150);
  });

  window.KisaAuthUI = { render: render, escapeHtml: esc };
})();
