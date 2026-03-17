/* ──────────────────────────────────────────────────────────────
   EYDTEA WORLD MAP
   Interactive Leaflet map with CRS.Simple for fantasy cartography.

   TO CUSTOMIZE:
   1. Replace the placeholder regions in REGIONS with your real SVG
      path coordinates (see comments below).
   2. Add/edit markers in each region's `markers` array.
   3. Adjust MAP_BOUNDS to fit your actual map dimensions.
   ────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── Map dimensions & bounds ──
  // These define the coordinate space. Think of it as your canvas size.
  // [0,0] is bottom-left, [MAP_H, MAP_W] is top-right.
  const MAP_W = 1600;
  const MAP_H = 900;
  const MAP_BOUNDS = [[0, 0], [MAP_H, MAP_W]];

  // ── Zoom config ──
  const MIN_ZOOM = -1.5;
  const MAX_ZOOM = 4;
  const START_ZOOM = 0;
  const START_CENTER = [MAP_H / 2, MAP_W / 2];

  // Zoom thresholds for showing/hiding layers
  const ZOOM_SHOW_CITIES = 1;
  const ZOOM_SHOW_TOWNS = 2;
  const ZOOM_SHOW_LABELS_REGION = -0.5;
  const ZOOM_SHOW_LABELS_CITY = 1;
  const ZOOM_SHOW_LABELS_TOWN = 2.5;

  /* ── REGION DATA ──
     Each region is a polygon on the map. Coordinates are [lat, lng]
     in our simple CRS (i.e. [y, x] where y=0 is bottom).

     To convert your SVG paths:
     - If your SVG viewBox is "0 0 1600 900", the x coordinates map
       directly to lng, and y coordinates need to be flipped:
       lat = MAP_H - svg_y
     - So an SVG point at (400, 200) becomes [700, 400] here.

     You can also use the svgPathToCoords() helper at the bottom of
     this file if you want to paste raw SVG polygon points.
  */
  const REGIONS = [
    {
      id: 'voranthal',
      name: 'Voranthal',
      color: '#4a3a6a',
      lore: 'A kingdom of strength, its people forged in the fires of ancient conflict. The Voranthi are known for their unyielding will and the great stone citadels that dot their windswept highlands.',
      coords: [
        [680, 200], [720, 280], [750, 350], [740, 440],
        [700, 480], [650, 500], [600, 480], [560, 440],
        [530, 380], [520, 300], [540, 240], [580, 200],
        [620, 180], [660, 185]
      ],
      markers: [
        {
          name: 'Greyspire',
          type: 'capital',
          coords: [660, 350],
          lore: 'The seat of the Voranthi Crown, carved into the face of a granite cliff overlooking the Pale Valley.'
        },
        {
          name: 'Dunhallow',
          type: 'city',
          coords: [620, 290],
          lore: 'A trade city built around the oldest iron mines in the kingdom.'
        },
        {
          name: 'Ashwick',
          type: 'town',
          coords: [700, 420],
          lore: 'A quiet settlement near the eastern border, known for its potent spirits.'
        }
      ]
    },
    {
      id: 'thessmere',
      name: 'Thessmere',
      color: '#2a4a5a',
      lore: 'The kingdom of intelligence, where great libraries and academies shape the world\'s understanding of science, history, and the arcane.',
      coords: [
        [620, 550], [660, 580], [700, 650], [710, 740],
        [680, 800], [640, 830], [580, 820], [530, 780],
        [500, 720], [490, 650], [510, 590], [550, 560],
        [590, 545]
      ],
      markers: [
        {
          name: 'Veridian',
          type: 'capital',
          coords: [610, 700],
          lore: 'City of the Thousand Lenses. Its great observatory peers not only at the stars, but into the fabric of reality itself.'
        },
        {
          name: 'Thornmark',
          type: 'city',
          coords: [560, 630],
          lore: 'A university city where scholars from across the world come to study.'
        },
        {
          name: 'Quillhaven',
          type: 'town',
          coords: [650, 770],
          lore: 'A coastal town famous for its papermakers and printing houses.'
        }
      ]
    },
    {
      id: 'kaldris',
      name: 'Kaldris',
      color: '#3a5a3a',
      lore: 'The kingdom of youth, whose people age far slower than the rest. Their verdant forests seem to exist outside of time, and so do they.',
      coords: [
        [400, 300], [440, 350], [460, 420], [450, 500],
        [420, 560], [380, 580], [330, 570], [290, 530],
        [270, 470], [260, 400], [280, 340], [320, 300],
        [360, 290]
      ],
      markers: [
        {
          name: 'Evergrove',
          type: 'capital',
          coords: [380, 430],
          lore: 'Hidden within an ancient forest, its towers are grown rather than built — shaped from living wood over centuries.'
        },
        {
          name: 'Stillwater',
          type: 'city',
          coords: [340, 380],
          lore: 'Built around a lake so clear and still it is said to reflect the past rather than the present.'
        }
      ]
    },
    {
      id: 'nethervane',
      name: 'Nethervane',
      color: '#5a3a4a',
      lore: 'The kingdom of dimensional shift, where the boundary between planes wears thin. Its people walk between worlds, and their cities shimmer at the edges of perception.',
      coords: [
        [350, 800], [400, 840], [440, 900], [460, 980],
        [450, 1060], [420, 1120], [370, 1140], [320, 1120],
        [280, 1060], [260, 980], [270, 900], [300, 840]
      ],
      markers: [
        {
          name: 'Veilcross',
          type: 'capital',
          coords: [380, 980],
          lore: 'The city exists in two places at once. Its western half sits in this world; its eastern half flickers in and out of another.'
        },
        {
          name: 'Driftmoor',
          type: 'city',
          coords: [330, 920],
          lore: 'A fortress town built on ground that occasionally phases out of reality entirely.'
        },
        {
          name: 'Shimmerfen',
          type: 'town',
          coords: [420, 1050],
          lore: 'A marsh village where the locals navigate by the distortions in the air rather than by landmarks.'
        }
      ]
    },
    {
      id: 'aeondrift',
      name: 'The Aeondrift',
      color: '#3a3a3a',
      lore: 'The desolate expanse between the four kingdoms. Once fertile land, now scarred by the genetic wars of the Old Kings. Few cross it willingly.',
      coords: [
        [480, 480], [510, 540], [520, 580], [500, 640],
        [470, 660], [440, 640], [420, 600], [430, 540],
        [450, 500]
      ],
      markers: [
        {
          name: 'The Hollow',
          type: 'landmark',
          coords: [470, 580],
          lore: 'A vast crater from the last war of the Old Kings. Nothing grows here. The ground hums.'
        }
      ]
    }
  ];

  // ── Initialize map ──
  const map = L.map('world-map', {
    crs: L.CRS.Simple,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    maxBounds: [[-100, -100], [MAP_H + 100, MAP_W + 100]],
    maxBoundsViscosity: 0.8,
    attributionControl: false,
    zoomControl: false
  });

  map.setView(START_CENTER, START_ZOOM);

  // Add zoom control to top-right
  L.control.zoom({ position: 'topright' }).addTo(map);

  // ── Layer groups for zoom-dependent visibility ──
  const regionLayer = L.layerGroup().addTo(map);
  const regionLabelLayer = L.layerGroup().addTo(map);
  const capitalLayer = L.layerGroup().addTo(map);
  const cityLayer = L.layerGroup();
  const townLayer = L.layerGroup();
  const capitalLabelLayer = L.layerGroup().addTo(map);
  const cityLabelLayer = L.layerGroup();
  const townLabelLayer = L.layerGroup();
  const landmarkLayer = L.layerGroup().addTo(map);
  const landmarkLabelLayer = L.layerGroup().addTo(map);

  // ── Info panel ──
  const infoPanel = document.getElementById('info-panel');
  const infoTitle = infoPanel.querySelector('.info-title');
  const infoType = infoPanel.querySelector('.info-type');
  const infoLore = infoPanel.querySelector('.info-lore');
  const infoClose = infoPanel.querySelector('.info-close');

  function openInfo(name, type, lore) {
    infoTitle.textContent = name;
    infoType.textContent = type;
    infoLore.innerHTML = lore.split('\n').map(function (p) { return '<p>' + p + '</p>'; }).join('');
    infoPanel.classList.add('open');
  }

  function closeInfo() {
    infoPanel.classList.remove('open');
  }

  infoClose.addEventListener('click', closeInfo);

  // Close panel on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeInfo();
  });

  // ── Create marker icon ──
  function createMarkerIcon(type) {
    var cls = 'map-marker map-marker-' + type;
    var size = type === 'capital' ? [16, 16] :
               type === 'city' ? [12, 12] :
               type === 'town' ? [8, 8] : [10, 10];
    return L.divIcon({
      className: cls,
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1] / 2]
    });
  }

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

  // ── Build regions and markers ──
  REGIONS.forEach(function (region) {
    // Region polygon
    var polygon = L.polygon(region.coords, {
      color: region.color,
      weight: 1.5,
      opacity: 0.7,
      fillColor: region.color,
      fillOpacity: 0.15,
      className: 'region-polygon'
    });

    polygon.on('mouseover', function () {
      this.setStyle({ fillOpacity: 0.3, weight: 2, opacity: 1 });
    });
    polygon.on('mouseout', function () {
      this.setStyle({ fillOpacity: 0.15, weight: 1.5, opacity: 0.7 });
    });
    polygon.on('click', function () {
      openInfo(region.name, 'Kingdom', region.lore);
    });

    regionLayer.addLayer(polygon);

    // Region label (centered on polygon)
    var center = polygon.getBounds().getCenter();
    var label = createLabel(region.name, center, 'map-label-region');
    regionLabelLayer.addLayer(label);

    // Markers
    if (region.markers) {
      region.markers.forEach(function (m) {
        var marker = L.marker(m.coords, {
          icon: createMarkerIcon(m.type),
          riseOnHover: true
        });

        // Popup on hover
        var popupContent =
          '<h3>' + m.name + '</h3>' +
          '<div class="popup-type">' + m.type + '</div>' +
          '<div class="popup-lore">' + m.lore + '</div>';
        marker.bindPopup(popupContent, {
          maxWidth: 260,
          offset: [0, -4]
        });

        // Click opens info panel
        marker.on('click', function () {
          openInfo(m.name, m.type + ' — ' + region.name, m.lore);
        });

        // Add to appropriate layer
        var labelClass = 'map-label-' + m.type;
        var markerLabel = createLabel(m.name, m.coords, labelClass);

        switch (m.type) {
          case 'capital':
            capitalLayer.addLayer(marker);
            capitalLabelLayer.addLayer(markerLabel);
            break;
          case 'city':
            cityLayer.addLayer(marker);
            cityLabelLayer.addLayer(markerLabel);
            break;
          case 'town':
            townLayer.addLayer(marker);
            townLabelLayer.addLayer(markerLabel);
            break;
          case 'landmark':
            landmarkLayer.addLayer(marker);
            landmarkLabelLayer.addLayer(markerLabel);
            break;
        }
      });
    }
  });

  // ── Zoom-dependent layer visibility ──
  function updateLayerVisibility() {
    var zoom = map.getZoom();

    // Region labels
    if (zoom >= ZOOM_SHOW_LABELS_REGION) {
      if (!map.hasLayer(regionLabelLayer)) map.addLayer(regionLabelLayer);
    } else {
      if (map.hasLayer(regionLabelLayer)) map.removeLayer(regionLabelLayer);
    }

    // Capitals (always visible, but labels zoom-dependent)
    if (zoom >= ZOOM_SHOW_LABELS_CITY) {
      if (!map.hasLayer(capitalLabelLayer)) map.addLayer(capitalLabelLayer);
    } else {
      if (map.hasLayer(capitalLabelLayer)) map.removeLayer(capitalLabelLayer);
    }

    // Cities
    if (zoom >= ZOOM_SHOW_CITIES) {
      if (!map.hasLayer(cityLayer)) map.addLayer(cityLayer);
      if (zoom >= ZOOM_SHOW_LABELS_CITY) {
        if (!map.hasLayer(cityLabelLayer)) map.addLayer(cityLabelLayer);
      } else {
        if (map.hasLayer(cityLabelLayer)) map.removeLayer(cityLabelLayer);
      }
    } else {
      if (map.hasLayer(cityLayer)) map.removeLayer(cityLayer);
      if (map.hasLayer(cityLabelLayer)) map.removeLayer(cityLabelLayer);
    }

    // Towns
    if (zoom >= ZOOM_SHOW_TOWNS) {
      if (!map.hasLayer(townLayer)) map.addLayer(townLayer);
      if (zoom >= ZOOM_SHOW_LABELS_TOWN) {
        if (!map.hasLayer(townLabelLayer)) map.addLayer(townLabelLayer);
      } else {
        if (map.hasLayer(townLabelLayer)) map.removeLayer(townLabelLayer);
      }
    } else {
      if (map.hasLayer(townLayer)) map.removeLayer(townLayer);
      if (map.hasLayer(townLabelLayer)) map.removeLayer(townLabelLayer);
    }
  }

  map.on('zoomend', updateLayerVisibility);
  updateLayerVisibility();

  /* ── GRID OVERLAY (dev helper — remove for production) ──
     Uncomment to see coordinate grid while placing your regions.

  for (var y = 0; y <= MAP_H; y += 100) {
    L.polyline([[y, 0], [y, MAP_W]], {
      color: '#333', weight: 0.5, dashArray: '4 4'
    }).addTo(map);
    L.marker([y, 10], {
      icon: L.divIcon({
        className: 'map-label map-label-town',
        html: String(y),
        iconSize: null
      }),
      interactive: false
    }).addTo(map);
  }
  for (var x = 0; x <= MAP_W; x += 100) {
    L.polyline([[0, x], [MAP_H, x]], {
      color: '#333', weight: 0.5, dashArray: '4 4'
    }).addTo(map);
    L.marker([10, x], {
      icon: L.divIcon({
        className: 'map-label map-label-town',
        html: String(x),
        iconSize: null
      }),
      interactive: false
    }).addTo(map);
  }
  */

  /* ── SVG PATH HELPER ──
     If you have SVG polygon points as a string like "400,200 450,250 ..."
     this converts them to Leaflet coords (flipping Y axis).

     Usage:
       var coords = svgPointsToCoords("400,200 450,250 500,300");
       // Returns [[700, 400], [650, 450], [600, 500]]
  */
  window.svgPointsToCoords = function (pointsStr) {
    return pointsStr.trim().split(/\s+/).map(function (pair) {
      var parts = pair.split(',');
      var x = parseFloat(parts[0]);
      var y = parseFloat(parts[1]);
      return [MAP_H - y, x]; // flip Y for Leaflet's CRS.Simple
    });
  };

})();
