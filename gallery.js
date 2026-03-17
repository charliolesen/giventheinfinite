/* ──────────────────────────────────────────────────────────────
   CONCEPT ART GALLERY

   Organize your art into categories. Each category appears in the
   sidebar TOC. Each piece has an image, title, and description.

   To add art:
   1. Drop images into images/concept-art/
   2. Add entries to the relevant category below
   ────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var GALLERY = [
    {
      category: 'Characters',
      pieces: [
        {
          src: 'images/concept/characters/depor_kaeleth.png',
          title: 'Kaeleth Philippa',
          subtitle: "The Earl of Bething's Rock | Anolethic",
          desc: "Following in his father's footsteps as a Crown servant, Kaeleth is a man of fortune and fame, if only in his small home town of Bething's Rock. He serves the King as an intelligence broker, discovering the secrets of the territories that the Crown might maintain order in a kingdom with a penchant for strife."
        },
        {
          src: 'images/concept/characters/depor_galrey.png',
          title: 'Gambol Galrey',
          subtitle: "The Glass Whisperer | Istuistan",
          desc: "An Istuistan cyber-spy equipped with the ultimate covert weapon - embedded beneath the skin of his right arm, and woven between the bones of his fingers, an eydt glass mass storage device capable of copying from the devices of others with a brief touch. His implant was arranged by a powerful kingpin of the Concorda underworld, who he will do anything to escape from."
        },
        {
          src: 'images/concept/characters/depor_mekhis.png',
          title: 'Shen Mekhis',
          subtitle: "Commander of the Ebbing | Yantai Menyantic",
          desc: "Founder of the Yantai Ebbing Militia, a group of former Menyantic prison slaves that seek to destabilise the Crown of Anoleth as retribution for their participation in the brutal mining trade that enslaved them. Wanted in Anoleth for a string of horrifying crimes, the price on her head is greater than that of any criminal living, but catching a phase-shifter is not a simple task."
        },
        {
          src: 'images/concept/characters/depor_pristenne.png',
          title: 'Pristenne Verity',
          subtitle: "Silver Star Journalist  | Anolethic",
          desc: "The voice of the city, Pristenne is the host of the Silver Star's evening show, spending each and every sunset casting her voice across the network that those who do not read the journal might catch up with the news. Recently, though, she has become disenchanted by the amount of control over print and speech that has been taken by the Crown..."
        },
        {
          src: 'images/concept/characters/depor_glory.png',
          title: 'Gloria Leigh',
          subtitle: "Northern Dawn Chapter Leader | Anolethic",
          desc: "As one of the two commanders of New Dawn's northern chapter, Glory operates rebel groups in Ballrith and Grieve, provinces bordering Menyantis. She fell into rebellion after her father was taken into custody and subsequently executed in Astrum under the orders of King Lucien Lor'End."
        },
          {
          src: 'images/concept/characters/depor_rigel.png',
          title: "Rigel Lor'End",
          subtitle: "Crown Judge Superior | Anolethic",
          desc: "The son of the late King Lucien Lor'End, Rigel was, without explanation, barred from succession by his father. At the age of eleven, he was to hear in the Crown Will that a poet named Ayen Saiyous had been chosen to ascend in his place, breaking a near two-hundred year line of royal blood. He serves now as Judge Superior to the capital's criminals."
        },
      ]
    },
    {
      category: 'Places',
      pieces: [
        // {
        //   src: 'images/concept-art/greyspire.jpg',
        //   title: 'Greyspire',
        //   desc: 'The seat of power, carved into granite cliffs...'
        // },
      ]
    },
    {
      category: 'Technologies',
      pieces: [
        // {
        //   src: 'images/concept-art/coiltech.jpg',
        //   title: 'Coil Mechanisms',
        //   desc: 'The devices that bind and channel dimensional energy...'
        // },
      ]
    },
    {
      category: 'Creatures',
      pieces: []
    },
    {
      category: 'Miscellaneous',
      pieces: []
    },
    {
      category: 'Originals',
      pieces: [
        {
          src: 'images/concept/originals/mekhis_original.png',
          title: 'Mekhis',
          subtitle: 'Original Pencil Sketch',
          desc: "Mekhis is one of the world's oldest characters, first put to paper in my final days of primary school as the fear of change began to set in. I can remember my mother being concerned when the days of drawing wizards and dragons had passed, and the age of tortured slaves took its place..."
        }
      ]
    }
  ];

  // ── DOM refs ──
  var tocList = document.getElementById('gallery-toc-list');
  var content = document.getElementById('gallery-content');
  var tocPanel = document.getElementById('gallery-toc');
  var tocToggle = document.getElementById('gallery-toc-toggle');

  // Lightbox refs
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var btnClose = lightbox.querySelector('.lightbox-close');
  var btnPrev = lightbox.querySelector('.lightbox-prev');
  var btnNext = lightbox.querySelector('.lightbox-next');

  var currentPieces = [];
  var currentIndex = 0;
  var activeLink = null;

  // ── Build TOC sidebar ──
  GALLERY.forEach(function (cat, catIndex) {
    var li = document.createElement('li');
    var link = document.createElement('a');
    link.href = '#';
    link.className = 'toc-link';
    link.textContent = cat.category;

    var count = document.createElement('span');
    count.style.cssText = 'color: var(--text-muted); font-size: 0.8em; margin-left: 0.4em;';
    count.textContent = cat.pieces.length > 0 ? '(' + cat.pieces.length + ')' : '';
    link.appendChild(count);

    link.addEventListener('click', function (e) {
      e.preventDefault();
      showCategory(catIndex);
      if (activeLink) activeLink.classList.remove('active');
      link.classList.add('active');
      activeLink = link;
    });

    li.appendChild(link);
    tocList.appendChild(li);
  });

  // Auto-open first category
  var firstLink = tocList.querySelector('.toc-link');
  if (firstLink) {
    firstLink.classList.add('active');
    activeLink = firstLink;
    showCategory(0);
  }

  // ── TOC toggle (mirrors reader page behavior) ──
  tocToggle.addEventListener('click', function () {
    tocPanel.classList.toggle('hidden');
  });

  // ── Show a category ──
  function showCategory(catIndex) {
    var cat = GALLERY[catIndex];
    content.innerHTML = '';
    content.scrollTop = 0;

    // Category header
    var header = document.createElement('div');
    header.className = 'chapter-header';
    header.innerHTML =
      '<span class="chapter-number">CONCEPT ART</span>' +
      '<span class="chapter-name">' + cat.category + '</span>' +
      '<hr class="chapter-divider">' +
      (cat.category !== 'Originals' ? '<p class="gallery-notice">The art shown here consists of AI-enhanced versions of original sketches, as well as newly created images, and recreations of long-lost pieces. See \u2018Originals\u2019 for presentable original sketches.</p>' : '');
    content.appendChild(header);

    if (cat.pieces.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'reader-placeholder';
      empty.textContent = 'No pieces in this category yet.';
      content.appendChild(empty);
      return;
    }

    // Gallery items
    var grid = document.createElement('div');
    grid.className = 'gallery-grid';

    cat.pieces.forEach(function (piece, i) {
      var card = document.createElement('article');
      card.className = 'gallery-card';
      card.setAttribute('tabindex', '0');
      var subtitleHtml = piece.subtitle ? '<p class="gallery-card-subtitle">' + piece.subtitle + '</p>' : '';
      var descHtml = piece.desc ? '<p>' + piece.desc + '</p>' : '';
      card.innerHTML =
        '<div class="gallery-img-wrap">' +
          '<img src="' + piece.src + '" alt="' + piece.title + '" loading="lazy">' +
        '</div>' +
        '<div class="gallery-card-text">' +
          '<h3>' + piece.title + '</h3>' +
          subtitleHtml +
          descHtml +
        '</div>';
      card.addEventListener('click', function () { openLightbox(cat.pieces, i); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') openLightbox(cat.pieces, i);
      });
      grid.appendChild(card);
    });

    content.appendChild(grid);
  }

  // ── Lightbox ──
  function openLightbox(pieces, index) {
    currentPieces = pieces;
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateLightbox() {
    var item = currentPieces[currentIndex];
    lbImg.src = item.src;
    lbImg.alt = item.title;
    btnPrev.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
    btnNext.style.visibility = currentIndex < currentPieces.length - 1 ? 'visible' : 'hidden';
  }

  function prevItem() {
    if (currentIndex > 0) { currentIndex--; updateLightbox(); }
  }

  function nextItem() {
    if (currentIndex < currentPieces.length - 1) { currentIndex++; updateLightbox(); }
  }

  btnClose.addEventListener('click', closeLightbox);
  btnPrev.addEventListener('click', prevItem);
  btnNext.addEventListener('click', nextItem);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevItem();
    if (e.key === 'ArrowRight') nextItem();
  });

})();
