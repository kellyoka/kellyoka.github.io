/**
 * Damage Allocation Chart module
 * -------------------------------
 * Loads data/dac-chart.json: for a given 2d6 roll (2-12), returns the
 * ordered list of {system, oneTime} cells, replacing the old
 * dacChart[roll][col] = new dacCellType(name, bOneTime) block.
 */

let dacChart = {};

async function loadDacChart(url = 'data/dac-chart.json') {
    const res = await fetch(url);
    dacChart = await res.json();
    return dacChart;
}

/** All cells for a given 2d6 roll (2-12) */
function getDacRow(roll) {
    const row = dacChart[String(roll)];
    if (!row) throw new Error(`No DAC row for roll ${roll}`);
    return row;
}

/** A specific cell within a row, e.g. the 5th box hit at this roll */
function getDacCell(roll, col) {
    const row = getDacRow(roll);
    if (col < 0 || col >= row.length) throw new Error(`DAC roll ${roll} has no column ${col}`);
    return row[col];
}

if (typeof module !== 'undefined') {
    module.exports = { loadDacChart, getDacRow, getDacCell };
}
