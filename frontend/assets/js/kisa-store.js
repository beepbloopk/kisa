/* Kisa: data layer.
 *
 * Every page talks to Supabase through this file and nothing else, so the
 * column names and query shapes live in one place. Load order matters:
 *
 *   <script src="https://unpkg.com/@supabase/supabase-js@2.58.0/dist/umd/supabase.js"></script>
 *   <script src="assets/js/kisa-config.js"></script>
 *   <script src="assets/js/kisa-store.js"></script>
 *
 * Names here mirror the live database exactly. Notable traps, all of which
 * cost a failed insert to discover:
 *   - sightings.condition, not `status`
 *   - sightings.location is geography NOT NULL, a report cannot be saved
 *     without real coordinates
 *   - sighted_date (date) and sighted_time (time) are separate columns
 *   - age_group and match_status are NOT NULL with CHECK constraints
 *   - profiles.display_name is filled by the handle_new_user trigger from
 *     the `full_name` key in signup metadata
 *   - updated_at is maintained by triggers; never write it
 */
(function (global) {
  'use strict';

  var client = null;

  /* "Remember me" decides where the session is kept. localStorage survives
     closing the browser; sessionStorage does not. Supabase defaults to
     localStorage always, which is why the checkbox did nothing before.
     The adapter is consulted on every read and write, so the choice can be
     made at sign-in time rather than when the client is created. */
  var REMEMBER_KEY = 'kisa_remember';

  function remembering() {
    try { return localStorage.getItem(REMEMBER_KEY) !== '0'; }
    catch (e) { return true; }
  }

  var sessionStore = {
    getItem: function (k) {
      try { return (remembering() ? localStorage : sessionStorage).getItem(k); }
      catch (e) { return null; }
    },
    setItem: function (k, v) {
      try { (remembering() ? localStorage : sessionStorage).setItem(k, v); }
      catch (e) { /* storage blocked: the session just will not persist */ }
    },
    removeItem: function (k) {
      /* Clear both, so signing out never leaves a stale copy behind. */
      try { localStorage.removeItem(k); } catch (e) {}
      try { sessionStorage.removeItem(k); } catch (e) {}
    }
  };

  function sb() {
    if (client) return client;
    if (!global.supabase || !global.supabase.createClient) {
      throw new Error('supabase-js has not loaded, check the <script> order.');
    }
    if (!global.KISA_CONFIG || !global.KISA_CONFIG.supabaseUrl) {
      throw new Error('kisa-config.js has not loaded.');
    }
    client = global.supabase.createClient(
      global.KISA_CONFIG.supabaseUrl,
      global.KISA_CONFIG.supabaseAnonKey,
      { auth: { persistSession: true, autoRefreshToken: true, storage: sessionStore } }
    );
    return client;
  }

  /* Postgres errors are terse and often leak schema detail. Translate the
     ones a user can actually act on, and keep the rest generic. */
  function humanise(error) {
    if (!error) return null;
    var msg = error.message || String(error);
    var code = error.code || '';

    if (/Invalid login credentials/i.test(msg)) return 'That email and password don’t match. Please try again.';
    if (/Email not confirmed/i.test(msg))       return 'Please confirm your email address first, check your inbox.';
    if (/User already registered/i.test(msg) || code === '23505') return 'An account with that email already exists.';
    if (/Password should be at least/i.test(msg)) return 'Please choose a password of at least 6 characters.';
    if (/rate limit|too many/i.test(msg))       return 'Too many attempts. Please wait a moment and try again.';
    if (code === '42501') return 'You need to be signed in to do that.';
    if (code === '23514') return 'Some of those details weren’t in a format we accept.';
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'Can’t reach the server. Check your connection and try again.';
    return msg;
  }

  function fail(error) {
    var e = new Error(humanise(error));
    e.cause = error;
    return e;
  }

  /* The INSERT policies check auth.uid() against the row's owner column, and
     those columns are nullable with no default, so an insert that omits them
     writes NULL and is rejected by RLS with a confusing 42501. Every create()
     below resolves the current user id first and sets it explicitly. */
  function requireUserId() {
    return sb().auth.getUser().then(function (r) {
      if (r.error || !r.data.user) throw new Error('Please sign in first.');
      return r.data.user.id;
    });
  }

  /* ── Auth ─────────────────────────────────────────────────────── */

  var Auth = {
    /* The trigger handle_new_user reads raw_user_meta_data->>'full_name'
       to populate profiles.display_name, which is NOT NULL. That key name
       is load-bearing, do not rename it. */
    signUp: function (email, password, fullName) {
      return sb().auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
      }).then(function (r) {
        if (r.error) throw fail(r.error);
        return {
          user: r.data.user,
          /* No session means the project requires email confirmation. */
          needsConfirmation: !r.data.session
        };
      });
    },

    /* Call before signIn. true keeps you signed in after the browser closes,
       false ends the session with the browser. */
    setRemember: function (on) {
      try { localStorage.setItem(REMEMBER_KEY, on ? '1' : '0'); } catch (e) {}
    },

    isRemembering: remembering,

    signIn: function (email, password) {
      return sb().auth.signInWithPassword({ email: email, password: password })
        .then(function (r) {
          if (r.error) throw fail(r.error);
          return r.data.user;
        });
    },

    /* Deleting a user requires privileges the anon key does not have, so this
       calls delete_own_account(), a SECURITY DEFINER function in the database
       that removes the caller's own rows and then their auth record. If that
       function has not been installed the call fails loudly rather than
       pretending it worked. */
    deleteAccount: function () {
      return sb().rpc('delete_own_account').then(function (r) {
        if (r.error) {
          var m = r.error.message || '';
          if (/could not find|does not exist|schema cache/i.test(m)) {
            throw new Error('Account deletion is not set up on the server yet. ' +
                            'Please contact us at hello@kisa.app and we will remove your account.');
          }
          throw fail(r.error);
        }
        return sb().auth.signOut();
      });
    },

    signOut: function () {
      return sb().auth.signOut().then(function (r) {
        if (r.error) throw fail(r.error);
      });
    },

    sendPasswordReset: function (email, redirectTo) {
      return sb().auth.resetPasswordForEmail(email, { redirectTo: redirectTo })
        .then(function (r) { if (r.error) throw fail(r.error); });
    },

    getUser: function () {
      return sb().auth.getUser().then(function (r) {
        return r.error ? null : r.data.user;
      });
    },

    getSession: function () {
      return sb().auth.getSession().then(function (r) {
        return r.error ? null : r.data.session;
      });
    },

    /* Fires immediately with the current state, then on every change. */
    onChange: function (cb) {
      sb().auth.getSession().then(function (r) {
        cb(r.data && r.data.session ? r.data.session.user : null);
      });
      return sb().auth.onAuthStateChange(function (_evt, session) {
        cb(session ? session.user : null);
      });
    }
  };

  /* ── Profiles ─────────────────────────────────────────────────── */

  var Profiles = {
    get: function (userId) {
      return sb().from('profiles')
        .select('id, display_name, avatar_url, phone, created_at')
        .eq('id', userId).maybeSingle()
        .then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    /* Only display_name, avatar_url and phone exist on this table. The
       profile form also collects a bio and location, which have nowhere to
       go yet, see updateExtras below. */
    update: function (userId, fields) {
      var allowed = {};
      ['display_name', 'avatar_url', 'phone'].forEach(function (k) {
        if (fields[k] !== undefined) allowed[k] = fields[k];
      });
      return sb().from('profiles').update(allowed).eq('id', userId).select().single()
        .then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    /* avatars is a PRIVATE bucket, so the stored path has to be exchanged
       for a signed URL before it can be shown. Path is "<uid>/avatar.<ext>"
       so storage policies can check ownership by folder name. */
    uploadAvatar: function (userId, file) {
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      var path = userId + '/avatar.' + ext;
      return sb().storage.from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
        .then(function (r) { if (r.error) throw fail(r.error); return path; });
    },

    avatarUrl: function (path, seconds) {
      if (!path) return Promise.resolve(null);
      if (/^https?:/.test(path)) return Promise.resolve(path);
      return sb().storage.from('avatars').createSignedUrl(path, seconds || 3600)
        .then(function (r) { return r.error ? null : r.data.signedUrl; });
    }
  };

  /* ── Sightings ────────────────────────────────────────────────── */

  var AGE_GROUPS = ['unknown', 'kitten', 'young', 'adult', 'senior'];

  var Sightings = {
    /* `input` uses the report form's own vocabulary; the mapping to real
       column names happens here so the page never has to know it. */
    create: function (input) {
      if (typeof input.lat !== 'number' || typeof input.lng !== 'number') {
        return Promise.reject(new Error('Please choose the location on the map before submitting.'));
      }
      var age = AGE_GROUPS.indexOf(input.ageGroup) === -1 ? 'unknown' : input.ageGroup;

      var row = {
        /* PostGIS geography accepts WKT; lng comes first in POINT(). */
        location:           'SRID=4326;POINT(' + input.lng + ' ' + input.lat + ')',
        location_text:      input.locationText || null,
        sighted_date:       input.sightedDate,
        sighted_time:       input.sightedTime || null,
        condition:          input.condition || null,
        coat_color:         input.coatColor || null,
        gender:             input.gender || null,
        behaviour:          input.behaviour || null,
        number_of_cats:     input.numberOfCats || 1,
        description:        input.description || null,
        contact_preference: input.contactPreference || null,
        age_group:          age,
        match_status:       'pending',
        confirmed:          false
      };
      return requireUserId().then(function (uid) {
        row.reporter_id = uid;
        return sb().from('sightings').insert(row).select().single();
      }).then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    /* sighting-images is a public bucket, so the returned URL is permanent
       and can go straight into an <img src>. */
    addPhoto: function (sightingId, file) {
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      var path = sightingId + '/' + Date.now() + '.' + ext;
      return sb().storage.from('sighting-images')
        .upload(path, file, { contentType: file.type })
        .then(function (r) {
          if (r.error) throw fail(r.error);
          return sb().from('sighting_images')
            .insert({ sighting_id: sightingId, storage_path: path }).select().single();
        })
        .then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    publicPhotoUrl: function (path) {
      if (!path) return null;
      return sb().storage.from('sighting-images').getPublicUrl(path).data.publicUrl;
    },

    listRecent: function (limit) {
      return sb().from('sightings')
        .select('id, condition, location_text, sighted_date, sighted_time, coat_color, ' +
                'gender, age_group, behaviour, number_of_cats, description, created_at, ' +
                'cat_id, reporter_id, sighting_images(storage_path)')
        .order('created_at', { ascending: false })
        .limit(limit || 30)
        .then(function (r) { if (r.error) throw fail(r.error); return r.data || []; });
    },

    listMine: function (userId) {
      return sb().from('sightings')
        .select('id, condition, location_text, sighted_date, created_at, match_status, ' +
                'sighting_images(storage_path)')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false })
        .then(function (r) { if (r.error) throw fail(r.error); return r.data || []; });
    },

    /* The community feed reads sightings directly, so likes and comments hang
       off sightings rather than posts. One request pulls the sighting, its
       photos, who reported it, and every like and comment. */
    listFeed: function (limit) {
      return sb().from('sightings')
        .select('id, condition, location_text, sighted_date, sighted_time, created_at, ' +
                'coat_color, gender, age_group, behaviour, number_of_cats, description, ' +
                'match_status, reporter_id, cat_id, ' +
                'sighting_images(storage_path), ' +
                'profiles:reporter_id(display_name, avatar_url), ' +
                'sighting_likes(user_id), ' +
                'sighting_comments(id, content, created_at, updated_at, author_id, ' +
                                  'profiles:author_id(display_name))')
        .order('created_at', { ascending: false })
        .limit(limit || 30)
        .then(function (r) {
          if (r.error) throw fail(r.error);
          return r.data || [];
        });
    },

    like: function (sightingId) {
      return requireUserId().then(function (uid) {
        return sb().from('sighting_likes')
          .insert({ sighting_id: sightingId, user_id: uid });
      }).then(function (r) { if (r.error) throw fail(r.error); });
    },

    unlike: function (sightingId) {
      return requireUserId().then(function (uid) {
        return sb().from('sighting_likes').delete()
          .eq('sighting_id', sightingId).eq('user_id', uid);
      }).then(function (r) { if (r.error) throw fail(r.error); });
    },

    addComment: function (sightingId, content) {
      return requireUserId().then(function (uid) {
        return sb().from('sighting_comments')
          .insert({ sighting_id: sightingId, author_id: uid, content: content })
          .select('id, content, created_at, updated_at, author_id, ' +
                  'profiles:author_id(display_name)')
          .single();
      }).then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    /* RLS restricts both of these to your own rows, so a tampered id fails
       at the database rather than relying on the UI hiding the buttons. */
    updateComment: function (commentId, content) {
      return sb().from('sighting_comments')
        .update({ content: content })
        .eq('id', commentId)
        .select('id, content, created_at, updated_at, author_id')
        .single()
        .then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    deleteComment: function (commentId) {
      return sb().from('sighting_comments').delete().eq('id', commentId)
        .then(function (r) { if (r.error) throw fail(r.error); });
    },

    /* The map needs plain lat/lng, which the geography column does not give
       directly. sightings_map is a view that exposes them, running as the
       caller so the same RLS applies. */
    listForMap: function (limit) {
      return sb().from('sightings_map')
        .select('id, condition, location_text, sighted_date, sighted_time, created_at, ' +
                'description, coat_color, gender, age_group, number_of_cats, ' +
                'reporter_id, taken_in_by, taken_in_at, lat, lng')
        .not('lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit || 200)
        .then(function (r) { if (r.error) throw fail(r.error); return r.data || []; });
    },

    /* Anyone signed in can mark a cat as taken in, because the person who
       ends up housing it is often not the one who reported it. This goes
       through an RPC because an RLS policy permissive enough to let a
       stranger set taken_in_by would also let them rewrite the whole row. */
    markTakenIn: function (sightingId, note) {
      return sb().rpc('mark_taken_in', { p_sighting_id: sightingId, p_note: note || null })
        .then(function (r) {
          if (r.error) {
            var m = r.error.message || '';
            if (/could not find|does not exist|schema cache/i.test(m)) {
              throw new Error('This needs one more setup step: run ' +
                              'backend/map_and_rescue.sql in Supabase.');
            }
            throw fail(r.error);
          }
        });
    },

    undoTakenIn: function (sightingId) {
      return sb().rpc('undo_taken_in', { p_sighting_id: sightingId })
        .then(function (r) { if (r.error) throw fail(r.error); });
    },

    /* Delete a report. The sighting_images, likes and comments rows cascade,
       but the uploaded files in storage do not, so remove those first. RLS
       limits this to your own sightings. */
    remove: function (sightingId) {
      return sb().from('sighting_images').select('storage_path')
        .eq('sighting_id', sightingId)
        .then(function (r) {
          var paths = (r.data || []).map(function (i) { return i.storage_path; });
          if (!paths.length) return null;
          /* Best effort: a leftover file is untidy, a blocked delete is worse. */
          return sb().storage.from('sighting-images').remove(paths).catch(function () {});
        })
        .then(function () {
          return sb().from('sightings').delete().eq('id', sightingId).select();
        })
        .then(function (r) {
          if (r.error) throw fail(r.error);
          /* An empty result means RLS matched nothing, so it was not yours. */
          if (!r.data || !r.data.length) {
            throw new Error('That report could not be deleted. It may not be yours.');
          }
          return true;
        });
    }
  };

  /* ── Stats ────────────────────────────────────────────────────── */

  var Stats = {
    /* Counts for the homepage. head:true means Postgres returns the count
       without sending any rows. Everything here is publicly readable, so it
       works signed out too. */
    overview: function () {
      var weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      function count(q) {
        return q.then(function (r) { return r.error ? null : (r.count || 0); });
      }
      return Promise.all([
        count(sb().from('sightings').select('id', { count: 'exact', head: true })),
        count(sb().from('sightings').select('id', { count: 'exact', head: true })
                .eq('condition', 'sos').is('taken_in_by', null)),
        count(sb().from('profiles').select('id', { count: 'exact', head: true })),
        count(sb().from('sightings').select('id', { count: 'exact', head: true })
                .gte('created_at', weekAgo)),
        count(sb().from('sightings').select('id', { count: 'exact', head: true })
                .not('taken_in_by', 'is', null))
      ]).then(function (r) {
        return {
          sightings: r[0], activeSos: r[1], neighbours: r[2],
          thisWeek: r[3], takenIn: r[4]
        };
      });
    }
  };

  /* ── Notifications ────────────────────────────────────────────── */

  var Notifications = {
    /* Rows are created by database triggers, never by the client, so there
       is no create() here on purpose. */
    list: function (limit) {
      return sb().from('notifications')
        .select('id, type, read_at, created_at, sighting_id, comment_id, ' +
                'actor:actor_id(display_name), ' +
                'sightings:sighting_id(location_text, condition)')
        .order('created_at', { ascending: false })
        .limit(limit || 20)
        .then(function (r) { if (r.error) throw fail(r.error); return r.data || []; });
    },

    unreadCount: function () {
      return sb().from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .then(function (r) { return r.error ? 0 : (r.count || 0); });
    },

    markAllRead: function () {
      return requireUserId().then(function (uid) {
        return sb().from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', uid).is('read_at', null);
      }).then(function (r) { if (r.error) throw fail(r.error); });
    },

    markRead: function (id) {
      return sb().from('notifications')
        .update({ read_at: new Date().toISOString() }).eq('id', id)
        .then(function (r) { if (r.error) throw fail(r.error); });
    }
  };

  /* ── Community feed (posts) ───────────────────────────────────── */

  var Feed = {
    list: function (limit) {
      return sb().from('posts')
        .select('id, content, created_at, author_id, cat_id, ' +
                'profiles:author_id(display_name, avatar_url), ' +
                'post_images(storage_path), ' +
                'post_likes(user_id), ' +
                'post_comments(id, content, created_at, author_id, profiles:author_id(display_name))')
        .order('created_at', { ascending: false })
        .limit(limit || 20)
        .then(function (r) { if (r.error) throw fail(r.error); return r.data || []; });
    },

    create: function (content, catId) {
      return requireUserId().then(function (uid) {
        return sb().from('posts')
          .insert({ content: content, cat_id: catId || null, author_id: uid })
          .select().single();
      }).then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    like: function (postId) {
      return requireUserId().then(function (uid) {
        return sb().from('post_likes').insert({ post_id: postId, user_id: uid });
      }).then(function (r) { if (r.error) throw fail(r.error); });
    },

    unlike: function (postId) {
      return requireUserId().then(function (uid) {
        return sb().from('post_likes').delete().eq('post_id', postId).eq('user_id', uid);
      }).then(function (r) { if (r.error) throw fail(r.error); });
    },

    comment: function (postId, content) {
      return requireUserId().then(function (uid) {
        return sb().from('post_comments')
          .insert({ post_id: postId, content: content, author_id: uid })
          .select('id, content, created_at, author_id, profiles:author_id(display_name)').single();
      }).then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    publicImageUrl: function (path) {
      if (!path) return null;
      return sb().storage.from('post-images').getPublicUrl(path).data.publicUrl;
    }
  };

  /* ── SOS ──────────────────────────────────────────────────────── */

  var Sos = {
    create: function (lat, lng, description, catId) {
      return requireUserId().then(function (uid) {
        return sb().from('sos_reports').insert({
          location:    'SRID=4326;POINT(' + lng + ' ' + lat + ')',
          description: description || null,
          cat_id:      catId || null,
          reporter_id: uid,
          status:      'active'
        }).select().single();
      }).then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    },

    listActive: function () {
      return sb().from('sos_reports')
        .select('id, description, status, created_at, cat_id, reporter_id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .then(function (r) { if (r.error) throw fail(r.error); return r.data || []; });
    }
  };

  /* ── Cats ─────────────────────────────────────────────────────── */

  var Cats = {
    /* Read-only from the client: `cats` has a SELECT policy but no INSERT,
       so profiles are created by matching a pending sighting server-side. */
    list: function (limit) {
      return sb().from('cats')
        .select('id, name, nickname, status, color, coat_pattern, gender, age_group, ' +
                'location_name, latitude, longitude, profile_image_url, last_seen_at')
        .order('last_seen_at', { ascending: false })
        .limit(limit || 50)
        .then(function (r) { if (r.error) throw fail(r.error); return r.data || []; });
    },

    get: function (id) {
      return sb().from('cats').select('*').eq('id', id).maybeSingle()
        .then(function (r) { if (r.error) throw fail(r.error); return r.data; });
    }
  };

  global.KisaStore = {
    client: sb,
    auth: Auth,
    profiles: Profiles,
    sightings: Sightings,
    notifications: Notifications,
    stats: Stats,
    feed: Feed,
    sos: Sos,
    cats: Cats,
    AGE_GROUPS: AGE_GROUPS,
    _humanise: humanise
  };
})(window);
