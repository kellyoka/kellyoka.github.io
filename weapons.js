/**
 * Weapons module
 * ----------------
 * Loads data/weapons.json, resolves "extends" (inherit a base weapon's
 * damage table) and "overrides" (patch specific range rows), and exposes
 * a single lookup function for damage-at-range instead of hand-indexed
 * arrays.
 */

let weaponList = []; // resolved weapons, keyed by array position (same shape consumers expect)
let weaponsByName = {}; // convenience lookup while resolving "extends"

async function loadWeapons(url = 'data/weapons.json') {
    const res = await fetch(url);
    const raw = await res.json();

    weaponsByName = {};
    raw.forEach(w => { weaponsByName[w.weaponName] = w; });

    weaponList = raw.map(resolveWeapon);
    return weaponList;
}

function resolveWeapon(entry) {
    let damageTable = entry.damageTable;

    if (entry.extends) {
        const base = weaponsByName[entry.extends];
        if (!base) throw new Error(`"${entry.weaponName}" extends unknown weapon "${entry.extends}"`);

        // base's own table (base may itself extend something, so resolve recursively)
        const baseResolved = base.damageTable ? base : resolveWeapon(base);
        damageTable = baseResolved.damageTable.map(row => ({ range: row.range, hits: [...row.hits] }));

        if (entry.overrides) {
            for (const [range, hits] of Object.entries(entry.overrides)) {
                const row = damageTable.find(r => r.range === Number(range));
                if (!row) throw new Error(`"${entry.weaponName}" override range ${range} has no matching base row`);
                row.hits = hits;
            }
        }
    }

    return {
        weaponTypeId: entry.weaponTypeId,
        weaponClassId: entry.weaponClassId,
        weaponName: entry.weaponName,
        effRange: entry.effRange,
        powerCost: entry.powerCost,
        fireRate: entry.fireRate,
        damageTable
    };
}

/**
 * Look up the hits array for a weapon at a given range.
 * Replaces manual "weaponList[y].damageArray[N].r3" indexing:
 * damage tables are step functions of range, so we just find the last
 * row whose range is <= the firing range.
 */
function getDamage(weapon, range) {
    let match = null;
    for (const row of weapon.damageTable) {
        if (row.range <= range) match = row;
        else break;
    }
    if (!match) throw new Error(`${weapon.weaponName}: no damage row covers range ${range}`);
    return match.hits;
}

function getDamageByTypeId(weaponTypeId, range) {
    const weapon = weaponList.find(w => w.weaponTypeId === weaponTypeId);
    if (!weapon) throw new Error(`Unknown weaponTypeId ${weaponTypeId}`);
    return getDamage(weapon, range);
}

/**
 * Sanity check: every table's ranges should be sorted ascending with no
 * duplicates. Run this in dev after editing weapons.json.
 */
function validateWeapons() {
    const problems = [];
    for (const w of weaponList) {
        let prev = -1;
        for (const row of w.damageTable) {
            if (row.range <= prev) {
                problems.push(`${w.weaponName}: range ${row.range} is out of order or duplicated`);
            }
            prev = row.range;
        }
    }
    return problems;
}

// Node/browser export compatibility
if (typeof module !== 'undefined') {
    module.exports = { loadWeapons, resolveWeapon, getDamage, getDamageByTypeId, validateWeapons };
}
