/* Kisa: map picker built on Leaflet.
 *
 * sightings.location is a PostGIS geography column and NOT NULL, so a report
 * cannot be saved without real coordinates. The old map was a decorative div
 * that toggled a CSS class and produced nothing.
 *
 * Load after Leaflet:
 *   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
 *   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
 *   <script src="assets/js/kisa-map.js"></script>
 *
 * The marker is a CSS divIcon, not Leaflet's default PNG. That image would be
 * fetched from unpkg, which img-src does not allow, and widening the policy
 * for a pin shape is not worth it.
 */
(function (global) {
  'use strict';

  var TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  /* Roughly central London. Only used until the visitor picks a point or
     their browser offers a real location. */
  var FALLBACK = [51.5074, -0.1278];

  function pinIcon() {
    return global.L.divIcon({
      className: 'kisa-pin',
      html: '<span class="kisa-pin-dot"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  /* Nominatim asks that callers identify themselves and do not hammer it.
     One lookup per pin drop is well inside their usage policy. */
  function reverseGeocode(lat, lng) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=' +
              encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng);
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return (d && d.display_name) || null; })
      .catch(function () { return null; });
  }

  function createPicker(container, opts) {
    opts = opts || {};
    if (!global.L) throw new Error('Leaflet has not loaded.');

    /* The placeholder markup lives inside the same element; clear it so the
       decorative grid and "coming soon" label do not show through the map. */
    container.innerHTML = '';
    container.classList.add('kisa-map');

    var map = global.L.map(container, {
      center: opts.center || FALLBACK,
      zoom: opts.zoom || 13,
      scrollWheelZoom: false,   /* so the page still scrolls over the map */
      attributionControl: true
    });

    global.L.tileLayer(TILES, { attribution: ATTRIB, maxZoom: 19 }).addTo(map);

    /* Scroll wheel zoom only once the map has been clicked, so scrolling the
       page does not get hijacked the moment the cursor passes over it. */
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });

    var marker = null;
    var point = null;

    function place(lat, lng, quiet) {
      point = { lat: lat, lng: lng };
      if (!marker) {
        marker = global.L.marker([lat, lng], {
          icon: pinIcon(), draggable: true, keyboard: true,
          title: 'Sighting location, drag to adjust'
        }).addTo(map);
        marker.on('dragend', function () {
          var p = marker.getLatLng();
          place(p.lat, p.lng);
        });
      } else {
        marker.setLatLng([lat, lng]);
      }
      container.classList.add('has-pin');
      if (!quiet && typeof opts.onPick === 'function') opts.onPick(lat, lng);
    }

    map.on('click', function (e) { place(e.latlng.lat, e.latlng.lng); });

    /* Leaflet measures the container on creation. If it was hidden or still
       being laid out, it reads zero and renders a grey box until told again. */
    setTimeout(function () { map.invalidateSize(); }, 200);

    return {
      map: map,
      getPoint: function () { return point; },
      setPoint: function (lat, lng, o) {
        o = o || {};
        place(lat, lng, o.quiet);
        if (o.pan !== false) map.setView([lat, lng], Math.max(map.getZoom(), 16));
      },
      clear: function () {
        if (marker) { map.removeLayer(marker); marker = null; }
        point = null;
        container.classList.remove('has-pin');
      },
      invalidate: function () { map.invalidateSize(); }
    };
  }

  /* ---------------------------------------------------------------
     Display map: many pins, none of them draggable. Used by the live map
     page, where the job is showing what has been reported rather than
     choosing a spot.
     --------------------------------------------------------------- */
  function createDisplay(container, opts) {
    opts = opts || {};
    if (!global.L) throw new Error('Leaflet has not loaded.');

    container.innerHTML = '';
    container.classList.add('kisa-map', 'kisa-map-display');

    var map = global.L.map(container, {
      center: opts.center || FALLBACK,
      zoom: opts.zoom || 13,
      scrollWheelZoom: false,
      attributionControl: true
    });
    global.L.tileLayer(TILES, { attribution: ATTRIB, maxZoom: 19 }).addTo(map);
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });

    var layer = global.L.layerGroup().addTo(map);
    var markers = [];

    function conditionIcon(condition, takenIn) {
      var cls = 'kisa-pin kisa-pin-' + (takenIn ? 'safe' : (condition || 'healthy'));
      return global.L.divIcon({
        className: cls,
        html: '<span class="kisa-pin-dot"></span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
    }

    function show(rows) {
      layer.clearLayers();
      markers = [];
      rows.forEach(function (row) {
        if (typeof row.lat !== 'number' || typeof row.lng !== 'number') return;
        var m = global.L.marker([row.lat, row.lng], {
          icon: conditionIcon(row.condition, row.taken_in_by),
          title: row.location_text || 'Reported sighting'
        });
        if (typeof opts.popup === 'function') {
          m.bindPopup(opts.popup(row), { closeButton: true, maxWidth: 260 });
        }
        m.addTo(layer);
        markers.push({ marker: m, row: row });
      });
      return markers.length;
    }

    function fit() {
      var pts = markers.map(function (x) { return x.marker.getLatLng(); });
      if (!pts.length) return;
      if (pts.length === 1) { map.setView(pts[0], 15); return; }
      map.fitBounds(global.L.latLngBounds(pts).pad(0.2));
    }

    setTimeout(function () { map.invalidateSize(); }, 200);

    return {
      map: map,
      show: show,
      fit: fit,
      focus: function (id) {
        var hit = markers.filter(function (x) { return x.row.id === id; })[0];
        if (!hit) return;
        map.setView(hit.marker.getLatLng(), 16);
        hit.marker.openPopup();
      },
      invalidate: function () { map.invalidateSize(); }
    };
  }

  global.KisaMap = {
    createPicker: createPicker,
    createDisplay: createDisplay,
    reverseGeocode: reverseGeocode,
    FALLBACK: FALLBACK
  };
})(window);
