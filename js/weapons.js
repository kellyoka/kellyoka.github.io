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
        minRange: entry.minRange || 0,
        powerCost: entry.powerCost,
        fireRate: entry.fireRate,
        damageTable
    };
}

/**
 * Look up the hits array for a weapon at a given range.
 * Replaces manual "weaponList[y].damageArray[N].r3" indexing and the
 * original "for(z...) if (h <= dArray[z].range) break" scan.
 *
 * SFB damage tables are bracketed by the UPPER bound of each range band
 * (e.g. Phaser 1's bands top out at 0, 1, 2, 3, 4, 5, 8, 15, 25, 50, 75),
 * so a firing range of, say, 6 falls into the "8" bracket. We want the
 * first row whose range is >= the firing range (i.e. round UP to the
 * next bracket), not the last row <= range.
 */
function getDamage(weapon, range) {
    const row = weapon.damageTable.find(r => range <= r.range);
    if (!row) throw new Error(`${weapon.weaponName}: range ${range} exceeds max range (${weapon.effRange})`);
    return row.hits;
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
