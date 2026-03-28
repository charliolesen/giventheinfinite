/* ──────────────────────────────────────────────────────────────
   EYDTEA WORLD MAP
   Interactive Leaflet map with CRS.Simple for fantasy cartography.
   Uses a JPEG image overlay of the textured world map.
   ────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── Map image dimensions (matches the source image) ──
  const MAP_W = 14091;
  const MAP_H = 10271;
  const MAP_BOUNDS = [[0, 0], [MAP_H, MAP_W]];

  // ── Zoom config ──
  // minZoom -4 lets user see the whole map; maxZoom 4 gives deep detail
  const MIN_ZOOM = -5;
  const MAX_ZOOM = -0.4;
  const START_ZOOM = MIN_ZOOM;
  const START_CENTER = [MAP_H / 2, MAP_W / 2];

  // Zoom thresholds for showing/hiding layers
  const ZOOM_SHOW_REGIONS = -5;
  const ZOOM_SHOW_CAPITALS = -5;
  const ZOOM_SHOW_CITIES = -5;
  const ZOOM_SHOW_LANDMARKS = -5;
  const ZOOM_SHOW_TOWNS = -5;

  /* ── REGION & MARKER DATA ──
     Add your own regions and markers here.
     Coordinates are [lat, lng] in CRS.Simple (i.e. [y, x] where y=0 is bottom).
     To convert from SVG viewBox "0 0 14091 10271":
       lat = MAP_H - svg_y
       lng = svg_x

     Example entry:
     {
       id: 'menyantis',
       name: 'Menyantis',
       color: '#4a3a6a',
       lore: 'Description text here.',
       coords: [[y1, x1], [y2, x2], ...],  // polygon boundary
       markers: [
         { name: 'CityName', type: 'capital', coords: [y, x], lore: '...' },
         { name: 'TownName', type: 'city',    coords: [y, x], lore: '...' },
         { name: 'Village',  type: 'town',    coords: [y, x], lore: '...' },
         { name: 'Ruins',    type: 'landmark', coords: [y, x], lore: '...' }
       ]
     }
  */
  const REGIONS = [];

  // ── Loading screen ──
  var loader = document.getElementById('map-loader');

  function hideLoader() {
    loader.classList.add('loaded');
    setTimeout(function () { loader.style.display = 'none'; }, 600);
  }

  // ── Initialize map (hidden until image loads) ──
  var mapEl = document.getElementById('world-map');
  mapEl.style.opacity = '0';

  var map = L.map('world-map', {
    crs: L.CRS.Simple,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    maxBounds: [[-500, -500], [MAP_H + 500, MAP_W + 500]],
    maxBoundsViscosity: 0.8,
    attributionControl: false,
    zoomControl: false,
    markerZoomAnimation: false
  });

  map.fitBounds(MAP_BOUNDS, { padding: [0, 0] });

  // Add zoom control to top-right
  L.control.zoom({ position: 'topright' }).addTo(map);

  // ── Load map image as base overlay ──
  var textureOverlay = L.imageOverlay('map/definitive/transline_map.jpg', MAP_BOUNDS).addTo(map);

  textureOverlay.getElement().addEventListener('load', function () {
    mapEl.style.transition = 'opacity 0.6s ease';
    mapEl.style.opacity = '1';
    hideLoader();
    setTimeout(function () { map.invalidateSize(); }, 100);
  });

  // Fallback: show map after 15s regardless
  setTimeout(function () {
    if (loader.style.display !== 'none') {
      mapEl.style.opacity = '1';
      hideLoader();
    }
  }, 15000);

  // ── All places stored for search ──
  var allPlaces = [];

  // ── Layer groups ──
  var kingdomLayer = L.layerGroup().addTo(map);
  var regionLayer = L.layerGroup().addTo(map);
  var capitalLayer = L.layerGroup().addTo(map);
  var cityLayer = L.layerGroup().addTo(map);
  var townLayer = L.layerGroup().addTo(map);
  var landmarkLayer = L.layerGroup().addTo(map);
  var seaLayer = L.layerGroup().addTo(map);
  var mountainLayer = L.layerGroup().addTo(map);
  var riverLayer = L.layerGroup().addTo(map);
  var abandonedLayer = L.layerGroup().addTo(map);
  var bridgeLayer = L.layerGroup().addTo(map);
  var lakeLayer = L.layerGroup().addTo(map);

  // ── Info panel ──
  var infoPanel = document.getElementById('info-panel');
  var infoTitle = infoPanel.querySelector('.info-title');
  var infoType = infoPanel.querySelector('.info-type');
  var infoLore = infoPanel.querySelector('.info-lore');
  var infoClose = infoPanel.querySelector('.info-close');

  // ── Map key toggle ──
  var keyToggle = document.getElementById('key-toggle');
  var mapKey = document.getElementById('map-key');

  keyToggle.addEventListener('click', function () {
    mapKey.classList.toggle('open');
  });

  // Layer toggle checkboxes
  var layerMap = {
    kingdom: kingdomLayer,
    capital: capitalLayer,
    region: regionLayer,
    city: cityLayer,
    town: townLayer,
    landmark: landmarkLayer,
    mountain: mountainLayer,
    sea: seaLayer,
    river: riverLayer,
    abandoned: abandonedLayer,
    bridge: bridgeLayer,
    lake: lakeLayer
  };
  var layerEnabled = {};
  Object.keys(layerMap).forEach(function (k) { layerEnabled[k] = true; });

  mapKey.addEventListener('change', function (e) {
    var cb = e.target;
    if (!cb.dataset.layer) return;
    layerEnabled[cb.dataset.layer] = cb.checked;
    updateLayerVisibility();
  });

  document.getElementById('key-deselect').addEventListener('click', function () {
    var allOn = Object.keys(layerEnabled).every(function (k) { return layerEnabled[k]; });
    var checkboxes = mapKey.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function (cb) {
      cb.checked = !allOn;
      if (cb.dataset.layer) layerEnabled[cb.dataset.layer] = !allOn;
    });
    this.textContent = allOn ? 'Select All' : 'Deselect All';
    updateLayerVisibility();
  });

  function openInfo(name, type, lore) {
    infoTitle.textContent = name;
    infoType.innerHTML = type;
    infoLore.innerHTML = lore.split('\n').map(function (p) { return '<p>' + p + '</p>'; }).join('');
    infoPanel.classList.add('open');
  }

  function closeInfo() {
    infoPanel.classList.remove('open');
  }

  infoClose.addEventListener('click', closeInfo);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeInfo();
  });


  // ── Create label ──
  function createLabel(text, coords, cssClass) {
    return L.marker(coords, {
      icon: L.divIcon({
        className: 'map-label ' + cssClass,
        html: text,
        iconSize: null,
        iconAnchor: [-12, 0]
      }),
      interactive: false
    });
  }

  // ── Build markers from places.json ──
  function addPlace(place) {
    var type = place.type || 'town';

    // Create clickable label with constrained width for natural wrapping
    var anchor = place.anchor || 'right';
    var labelCss = 'map-label map-label-' + type + ' map-label-anchor-' + anchor;
    var angleStyle = place.angle ? ' style="--label-angle:' + place.angle + 'deg"' : '';
    var displayName = place.wrap ? place.wrap.join('<br>') : place.name.split(' ').join('<br>');
    var labelHtml = '<span class="label-inner"' + angleStyle + '><span class="label-text">' + displayName + '</span></span>';
    var label = L.marker(place.leaflet, {
      icon: L.divIcon({
        className: labelCss,
        html: labelHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      }),
      interactive: true,
      zIndexOffset: -100
    });

    var subtitle = place.kingdom ? '<span class="info-kingdom">' + place.kingdom + '</span>' : '';
    if (place.status) subtitle += (subtitle ? '<br>' : '') + '<span class="info-status">' + place.status + '</span>';

    label.on('click', function () {
      openInfo(place.name, subtitle, place.lore || '');
    });

    switch (type) {
      case 'kingdom':  kingdomLayer.addLayer(label);   break;
      case 'capital':  capitalLayer.addLayer(label);   break;
      case 'region':   regionLayer.addLayer(label);    break;
      case 'city':     cityLayer.addLayer(label);      break;
      case 'sea':      seaLayer.addLayer(label);       break;
      case 'mountain': mountainLayer.addLayer(label);  break;
      case 'river':    riverLayer.addLayer(label);     break;
      case 'abandoned':abandonedLayer.addLayer(label); break;
      case 'landmark': landmarkLayer.addLayer(label);  break;
      case 'bridge':   bridgeLayer.addLayer(label);    break;
      case 'lake':     lakeLayer.addLayer(label);      break;
      case 'town': default: townLayer.addLayer(label); break;
    }
  }

  fetch('map/places.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var places = Array.isArray(data) ? data : [];
      if (!Array.isArray(data)) {
        ['kingdoms', 'regions', 'seas', 'places'].forEach(function (cat) {
          if (data[cat]) places = places.concat(data[cat]);
        });
      }
      places.forEach(function (p) {
        addPlace(p);
        allPlaces.push(p);
      });
      updateLayerVisibility();
      buildSearchList();
    })
    .catch(function (err) {
      console.warn('Could not load places:', err);
    });

  // ── Zoom-dependent layer visibility ──
  function showLayer(layer, visible) {
    if (visible) { if (!map.hasLayer(layer)) map.addLayer(layer); }
    else { if (map.hasLayer(layer)) map.removeLayer(layer); }
  }

  function updateLayerVisibility() {
    var zoom = map.getZoom();

    // Show layer only if enabled by checkbox AND zoom threshold met
    showLayer(kingdomLayer,  layerEnabled.kingdom);
    showLayer(seaLayer,      layerEnabled.sea);
    showLayer(riverLayer,    layerEnabled.river);
    showLayer(regionLayer,   layerEnabled.region   && zoom >= ZOOM_SHOW_REGIONS);
    showLayer(capitalLayer,  layerEnabled.capital   && zoom >= ZOOM_SHOW_CAPITALS);
    showLayer(cityLayer,     layerEnabled.city      && zoom >= ZOOM_SHOW_CITIES);
    showLayer(landmarkLayer, layerEnabled.landmark  && zoom >= ZOOM_SHOW_LANDMARKS);
    showLayer(mountainLayer, layerEnabled.mountain  && zoom >= ZOOM_SHOW_LANDMARKS);
    showLayer(bridgeLayer,   layerEnabled.bridge    && zoom >= ZOOM_SHOW_LANDMARKS);
    showLayer(townLayer,     layerEnabled.town      && zoom >= ZOOM_SHOW_TOWNS);
    showLayer(abandonedLayer,layerEnabled.abandoned  && zoom >= ZOOM_SHOW_TOWNS);
    showLayer(lakeLayer,     layerEnabled.lake       && zoom >= ZOOM_SHOW_LANDMARKS);
  }

  // ── Scale labels with zoom ──
  // Labels scale exactly with the map so they behave as if painted on.
  // In CRS.Simple each zoom level doubles the scale → 2^(zoom - refZoom).
  var REF_ZOOM = -5;           // zoom level where base font sizes look right
  var BASE_LABEL_SCALE = 0.15; // scale factor at REF_ZOOM

  function updateLabelScale() {
    var zoom = map.getZoom();
    var scale = BASE_LABEL_SCALE * Math.pow(2, zoom - REF_ZOOM);
    var markerScale = scale * 0.25;
    mapEl.style.setProperty('--label-scale', scale);
    mapEl.style.setProperty('--marker-scale', markerScale);
  }

  map.on('zoomend', function () {
    updateLayerVisibility();
    updateLabelScale();
  });
  updateLayerVisibility();
  updateLabelScale();

  // ── Coordinate picker (temporary dev tool) ──
  var coordPickerOn = false;
  var coordBtn = document.getElementById('coord-toggle');
  var coordToast = document.getElementById('coord-toast');

  coordBtn.addEventListener('click', function () {
    coordPickerOn = !coordPickerOn;
    coordBtn.classList.toggle('active', coordPickerOn);
    mapEl.style.cursor = coordPickerOn ? 'crosshair' : '';
  });

  map.on('click', function (e) {
    if (!coordPickerOn) return;
    var lat = Math.round(e.latlng.lat);
    var lng = Math.round(e.latlng.lng);
    var text = '[' + lat + ', ' + lng + ']';
    navigator.clipboard.writeText(text);
    coordToast.textContent = text + ' copied';
    coordToast.classList.add('show');
    setTimeout(function () { coordToast.classList.remove('show'); }, 1500);
  });

  // ── Search panel ──
  var searchToggle = document.getElementById('search-toggle');
  var searchPanel = document.getElementById('search-panel');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');

  searchToggle.addEventListener('click', function () {
    searchPanel.classList.toggle('open');
    if (searchPanel.classList.contains('open')) searchInput.focus();
  });

  var typeOrder = ['capital', 'city', 'town', 'landmark', 'mountain', 'lake', 'river', 'bridge', 'abandoned', 'sea', 'region'];

  function buildSearchList(filter) {
    var query = (filter || '').toLowerCase();
    // Filter to searchable types (exclude kingdom, region, sea)
    var filtered = allPlaces.filter(function (p) {
      if (typeOrder.indexOf(p.type) === -1) return false;
      if (query && p.name.toLowerCase().indexOf(query) === -1) return false;
      return true;
    });

    // Group by kingdom
    var grouped = {};
    filtered.forEach(function (p) {
      var k = p.kingdom || 'Other';
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(p);
    });

    // Sort kingdoms alphabetically, sort places within each
    var kingdoms = Object.keys(grouped).sort();
    var html = '';
    kingdoms.forEach(function (k) {
      var places = grouped[k].sort(function (a, b) {
        var ta = typeOrder.indexOf(a.type);
        var tb = typeOrder.indexOf(b.type);
        if (ta !== tb) return ta - tb;
        return a.name.localeCompare(b.name);
      });
      html += '<div class="search-kingdom-group">';
      html += '<div class="search-kingdom-name">' + k + '</div>';
      places.forEach(function (p, i) {
        html += '<button class="search-item" data-index="' + allPlaces.indexOf(p) + '">';
        html += p.name + '<span class="search-item-type">' + p.type + '</span>';
        html += '</button>';
      });
      html += '</div>';
    });
    searchResults.innerHTML = html;
  }

  searchInput.addEventListener('input', function () {
    buildSearchList(searchInput.value);
  });

  searchResults.addEventListener('click', function (e) {
    var btn = e.target.closest('.search-item');
    if (!btn) return;
    var idx = parseInt(btn.dataset.index);
    var place = allPlaces[idx];
    if (!place) return;

    map.setView(place.leaflet, MAX_ZOOM);

    var subtitle = place.kingdom ? '<span class="info-kingdom">' + place.kingdom + '</span>' : '';
    if (place.status) subtitle += (subtitle ? '<br>' : '') + '<span class="info-status">' + place.status + '</span>';
    openInfo(place.name, subtitle, place.lore || '');
  });

  /* ── SVG PATH HELPER ──
     Convert SVG polygon points "x,y x,y ..." to Leaflet coords.
     Usage: var coords = svgPointsToCoords("400,200 450,250");
  */
  window.svgPointsToCoords = function (pointsStr) {
    return pointsStr.trim().split(/\s+/).map(function (pair) {
      var parts = pair.split(',');
      var x = parseFloat(parts[0]);
      var y = parseFloat(parts[1]);
      return [MAP_H - y, x];
    });
  };

})();
