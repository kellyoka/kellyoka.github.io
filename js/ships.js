/**
 * Ship classes module
 * --------------------
 * Loads data/ships.json - one entry per hull type (CA, D7, etc.), each
 * describing its systems, weapons, and other fixed characteristics.
 * Weapons are referenced by name (not weaponTypeId), resolved against
 * weaponList (see weapons.js) when a ship is actually instantiated -
 * see createShipFromClass() in sfb.html.
 *
 * This module only loads and looks up class data; it doesn't know how to
 * build a shipType/shipSystemsType from it - that logic depends on those
 * constructors living in sfb.html itself.
 */

let shipClassList = []; // resolved ship classes, in file order
let shipClassesByName = {}; // convenience lookup by className ("CA", "D7", etc.)

async function loadShipClasses(url = 'data/ships.json') {
    const res = await fetch(url);
    const raw = await res.json();

    shipClassList = raw.slice();
    shipClassesByName = {};
    shipClassList.forEach(c => { shipClassesByName[c.className] = c; });
    return shipClassList;
}

function getShipClass(className) {
    const c = shipClassesByName[className];
    if (!c) throw new Error(`Unknown ship class "${className}"`);
    return c;
}

// Node/browser export compatibility
if (typeof module !== 'undefined') {
    module.exports = { loadShipClasses, getShipClass };
}
