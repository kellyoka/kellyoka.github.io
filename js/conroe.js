
const base = "images/";
const types = [
    ['deer', 'Deer &amp; Elk'],
    ['antelope', 'Antelope &amp; African Game'],
    ['sheep', 'Sheep'],
    ['goats', 'Goats'],
    ['hogs', 'Hogs, Exotics &amp; Other']
];

const deer = [
  ["Axis Deer", "axis-deer.jpg"],
  ["Barasingha", "barasingha-deer.jpg"],
  ["Eld's Deer", "elds-deer.jpg"],
  ["Elk", "elk.jpg"],
  ["Fallow Deer", "fallow-deer.jpg"],
  ["Hog Deer", "hog-deer.jpg"],
  ["Manchurian Sika", "manchurian-sika-deer.jpg"],
  ["Muntjac Deer", "muntjac.jpg"],
  ["Pere David's Deer", "pere-david.jpg"],
  ["Red Stag", "red-stag.jpg"],
  ["Sika Deer", "sika-deer.jpg"],
  ["White Elk", "white-elk.jpg"],
  ["White Stag", "white-stag.jpg"],
  ["Whitetail Deer", "whitetail-deer.jpg"]
];



const antelope = [
  ["Addax", "addax.jpg"],
  ["Arabian Oryx", "arabian-oryx.jpg"],
  ["Blackbuck", "blackbuck.jpg"],
  ["Black Wildebeest", "black-wildebeest.jpg"],
  ["Blesbok", "blesbok.jpg"],
  ["Blue Wildebeest", "wildebeest.jpg"],
  ["Bongo", "bongo.jpg"],
  ["Dama Gazelle", "dama-gazelle.jpg"],
  ["Eland", "eland.jpg"],
  ["Gemsbok", "gemsbok.jpg"],
  ["Grant's Gazelle", "grants-gazelle.jpg"],
  ["Impala", "impala.jpg"],
  ["Kudu", "kudu.jpg"],
  ["Nile Lechwe", "nile-lechwe.jpg"],
  ["Nilgai", "nilgai.jpg"],
  ["Nyala", "nyala.jpg"],
  ["Red Lechwe", "red-lechwe.jpg"],
  ["Roan", "roan.jpg"],
  ["Sable", "sable.jpg"],
  ["Scimitar Horned Oryx", "scimitar-horned-oryx.jpg"],
  ["Sitatunga", "sitatunga.jpg"],
  ["Springbok", "springbok.jpg"],
  ["Thomson's Gazelle", "thomsons-gazelle.jpg"],
  ["Waterbuck", "waterbuck.jpg"]
];

const sheep = [
  ["Aoudad", "aoudad-sheep.jpg"],
  ["Black Hawaiian Sheep", "black-hawaiian.jpg"],
  ["Blue Sheep", "blue-sheep.jpg"],
  ["Corsican Sheep", "corsican-sheep.jpg"],
  ["Four Horned Jacob Sheep", "four-horned-jacob-sheep.jpg"],
  ["Himalayan Tahr", "himalayan-tahr.jpg"],
  ["Mouflon Sheep", "mouflon-sheep.jpg"],
  ["Painted Desert Sheep", "painted-desert-sheep.jpg"],
  ["Red Sheep", "red-sheep.jpg"],
  ["Texas Dall Sheep", "texas-dall.jpg"],
  ["Transcaspian Urial", "transcaspian-urial.jpg"]
];

const goats = [
  ["Catalina Goat", "catalina-goat.jpg"],
  ["Ibex", "ibex.jpg"],
  ["Markhor", "markhor.jpg"]
];

const hogs = [
  ["Hog", "hog.jpg"],
  ["Javelina", "javelina.jpg"],
  ["Kangaroo", "kangaroo.jpg"],
  ["Zebra", "zebra.jpg"]
];


const lookup = { deer, antelope, sheep, goats, hogs };

function makeGrids() {
    types.forEach(([type, label]) => {
        const str = '<div class="section-title">' + label + '</div>'
            + '<div class="grid" id="' + type + '"></div>';
        $('#content').append(str);
        renderGrid(type, lookup[type]);

        document.getElementById(type).addEventListener('click', (e) => {
            const card = e.target.closest('.animal-card');
            if (card) {
                const animalName = card.querySelector('.label').textContent;
                const img = card.querySelector('img').getAttribute('src').replace(base, '');
                window.location.href = `animal.html?animal=${encodeURIComponent(animalName)}&img=${encodeURIComponent(img)}`;
            }
        });
    });
}

function renderGrid(id, animals) {
    document.getElementById(id).innerHTML = animals.map(([name, img]) => `
      <div class="animal-card">
        <img src="${base}${img}" alt="${name}" loading="lazy" />
        <div class="label">${name}</div>
      </div>`).join('');
}


