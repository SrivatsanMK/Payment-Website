const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      content = content.replace(/Customer Management/g, 'Dealer Management');
      content = content.replace(/Create Customer/g, 'Create Dealer');
      content = content.replace(/Edit Customer/g, 'Edit Dealer');
      content = content.replace(/Delete Customer/g, 'Delete Dealer');
      content = content.replace(/Customer ID/g, 'Dealer ID');
      content = content.replace(/Customer Name/g, 'Dealer Name');
      content = content.replace(/Customer Details/g, 'Dealer Details');
      content = content.replace(/Register New Customer/g, 'Register New Dealer');
      content = content.replace(/Modify Customer Details/g, 'Modify Dealer Details');
      content = content.replace(/Customer Name/g, 'Dealer Name');
      content = content.replace(/Total Customers/g, 'Total Dealers');
      content = content.replace(/Customer Profile/g, 'Dealer Profile');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceInDir(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages'));
console.log('Second pass UI replacements complete.');
