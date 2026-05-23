const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/alejandracastro/Desktop/ALTITUD HUB/Performance Dashboard -ALTITUD.xlsx');
const sheet = workbook.Sheets['Production'];

console.log('Production sheet loaded.');
for (let r = 0; r < 80; r++) {
  let row = [];
  for (let c = 0; c < 15; c++) {
    const val = sheet[XLSX.utils.encode_cell({ r, c })]?.v;
    row.push(val === undefined ? '' : val);
  }
  if (row.some(val => val !== '')) {
    console.log(`Row ${r+1}:`, row.slice(0, 10).map(v => String(v).substring(0, 20)));
  }
}
