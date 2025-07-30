const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/followers/page.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove fixed_amount option from dropdowns
content = content.replace(/<option value="fixed_amount">Fixed Amount<\/option>/g, '');

// Replace fixed_amount conditional logic
content = content.replace(/\{copyMode === "fixed_amount" \? "Fixed Amount \(USD\) \*" : "Lot Size \*"\}/g, '"Lot Size *"');
content = content.replace(/\{copyMode === "fixed_amount" \? "Enter amount in USD \(e\.g\., 100\)" : "Enter lot size \(e\.g\., 1\.0\)"\}/g, '"Enter lot size (e.g., 1.0)"');
content = content.replace(/\{copyMode === "fixed_amount" \? \s*"This amount will be invested in each trade regardless of the asset price\." :\s*"This is the lot size that will be used for trading\."\s*\}/g, '"This is the lot size that will be used for trading."');

// Replace the fixed_amount description in the explanation
content = content.replace(/<><strong>Fixed Amount:<\/strong> Always invest a fixed dollar amount \(e\.g\., \$100\) per trade\.<\/>/g, '<><strong>Fixed Lot:</strong> Always trade the same lot size (e.g., 0.01 BTC) regardless of broker size.</>');

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Removed all fixed_amount references from followers page'); 