// ── Display Options ──────────────────────────────────────────
// Values: 0 = don't show, 1 = show, 2 = show as recommended
//
// Index:  0              1              2            3         4       5        6
//         SHOW_LIFE_SIZE SHOW_PEDESTAL  SHOW_SKULLS  SHOW_WALL SHOW_SH SHOW_FL  SHOW_PLAQUE
//
// Index:  7               8                 9         10           11           12
//         SHOW_SKULL_HOOK SHOW_WIRE_HANGER  SHOW_SKIN SHOW_REC_RUG SHOW_PILLOW  SHOW_TAIL

const PROPS = {
    SHOW_LIFE_SIZE:    0,
    SHOW_PEDESTAL:     1,
    SHOW_SKULLS:       2,
    SHOW_WALL:         3,
    SHOW_SHOULDER:     4,
    SHOW_FLOOR:        5,
    SHOW_PLAQUE:       6,
    SHOW_SKULL_HOOK:   7,
    SHOW_WIRE_HANGER:  8,
    SHOW_SKIN:         9,
    SHOW_REC_RUG:      10,
    SHOW_PILLOW:       11,
    SHOW_TAIL:         12,
};

// [life, ped, skull, wall, shldr, floor, plack, sklHk, wire, skin, rug, pill, tail]
const animalOptions = {

    // ── DEER & ELK ──────────────────────────────────────────
    //                              life  ped  skul  wall  shldr floor plack sklHk wire  skin  rug   pill  tail
    "Axis Deer":                   [ 1,   1,   1,    2,    1,    1,    1,    1,    1,    1,    1,    1,    1  ],
    "Barasingha":                  [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Eld's Deer":                  [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Elk":                         [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Fallow Deer":                 [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Hog Deer":                    [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Manchurian Sika":             [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Muntjac Deer":                [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Pere David's Deer":           [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Red Stag":                    [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Sika Deer":                   [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "White Elk":                   [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "White Stag":                  [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Whitetail Deer":              [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],

    // ── ANTELOPE & AFRICAN GAME ──────────────────────────────
    //                              life  ped  skul  wall  shldr floor plack sklHk wire  skin  rug   pill  tail
    "Addax":                       [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Arabian Oryx":                [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Blackbuck":                   [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Black Wildebeest":            [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Blesbok":                     [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Blue Wildebeest":             [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Bongo":                       [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Dama Gazelle":                [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Eland":                       [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Gemsbok":                     [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Grant's Gazelle":             [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Impala":                      [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Kudu":                        [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Nile Lechwe":                 [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Nilgai":                      [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Nyala":                       [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Red Lechwe":                  [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Roan":                        [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Sable":                       [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Scimitar Horned Oryx":        [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Sitatunga":                   [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Springbok":                   [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Thomson's Gazelle":           [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Waterbuck":                   [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],

    // ── SHEEP ────────────────────────────────────────────────
    //                              life  ped  skul  wall  shldr floor plack sklHk wire  skin  rug   pill  tail
    "Aoudad":                      [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Black Hawaiian Sheep":        [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Blue Sheep":                  [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Corsican Sheep":              [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Four Horned Jacob Sheep":     [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Himalayan Tahr":              [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Mouflon Sheep":               [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Painted Desert Sheep":        [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Red Sheep":                   [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Texas Dall Sheep":            [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Transcaspian Urial":          [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],

    // ── GOATS ────────────────────────────────────────────────
    //                              life  ped  skul  wall  shldr floor plack sklHk wire  skin  rug   pill  tail
    "Catalina Goat":               [ 1,   1,   1,    2,    1,    0,    1,    1,    1,    1,    0,    0,    1  ],
    "Ibex":                        [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],
    "Markhor":                     [ 1,   2,   1,    1,    2,    0,    1,    1,    0,    1,    0,    0,    1  ],

    // ── HOGS, EXOTICS & OTHER ────────────────────────────────
    //                              life  ped  skul  wall  shldr floor plack sklHk wire  skin  rug   pill  tail
    "Hog":                         [ 1,   1,   1,    1,    1,    2,    1,    0,    0,    1,    2,    1,    1  ],
    "Javelina":                    [ 1,   1,   1,    1,    1,    2,    1,    0,    0,    1,    2,    1,    1  ],
    "Kangaroo":                    [ 0,   0,   1,    0,    0,    2,    0,    0,    0,    2,    1,    1,    1  ],
    "Zebra":                       [ 0,   0,   1,    0,    0,    2,    0,    0,    0,    2,    2,    1,    1  ],
};

// ── Helpers ──────────────────────────────────────────────────

function getOptions(animalName) {
    return animalOptions[animalName] || null;
}

function getOptionProfile(animalName) {
    const row = getOptions(animalName);
    if (!row) return null;
    return Object.fromEntries(
        Object.entries(PROPS).map(([key, i]) => [key, row[i]])
    );
}