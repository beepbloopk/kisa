/* Kisa: the community feed.
 *
 * Renders real sightings, with likes and comments. Replaces four hardcoded
 * posts that were the same for every visitor.
 *
 * Likes and comments hang off sightings rather than posts, because the feed
 * shows sightings. That needs the tables in backend/sighting_social.sql. If
 * they are missing the feed still renders and says so, rather than breaking.
 *
 * Every value rendered here was typed by a member of the public, so it goes
 * in with textContent. There is no innerHTML anywhere below except for the
 * fixed icon markup at the bottom of the file.
 */
(function (global) {
  'use strict';

  var CONDITION = {
    'healthy':    { label: 'Safe',       cls: 'badge-safe' },
    'needs-care': { label: 'Needs Care', cls: 'badge-care' },
    'injured':    { label: 'Injured',    cls: 'badge-care' },
    'sos':        { label: 'SOS',        cls: 'badge-sos' }
  };

  var AGE = { kitten: 'Kitten', young: 'Young', adult: 'Adult', senior: 'Senior' };
  var GENDER = { male: 'Male', female: 'Female', unknown: 'Unknown' };

  var ICON = {
    pin:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    eye:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    chat:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    send:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>'
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function icon(svg) {
    var n = document.createElement('span');
    n.innerHTML = svg;           /* fixed markup from ICON above, never user data */
    return n;
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return 'just now';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    return new Date(iso).toLocaleDateString('en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function spottedWhen(row) {
    if (!row.sighted_date) return '';
    var d = new Date(row.sighted_date + 'T' + (row.sighted_time || '00:00:00'));
    if (isNaN(d.getTime())) return row.sighted_date;
    var day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    var time = row.sighted_time
      ? ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '';
    return 'Spotted ' + day + time;
  }

  /* ---------------------------------------------------------------
     Comments
     --------------------------------------------------------------- */

  function commentNode(c, currentUserId, onChanged) {
    var wrap = el('div', 'comment');
    var author = (c.profiles && c.profiles.display_name) || 'Someone';

    wrap.appendChild(el('div', 'comment-avatar', initials(author)));

    var body = el('div', 'comment-body');
    body.appendChild(el('div', 'comment-author', author));

    var textEl = el('div', 'comment-text', c.content);
    body.appendChild(textEl);

    var timeEl = el('div', 'comment-time',
      timeAgo(c.created_at) + (c.updated_at && c.updated_at !== c.created_at ? ' (edited)' : ''));
    body.appendChild(timeEl);

    /* Edit and delete only on your own comments. RLS enforces the same rule
       server side, so hiding the buttons is convenience, not security. */
    if (currentUserId && c.author_id === currentUserId) {
      var tools = el('div', 'comment-tools');
      var editBtn = el('button', 'comment-tool', 'Edit');
      var delBtn = el('button', 'comment-tool comment-tool-danger', 'Delete');
      editBtn.type = delBtn.type = 'button';

      editBtn.addEventListener('click', function () {
        if (wrap.querySelector('.comment-edit')) return;
        var box = el('div', 'comment-edit');
        var input = document.createElement('textarea');
        input.className = 'comment-edit-input';
        input.value = c.content;
        input.setAttribute('aria-label', 'Edit your comment');
        var save = el('button', 'comment-tool', 'Save');
        var cancel = el('button', 'comment-tool', 'Cancel');
        save.type = cancel.type = 'button';

        var row = el('div', 'comment-edit-actions');
        row.appendChild(save); row.appendChild(cancel);
        box.appendChild(input); box.appendChild(row);

        textEl.hidden = true; tools.hidden = true;
        body.insertBefore(box, timeEl);
        input.focus();

        cancel.addEventListener('click', function () {
          box.remove(); textEl.hidden = false; tools.hidden = false;
        });
        save.addEventListener('click', function () {
          var next = input.value.trim();
          if (!next) return;
          if (next === c.content) { cancel.click(); return; }
          save.disabled = true; save.textContent = 'Saving...';
          KisaStore.sightings.updateComment(c.id, next).then(function (updated) {
            c.content = updated.content;
            c.updated_at = updated.updated_at;
            textEl.textContent = updated.content;
            timeEl.textContent = timeAgo(c.created_at) + ' (edited)';
            box.remove(); textEl.hidden = false; tools.hidden = false;
          }).catch(function (err) {
            save.disabled = false; save.textContent = 'Save';
            window.alert(err.message || 'Could not save your edit.');
          });
        });
      });

      delBtn.addEventListener('click', function () {
        if (!window.confirm('Delete this comment?')) return;
        delBtn.disabled = true;
        KisaStore.sightings.deleteComment(c.id).then(function () {
          wrap.remove();
          if (typeof onChanged === 'function') onChanged(-1);
        }).catch(function (err) {
          delBtn.disabled = false;
          window.alert(err.message || 'Could not delete that comment.');
        });
      });

      tools.appendChild(editBtn);
      tools.appendChild(delBtn);
      body.appendChild(tools);
    }

    wrap.appendChild(body);
    return wrap;
  }

  /* ---------------------------------------------------------------
     One sighting
     --------------------------------------------------------------- */

  function postNode(row, user) {
    var article = el('article', 'post');
    var uid = user && user.id;

    /* Header */
    var header = el('div', 'post-header');
    var reporter = (row.profiles && row.profiles.display_name) || 'A neighbour';
    header.appendChild(el('div', 'post-avatar', initials(reporter)));

    var meta = el('div', 'post-meta');
    meta.appendChild(el('div', 'post-reporter', reporter));
    var locTime = el('div', 'post-location-time');
    locTime.appendChild(icon(ICON.pin));
    locTime.appendChild(el('span', null,
      (row.location_text || 'Location on map') + ' · ' + timeAgo(row.created_at)));
    meta.appendChild(locTime);
    header.appendChild(meta);

    /* Delete your own report. RLS refuses anyone else's, so this is
       convenience rather than the actual protection. */
    if (uid && row.reporter_id === uid) {
      var del = el('button', 'post-options post-delete');
      del.type = 'button';
      del.title = 'Delete this report';
      del.setAttribute('aria-label', 'Delete this report');
      del.innerHTML = ICON.trash;
      del.addEventListener('click', function () {
        if (!window.confirm('Delete this report? Its photo, likes and comments '
                          + 'go with it. This cannot be undone.')) return;
        del.disabled = true;
        KisaStore.sightings.remove(row.id).then(function () {
          article.style.transition = 'opacity 0.2s';
          article.style.opacity = '0';
          setTimeout(function () {
            var parent = article.parentNode;
            article.remove();
            if (parent && !parent.querySelector('.post')) render(parent);
          }, 220);
        }).catch(function (err) {
          del.disabled = false;
          window.alert(err.message || 'Could not delete that report.');
        });
      });
      header.appendChild(del);
    }
    article.appendChild(header);

    /* Photo */
    var paths = (row.sighting_images || []).map(function (i) { return i.storage_path; });
    if (paths.length) {
      var imgWrap = el('div', 'post-image');
      var img = document.createElement('img');
      img.src = KisaStore.sightings.publicPhotoUrl(paths[0]);
      img.alt = 'Cat reported at ' + (row.location_text || 'this location');
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        imgWrap.style.background = 'var(--accent-sky)';
        img.remove();
      });
      imgWrap.appendChild(img);

      var cond = CONDITION[row.condition];
      if (cond) {
        var badgeWrap = el('div', 'post-img-badge');
        badgeWrap.appendChild(el('span', 'badge ' + cond.cls, cond.label));
        imgWrap.appendChild(badgeWrap);
      }
      article.appendChild(imgWrap);
    }

    /* Body */
    var body = el('div', 'post-body');
    if (!paths.length && CONDITION[row.condition]) {
      var inline = el('div', 'post-img-badge post-badge-inline');
      inline.appendChild(el('span', 'badge ' + CONDITION[row.condition].cls,
                            CONDITION[row.condition].label));
      body.appendChild(inline);
    }

    var details = el('div', 'post-details');
    if (row.location_text) {
      var r1 = el('div', 'post-detail-row');
      r1.appendChild(icon(ICON.pin));
      r1.appendChild(el('span', null, row.location_text));
      details.appendChild(r1);
    }
    var when = spottedWhen(row);
    if (when) {
      var r2 = el('div', 'post-detail-row');
      r2.appendChild(icon(ICON.clock));
      r2.appendChild(el('span', null, when));
      details.appendChild(r2);
    }
    if (row.number_of_cats > 1) {
      var r3 = el('div', 'post-detail-row');
      r3.appendChild(icon(ICON.eye));
      r3.appendChild(el('span', null, row.number_of_cats + ' cats seen together'));
      details.appendChild(r3);
    }
    body.appendChild(details);

    var chips = el('div', 'post-chips');
    if (row.coat_color) chips.appendChild(el('span', 'chip', row.coat_color));
    if (row.gender && row.gender !== 'unknown') {
      chips.appendChild(el('span', 'chip', GENDER[row.gender] || row.gender));
    }
    if (row.age_group && row.age_group !== 'unknown') {
      chips.appendChild(el('span', 'chip', AGE[row.age_group] || row.age_group));
    }
    if (row.behaviour) chips.appendChild(el('span', 'chip chip-behavior', row.behaviour));
    if (chips.children.length) body.appendChild(chips);

    if (row.description) body.appendChild(el('p', 'post-desc', row.description));
    article.appendChild(body);

    /* Actions */
    var likes = row.sighting_likes || [];
    var liked = !!(uid && likes.some(function (l) { return l.user_id === uid; }));
    var likeCount = likes.length;

    var actions = el('div', 'post-actions');
    var likeBtn = el('button', 'action-btn' + (liked ? ' liked' : ''));
    likeBtn.type = 'button';
    likeBtn.setAttribute('aria-label', 'Like');
    likeBtn.appendChild(icon(ICON.heart));
    var likeNum = el('span', null, String(likeCount));
    likeBtn.appendChild(likeNum);

    likeBtn.addEventListener('click', function () {
      if (!uid) { window.location.href = 'login.html?next=community.html'; return; }
      var wasLiked = likeBtn.classList.contains('liked');
      /* Update immediately, put it back if the server disagrees. */
      likeBtn.classList.toggle('liked', !wasLiked);
      likeNum.textContent = String(Math.max(0, parseInt(likeNum.textContent, 10) + (wasLiked ? -1 : 1)));
      var op = wasLiked ? KisaStore.sightings.unlike(row.id) : KisaStore.sightings.like(row.id);
      op.catch(function (err) {
        likeBtn.classList.toggle('liked', wasLiked);
        likeNum.textContent = String(likeCount);
        window.alert(err.message || 'Could not register that.');
      });
    });
    actions.appendChild(likeBtn);

    var comments = (row.sighting_comments || []).slice().sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });

    var commentBtn = el('button', 'action-btn');
    commentBtn.type = 'button';
    commentBtn.setAttribute('aria-label', 'Comments');
    commentBtn.appendChild(icon(ICON.chat));
    var commentNum = el('span', null, String(comments.length));
    commentBtn.appendChild(commentNum);
    actions.appendChild(commentBtn);

    actions.appendChild(el('div', 'action-spacer'));

    /* "I've taken them in". Open to any signed-in neighbour, because whoever
       ends up housing the cat is often not whoever reported it. */
    if (row.taken_in_by) {
      actions.appendChild(el('span', 'taken-in-badge', 'Taken in'));
    } else if (uid) {
      var adopt = el('button', 'btn-adopt', "I've taken them in");
      adopt.type = 'button';
      adopt.addEventListener('click', function () {
        var note = window.prompt(
          'Let the community know this cat is safe with you.\n\n'
          + 'Add a note (optional), for example "Taking them to the vet tomorrow".', '');
        if (note === null) return;    /* cancelled */
        adopt.disabled = true;
        adopt.textContent = 'Saving...';
        KisaStore.sightings.markTakenIn(row.id, note).then(function () {
          adopt.replaceWith(el('span', 'taken-in-badge', 'Taken in'));
        }).catch(function (err) {
          adopt.disabled = false;
          adopt.textContent = "I've taken them in";
          window.alert(err.message || 'Could not save that.');
        });
      });
      actions.appendChild(adopt);
    }
    article.appendChild(actions);

    /* Comments */
    var panel = el('div', 'post-comments');
    panel.style.display = 'none';
    var list = el('div', 'comments-list');

    function bumpCount(delta) {
      commentNum.textContent = String(Math.max(0, parseInt(commentNum.textContent, 10) + delta));
    }

    comments.forEach(function (c) {
      list.appendChild(commentNode(c, uid, bumpCount));
    });
    panel.appendChild(list);

    var inputRow = el('div', 'comment-input-row');
    inputRow.appendChild(el('div', 'comment-avatar',
      uid ? initials((user.user_metadata && user.user_metadata.full_name) || user.email) : 'You'));

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'comment-input';
    input.placeholder = uid ? 'Add a comment...' : 'Sign in to comment';
    input.setAttribute('aria-label', 'Add a comment');
    if (!uid) input.disabled = true;

    var sendBtn = el('button', 'comment-send-btn');
    sendBtn.type = 'button';
    sendBtn.setAttribute('aria-label', 'Send comment');
    sendBtn.appendChild(icon(ICON.send));
    if (!uid) sendBtn.disabled = true;

    function send() {
      var text = input.value.trim();
      if (!text || !uid) return;
      sendBtn.disabled = true;
      KisaStore.sightings.addComment(row.id, text).then(function (created) {
        if (!created.profiles) {
          created.profiles = {
            display_name: (user.user_metadata && user.user_metadata.full_name) || user.email
          };
        }
        list.appendChild(commentNode(created, uid, bumpCount));
        input.value = '';
        sendBtn.disabled = false;
        bumpCount(1);
      }).catch(function (err) {
        sendBtn.disabled = false;
        window.alert(err.message || 'Could not post that comment.');
      });
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    panel.appendChild(inputRow);
    article.appendChild(panel);

    commentBtn.addEventListener('click', function () {
      var open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      if (!open) input.focus();
    });

    return article;
  }

  /* ---------------------------------------------------------------
     Render
     --------------------------------------------------------------- */

  function render(container, opts) {
    opts = opts || {};
    if (!container) return Promise.resolve();

    container.innerHTML = '';
    container.appendChild(el('div', 'feed-status', 'Loading sightings...'));

    return KisaStore.auth.getUser().catch(function () { return null; })
      .then(function (user) {
        return KisaStore.sightings.listFeed(opts.limit || 30)
          .then(function (rows) { return { user: user, rows: rows }; });
      })
      .then(function (res) {
        container.innerHTML = '';
        if (!res.rows.length) {
          var empty = el('div', 'feed-status');
          empty.appendChild(el('div', 'feed-status-title', 'No sightings yet'));
          empty.appendChild(el('div', null,
            'When someone reports a cat nearby, it will show up here.'));
          var cta = el('a', 'btn btn-primary', 'Report a Sighting');
          cta.href = 'report.html';
          cta.style.marginTop = '16px';
          empty.appendChild(cta);
          container.appendChild(empty);
          return;
        }
        res.rows.forEach(function (row) {
          container.appendChild(postNode(row, res.user));
        });
        if (global.lucide) { try { global.lucide.createIcons(); } catch (e) {} }
      })
      .catch(function (err) {
        container.innerHTML = '';
        var msg = (err && err.message) || 'Could not load the feed.';
        /* The social tables are added separately, so name the fix rather
           than showing a bare Postgres error. */
        if (/sighting_likes|sighting_comments|schema cache|does not exist/i.test(msg)) {
          msg = 'The feed needs one more setup step: run '
              + 'backend/sighting_social.sql in Supabase.';
        }
        var box = el('div', 'feed-status');
        box.appendChild(el('div', 'feed-status-title', 'Feed unavailable'));
        box.appendChild(el('div', null, msg));
        container.appendChild(box);
      });
  }

  global.KisaFeed = { render: render, timeAgo: timeAgo };
})(window);
