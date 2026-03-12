// generateTools.js
// Fully automatic system for Emulators (tool name links → tool page, download opens official page)

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const TEMPLATE_FILE = path.join(__dirname, 'templates', 'template.html');
const TOOLS_DIR = path.join(__dirname, 'tools');
const INDEX_FILE = path.join(__dirname, 'index.html');
const DATA_JSON = path.join(__dirname, 'emulators.json');

const SOURCES = [
  'https://example-legal-emulator-site.com/list',
];

const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);

async function fetchTools() {
    const tools = [];
    for (const url of SOURCES) {
        try {
            const res = await axios.get(url);
            const $ = cheerio.load(res.data);

            $('.tool-entry').each((i, el) => {
                const name = $(el).find('.tool-name').text().trim();
                const platform = $(el).find('.tool-platform').text().trim();
                const developer = $(el).find('.tool-developer').text().trim();
                const version = $(el).find('.tool-version').text().trim();
                const description = $(el).find('.tool-description').text().trim();
                const cover = $(el).find('.tool-cover img').attr('src');
                const download = $(el).find('.tool-download a').attr('href'); // official page

                if(name && download){
                    tools.push({name, platform, developer, version, description, cover, download});
                }
            });
        } catch(err) {
            console.error(`Error fetching from ${url}:`, err.message);
        }
    }
    return tools;
}

function generateToolPage(tool) {
    const toolFolder = path.join(TOOLS_DIR, tool.name.replace(/\s+/g,'_'));
    if(!fs.existsSync(toolFolder)) fs.mkdirSync(toolFolder);

    const html = template
        .replace(/GAME_TITLE/g, tool.name)
        .replace(/CONSOLE_NAME/g, tool.platform)
        .replace(/CREATOR_NAME/g, tool.developer)
        .replace(/RELEASE_YEAR/g, tool.version)
        .replace(/GAME_DESCRIPTION/g, tool.description)
        .replace(/GAME_ZIP_LINK/g, tool.download)
        .replace(/COVER_IMAGE_URL/g, tool.cover);

    fs.writeFileSync(path.join(toolFolder, 'index.html'), html, 'utf8');
}

function updateIndex(tools) {
    let rows = '';
    tools.forEach(tool => {
        rows += `<tr>
            <td><img src="${tool.cover}" alt="${tool.name}" width="50"></td>
            <td><a href="tools/${tool.name.replace(/\s+/g,'_')}/index.html" style="color:#1e90ff">${tool.name}</a></td>
            <td>${tool.platform}</td>
            <td>${tool.developer}</td>
            <td>${tool.version}</td>
        </tr>\n`;
    });

    const indexContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Emulators - ZAG Archive</title>
<style>
body{font-family:'Segoe UI',sans-serif;background:#f0f2f5;color:#222;margin:0;}
table{width:100%;border-collapse:collapse;background:#fff;margin:40px auto;box-shadow:0 6px 12px rgba(0,0,0,0.08);}
th,td{padding:12px 10px;border-bottom:1px solid #ddd;text-align:left;}
th{background:#f7f7f7;color:#1e90ff;}
tr:hover{background:#f0f8ff;}
a{color:#1e90ff;text-decoration:none;font-weight:600;}
</style>
</head>
<body>
<table>
<thead>
<tr><th>Cover</th><th>Name</th><th>Platform</th><th>Developer</th><th>Version</th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`;
    fs.writeFileSync(INDEX_FILE, indexContent, 'utf8');
}

(async () => {
    const tools = await fetchTools();
    tools.forEach(generateToolPage);
    updateIndex(tools);
    fs.writeFileSync(DATA_JSON, JSON.stringify(tools,null,2),'utf8');
    console.log(`Updated ${tools.length} tools.`);
})();