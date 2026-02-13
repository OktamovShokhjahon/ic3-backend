import path from 'path';
import * as XLSX from 'xlsx';

const excelPath = path.resolve(__dirname, 'src/public/old-logins.xlsx');
console.log('Reading Excel file:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log('\nSheet name:', sheetName);
  console.log('Total rows:', data.length);
  console.log('\nColumns:', Object.keys(data[0] || {}));
  console.log('\nFirst 5 rows:');
  data.slice(0, 5).forEach((row, index) => {
    console.log(`Row ${index + 2}:`, row);
  });
} catch (error) {
  console.error('Error reading Excel file:', error);
}
