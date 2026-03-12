// generateEmulatorPages.js
// Node.js script for Emulators repo
// Run this in your repo to auto-generate emulator pages and update index table

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// CONFIG
const TEMPLATE_PATH = path.join(__dirname, 'template.html'); // your tool template
const OUTPUT_DIR = path.join(__dirname, 'tools'); // folder where each HTML page will be saved
const CATEGORY_INDEX = path.join(__dirname, 'index.html'); // main Emulators page
const CATEGORY_NAME = 'Emulators';

// Sample data source: You would replace this with your automated fetch logic
// For each emulator: name, platform, developer, version, description, cover image link, download link
const emulatorData = [
  {
    name: 'RetroEmuX',
    platform: 'Windows / Mac / Linux',
    developer: 'RetroSoft Inc.',
    version: '2.3.1',
    description: 'High-performance emulator for classic consoles with advanced debugging tools.',
    cover: 'https://example.com/images/retroemux_cover.jpg',
    download: 'https://example.com/downloads/retroemux.zip'
  },
  {
    name: 'ClassicPlay',
    platform: 'Windows / Linux',
    developer: 'ClassicWare',
    version: '1.8.0',
    description: 'Easy-to-use emulator for retro games with online save states.',
    cover: 'https://example.com/images/classicplay_cover.png',
    download: 'https://example.com/downloads/classicplay.zip'
  }
];

// Step 1: Read template
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Ensure output folder exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Step 2: Generate HTML for each emulator
emulatorData.forEach(tool => {
  const fileName = tool.name.replace(/\s+/g, '_') + '.html';
  const filePath = path.join(OUTPUT_DIR, fileName);

  let html = template
    .replace(/{{TOOL_NAME}}/g, tool.name)
    .replace(/{{PLATFORM}}/g, tool.platform)
    .replace(/{{DEVELOPER}}/g, tool.developer)
    .replace(/{{VERSION}}/g, tool.version)
    .replace(/{{DESCRIPTION}}/g, tool.description)
    .replace(/{{COVER_IMAGE_LINK}}/g, tool.cover)
    .replace(/{{DOWNLOAD_LINK}}/g, tool.download)
    .replace(/{{CATEGORY_PAGE_LINK}}/g, './index.html');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Generated: ${fileName}`);
});

// Step 3: Update main category table
// Read index.html
let indexHtml = fs.readFileSync(CATEGORY_INDEX, 'utf8');

// Find the tbody of the table and replace content
const tbodyStart = indexHtml.indexOf('<tbody>');
const tbodyEnd = indexHtml.indexOf('</tbody>');

if (tbodyStart === -1 || tbodyEnd === -1) {
  console.error('Cannot find <tbody> in index.html');
  process.exit(1);
}

// Build table rows
let tableRows = '';
emulatorData.forEach(tool => {
  const fileName = 'tools/' + tool.name.replace(/\s+/g, '_') + '.html';
  tableRows += `<tr>
<td><img src="${tool.cover}" alt="${tool.name}" style="width:50px;height:auto;border-radius:6px;"></td>
<td><a href="${fileName}" style="color:#1e90ff;font-weight:600;">${tool.name}</a></td>
<td>${tool.platform}</td>
<td>${tool.developer}</td>
<td>${tool.version}</td>
</tr>\n`;
});

const newIndexHtml = indexHtml.slice(0, tbodyStart + 7) + '\n' + tableRows + indexHtml.slice(tbodyEnd);
fs.writeFileSync(CATEGORY_INDEX, newIndexHtml, 'utf8');

console.log('Emulators index table updated.');
