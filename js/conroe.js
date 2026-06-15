
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