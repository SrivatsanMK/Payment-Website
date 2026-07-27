const fs = require('fs');

const inputPath = 'C:/Users/sriva/.gemini/antigravity-ide/brain/eca4b9bf-ad8b-4e3d-a84b-e659083447cf/.tempmediaStorage/media_eca4b9bf-ad8b-4e3d-a84b-e659083447cf_1784985007477.png';
const outputPath = 'd:/My Project/Payment Website/frontend/src/utils/logoAsset.ts';

const b64 = fs.readFileSync(inputPath).toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;

const fileContent = `// Auto-generated: Green Glide Logistics vertical stacked logo (base64 encoded)
// Logo: 1024x682 PNG - vertical layout with leaves on top, D icon in center, GREEN GLIDE LOGISTICS text below
export const DEFAULT_INVOICE_LOGO = "${dataUrl}";
`;

fs.writeFileSync(outputPath, fileContent, 'utf8');

const stats = fs.statSync(outputPath);
console.log('SUCCESS! logoAsset.ts written.');
console.log('File size:', stats.size, 'bytes');
console.log('Base64 length:', b64.length, 'chars');
console.log('First 100 chars of dataUrl:', dataUrl.substring(0, 100));
