const fs = require('fs');
const path = require('path');
const { resolveWeapon, getDamage, validateWeapons } = require('./js/weapons.js');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/weapons.json'), 'utf8'));
const weaponsByName = {};
raw.forEach(w => { weaponsByName[w.weaponName] = w; });

// mimic loadWeapons() without fetch()
function resolve(entry) {
    let damageTable = entry.damageTable;
    if (entry.extends) {
        const base = weaponsByName[entry.extends];
        const baseResolved = base.damageTable ? base : resolve(base);
        damageTable = baseResolved.damageTable.map(row => ({ range: row.range, hits: [...row.hits] }));
        if (entry.overrides) {
            for (const [range, hits] of Object.entries(entry.overrides)) {
                const row = damageTable.find(r => r.range === Number(range));
                row.hits = hits;
            }
        }
    }
    return { ...entry, damageTable };
}

const weaponList = raw.map(resolve);

// --- Original hardcoded tables, copied verbatim from sfb.html, as [range, ...hits] tuples ---
const original = {
    'Phaser 1': [
        [0, 9, 8, 7, 6, 5, 4], [1, 8, 7, 5, 4, 4, 4], [2, 7, 6, 5, 4, 4, 3], [3, 6, 5, 4, 4, 4, 3],
        [4, 5, 5, 4, 4, 3, 2], [5, 5, 4, 4, 3, 3, 2], [8, 4, 3, 3, 2, 1, 0], [15, 3, 2, 1, 0, 0, 0],
        [25, 2, 1, 0, 0, 0, 0], [50, 1, 1, 0, 0, 0, 0], [75, 1, 0, 0, 0, 0, 0]
    ],
    'Phaser 2': [
        [0, 6, 6, 6, 5, 5, 5], [1, 5, 5, 4, 4, 4, 3], [2, 5, 4, 4, 4, 3, 3], [3, 4, 4, 4, 3, 3, 3],
        [8, 3, 2, 1, 1, 0, 0], [15, 2, 1, 1, 0, 0, 0], [30, 1, 1, 0, 0, 0, 0], [50, 1, 0, 0, 0, 0, 0]
    ],
    'Phaser 3': [
        [0, 4, 4, 4, 4, 4, 3], [1, 4, 4, 4, 4, 3, 3], [2, 4, 4, 4, 3, 2, 1], [3, 3, 2, 1, 0, 0, 0],
        [8, 1, 1, 0, 0, 0, 0], [15, 1, 0, 0, 0, 0, 0]
    ],
    'Phaser G': [ // identical table to Phaser 3 in the original
        [0, 4, 4, 4, 4, 4, 3], [1, 4, 4, 4, 4, 3, 3], [2, 4, 4, 4, 3, 2, 1], [3, 3, 2, 1, 0, 0, 0],
        [8, 1, 1, 0, 0, 0, 0], [15, 1, 0, 0, 0, 0, 0]
    ],
    'Disruptor': [
        [0, 6, 0, 10], [1, 5, 5, 10], [2, 5, 4, 8], [4, 4, 4, 8],
        [8, 4, 3, 6], [15, 4, 3, 0], [22, 3, 2, 0], [30, 2, 2, 0]
    ],
    'Disruptor UIM': [
        [0, 6, 0, 10], [1, 5, 5, 10], [2, 5, 4, 8], [4, 4, 4, 8],
        [8, 4, 3, 6], [15, 4, 3, 6], [22, 4, 2, 4], [30, 2, 2, 4]
    ],
    'Disruptor DERFACS': [
        [0, 6, 0, 10], [1, 5, 5, 10], [2, 5, 4, 8], [4, 4, 4, 8],
        [8, 4, 3, 6], [15, 4, 3, 6], [22, 3, 2, 4], [30, 3, 2, 4]
    ],
    'Photon': [
        [1, 0, 8], [2, 5, 8], [4, 4, 8], [8, 3, 8], [12, 2, 8], [30, 1, 8]
    ]
};

let fails = 0, checks = 0;

for (const [name, rows] of Object.entries(original)) {
    const weapon = weaponList.find(w => w.weaponName === name);
    if (!weapon) { console.log(`MISSING WEAPON: ${name}`); fails++; continue; }

    for (const [range, ...hits] of rows) {
        checks++;
        const got = getDamage(weapon, range);
        const ok = JSON.stringify(got) === JSON.stringify(hits);
        if (!ok) {
            fails++;
            console.log(`MISMATCH ${name} @ range ${range}: expected ${JSON.stringify(hits)}, got ${JSON.stringify(got)}`);
        }
    }
}

const structuralProblems = (function () {
    // re-run validateWeapons against our locally-resolved list
    const problems = [];
    for (const w of weaponList) {
        let prev = -1;
        for (const row of w.damageTable) {
            if (row.range <= prev) problems.push(`${w.weaponName}: range ${row.range} out of order/duplicated`);
            prev = row.range;
        }
    }
    return problems;
})();

console.log(`\n${checks} range checks run, ${fails} mismatches.`);
console.log(structuralProblems.length ? `Structural problems: ${structuralProblems.join('; ')}` : 'No structural problems (ranges sorted, no dupes).');
console.log(fails === 0 && structuralProblems.length === 0 ? '\n✅ weapons.json is an exact match for the original data.' : '\n❌ Differences found — see above.');
