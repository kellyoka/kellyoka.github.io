/**
 * Damage Allocation Chart module
 * -------------------------------
 * Loads data/dac-chart.json and builds the runtime `dacChart` array in
 * the same shape the game logic already expects: dacChart[roll][col],
 * roll being a 2d6 total (2-12), each cell {name, bOneTime, bVolley}.
 *
 * bVolley is per-cell mutable state (has this box already been hit this
 * volley?) that lives only at runtime, never in the JSON.
 */

var dacChart = [];

async function loadDacChart(url = 'data/dac-chart.json') {
    const res = await fetch(url);
    const raw = await res.json(); // { "2": [{system, oneTime}, ...], ..., "12": [...] }

    dacChart = [];
    for (const rollStr of Object.keys(raw)) {
        const roll = Number(rollStr);
        dacChart[roll] = raw[rollStr].map(cell => ({
            name: cell.system,
            bOneTime: cell.oneTime,
            bVolley: false
        }));
    }
    return dacChart;
}

/** All cells for a given 2d6 roll (2-12) */
function getDacRow(roll) {
    const row = dacChart[roll];
    if (!row) throw new Error(`No DAC row for roll ${roll}`);
    return row;
}

/** A specific cell within a row */
function getDacCell(roll, col) {
    const row = getDacRow(roll);
    if (col < 0 || col >= row.length) throw new Error(`DAC roll ${roll} has no column ${col}`);
    return row[col];
}

/**
 * Clears the "already hit this volley" flag on every cell, for every
 * roll. Replaces the original reset loop, which had a bug: it looped
 * over z (2..12) and x (0..11) but always cleared dacChart[2][0]
 * regardless of z/x, so one-time boxes other than roll 2's first cell
 * never actually reset between volleys.
 */
function resetVolleyFlags() {
    for (var r = 2; r <= 12; r++) {
        for (var x = 0; x < dacChart[r].length; x++) {
            dacChart[r][x].bVolley = false;
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = { loadDacChart, getDacRow, getDacCell, resetVolleyFlags };
}
