/**
 * Drone types module
 * -------------------
 * Loads data/drone-types.json - the Basic Set drone roster (Type-I
 * through Type-VI): the drones themselves, as opposed to the drone RACKS
 * (weaponTypeId 30-36 / "Drone A" - "Drone G" in weapons.json) that
 * launch them. A rack determines magazine capacity and reload
 * mechanics; a drone type determines what actually flies once launched
 * (speed, endurance, damage, hit points, and how many rack/stockpile
 * spaces one drone consumes).
 */

let droneTypeList = []; // resolved drone types, in file order
let droneTypesByName = {}; // convenience lookup by name ("Type-I", etc.)
let droneTypesById = {}; // convenience lookup by droneTypeId

async function loadDroneTypes(url = 'data/drone-types.json') {
    const res = await fetch(url);
    const raw = await res.json();

    droneTypeList = raw.slice();
    droneTypesByName = {};
    droneTypesById = {};
    droneTypeList.forEach(d => {
        droneTypesByName[d.name] = d;
        droneTypesById[d.droneTypeId] = d;
    });
    return droneTypeList;
}

function getDroneTypeByName(name) {
    const d = droneTypesByName[name];
    if (!d) throw new Error(`Unknown drone type "${name}"`);
    return d;
}

function getDroneTypeById(droneTypeId) {
    const d = droneTypesById[droneTypeId];
    if (!d) throw new Error(`Unknown droneTypeId ${droneTypeId}`);
    return d;
}

// Node/browser export compatibility
if (typeof module !== 'undefined') {
    module.exports = { loadDroneTypes, getDroneTypeByName, getDroneTypeById };
}
