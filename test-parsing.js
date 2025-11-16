// Simple test script for full course parsing
// Run with: node test-parsing.js

const fs = require('fs');
const path = require('path');

// Read test CSV
const csvPath = path.join(__dirname, 'test_corso_completo.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

console.log('='.repeat(60));
console.log('FULL COURSE CSV PARSING TEST');
console.log('='.repeat(60));
console.log();

console.log('CSV File:', csvPath);
console.log('CSV Size:', csvContent.length, 'bytes');
console.log('CSV Lines:', csvContent.split('\n').length);
console.log();

console.log('To test the TypeScript services, run:');
console.log('  npm start');
console.log('  and use the FullCourseApp component');
console.log();

console.log('Expected results:');
console.log('  - 3 days (19/09, 18/09, 17/09)');
console.log('  - 3 unique participants after alias merge:');
console.log('    1. Andres Moles (organizer)');
console.log('    2. Edoardo Sanna');
console.log('    3. Giorgio (merged from "giorgio s." + "Giorgio santambrogio")');
console.log();

console.log('Alias detection should auto-merge:');
console.log('  - "giorgio s." + "Giorgio santambrogio" → "Giorgio santambrogio"');
console.log('  - Confidence should be HIGH (> 85%)');
console.log();

console.log('='.repeat(60));
console.log('Test file created successfully!');
console.log('Build the TypeScript project to run the actual parsing:');
console.log('  npm run build');
console.log('='.repeat(60));
