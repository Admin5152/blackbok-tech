import fs from 'fs';

const path = 'views/Profile.tsx';
let s = fs.readFileSync(path, 'utf8');
const start = s.indexOf("      case 'orders':");
const end = s.indexOf("      case 'wishlist':");
if (start === -1 || end === -1 || end <= start) {
  console.error('markers not found', start, end);
  process.exit(1);
}
s = s.slice(0, start) + s.slice(end);
fs.writeFileSync(path, s);
console.log('Removed redundant profile tabs');
