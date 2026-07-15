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
      
      content = content.replace(/Dealer Management/g, 'Customer Management');
      content = content.replace(/Create Dealer/g, 'Create Customer');
      content = content.replace(/Edit Dealer/g, 'Edit Customer');
      content = content.replace(/Delete Dealer/g, 'Delete Customer');
      content = content.replace(/Dealer ID/g, 'Customer ID');
      content = content.replace(/Dealer Name/g, 'Customer Name');
      content = content.replace(/Dealer Details/g, 'Customer Details');
      content = content.replace(/Register New Dealer/g, 'Register New Customer');
      content = content.replace(/Modify Dealer Details/g, 'Modify Customer Details');
      content = content.replace(/Total Dealers/g, 'Total Customers');
      content = content.replace(/Dealer Profile/g, 'Customer Profile');
      content = content.replace(/Search dealers\.\.\./gi, 'Search customers...');
      content = content.replace(/Select Dealer/gi, 'Select Customer');
      content = content.replace(/Select a dealer/gi, 'Select a customer');
      content = content.replace(/No dealers found/gi, 'No customers found');
      content = content.replace(/>Add Dealer</gi, '>Add Customer<');
      content = content.replace(/'Dealer'/g, "'Customer'");
      content = content.replace(/'Dealers'/g, "'Customers'");
      content = content.replace(/Dealer Role/gi, 'Customer Role');
      content = content.replace(/>Dealer</gi, '>Customer<');
      content = content.replace(/>Dealers</gi, '>Customers<');
      content = content.replace(/Dealer Login/g, 'Customer Login');
      content = content.replace(/Billing Dealer/g, 'Billing Customer');
      content = content.replace(/active dealer accounts/g, 'active customer accounts');
      content = content.replace(/dealer settlements/g, 'customer settlements');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceInDir(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages'));
replaceInDir(path.join(__dirname, '..', '..', 'frontend', 'src', 'components'));
console.log('Dealer to Customer replacements complete.');
