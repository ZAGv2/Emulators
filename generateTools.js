const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const TEMPLATE_FILE = path.join(__dirname, 'template.html');
const TOOLS_DIR = path.join(__dirname, 'tools');
const INDEX_FILE = path.join(__dirname, 'index.html');

// Official emulator sites
const SOURCES = [
    { type: 'web', name: 'Dolphin', url: 'https://dolphin-emu.org/download/' },
    { type: 'web', name: 'PCSX2', url: 'https://pcsx2.net/download.html' },
    { type: 'web', name: 'RetroArch', url: 'https://www.retroarch.com/?page=platforms' },
    { type: 'github', name: 'OpenEmu', url: 'https://api.github.com/repos/OpenEmu/OpenEmu/releases' },
];

// GitHub search for new emulator repos
const GITHUB_SEARCH_QUERY = 'emulator language:cpp'; // can adjust language
const GITHUB_SEARCH_LIMIT = 20; // number of repos to fetch

// Fetch official web sources
async function fetchWebSource(source) {
    try {
        const { data } = await axios.get(source.url);
        const $ = cheerio.load(data);

        switch (source.name) {
            case 'Dolphin':
                return [{
                    name: 'Dolphin Emulator',
                    description: $('meta[name="description"]').attr('content') || 'No description',
                    platform: 'Windows / Mac / Linux',
                    download: source.url,
                    image: 'https://dolphin-emu.org/images/dolphin-emu-logo.png'
                }];
            case 'PCSX2':
                return [{
                    name: 'PCSX2',
                    description: $('meta[name="description"]').attr('content') || 'No description',
                    platform: 'Windows / Linux',
                    download: source.url,
                    image: 'https://pcsx2.net/images/logo-pcsx2.png'
                }];
            case 'RetroArch':
                return [{
                    name: 'RetroArch',
                    description: $('meta[name="description"]').attr('content') || 'No description',
                    platform: 'Multiple',
                    download: source.url,
                    image: 'https://www.retroarch.com/images/retroarch_logo.png'
                }];
            default:
                return [];
        }
    } catch (err) {
        console.error(`Error fetching ${source.name}:`, err.message);
        return [];
    }
}

// Fetch GitHub releases
async function fetchGitHubReleases(source) {
    try {
        const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };
        const { data } = await axios.get(source.url, { headers });
        if (!Array.isArray(data)) return [];

        return data.map(release => ({
            name: release.name || source.name,
            description: release.body || 'No description',
            platform: 'Multiple',
            download: release.html_url,
            image: release.assets[0]?.browser_download_url || ''
        }));
    } catch (err) {
        console.error(`Error fetching GitHub releases ${source.name}:`, err.message);
        return [];
    }
}

// Search GitHub for new emulator repos
async function searchGitHubRepos() {
    try {
        const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(GITHUB_SEARCH_QUERY)}&sort=updated&order=desc&per_page=${GITHUB_SEARCH_LIMIT}`;
        const { data } = await axios.get(url, { headers });
        return data.items.map(repo => ({
            name: repo.name,
            description: repo.description || 'No description',
            platform: 'Multiple',
            download: repo.html_url,
            image: '' // optional: later can scrape README image
        }));
    } catch (err) {
        console.error('Error searching GitHub:', err.message);
        return [];
    }
}

// Create individual tool page
function createToolPage(tool) {
    const template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
    const html = template
        .replace(/GAME_TITLE/g, tool.name)
        .replace(/CONSOLE_NAME/g, tool.platform)
        .replace(/CREATOR_NAME/g, 'Unknown')
        .replace(/RELEASE_YEAR/g, new Date().getFullYear())
        .replace(/GAME_DESCRIPTION/g, tool.description)
        .replace(/GAME_ZIP_LINK/g, tool.download)
        .replace(/GAME_FOLDER/g, tool.name.replace(/\s+/g, '_'));

    const folder = path.join(TOOLS_DIR, tool.name.replace(/\s+/g, '_'));
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'index.html'), html, 'utf-8');
}

// Update index table
function updateIndex(tools) {
    let rows = '';
    tools.forEach(tool => {
        const folder = tool.name.replace(/\s+/g, '_');
        rows += `<tr>
<td><img src="${tool.image}" width="60"></td>
<td><a href="tools/${folder}/index.html" style="color:#1e90ff;">${tool.name}</a></td>
<td>${tool.platform}</td>
<td>Unknown</td>
<td>${new Date().getFullYear()}</td>
</tr>\n`;
    });

    const indexTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Emulators - ZAG Archive</title>
<style>
table {width:100%;border-collapse:collapse;}
th,td {padding:12px;border-bottom:1px solid #ddd;}
th {background:#f7f7f7;color:#1e90ff;}
a {text-decoration:none;color:#1e90ff;}
</style>
</head>
<body>
<h1>Emulators</h1>
<table>
<thead>
<tr><th>Icon</th><th>Name</th><th>Platform</th><th>Creator</th><th>Year</th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>`;
    fs.writeFileSync(INDEX_FILE, indexTemplate, 'utf-8');
}

// Main async function
(async () => {
    try {
        let allTools = [];

        // Official + GitHub releases
        for (const source of SOURCES) {
            let tools = [];
            if (source.type === 'web') tools = await fetchWebSource(source);
            if (source.type === 'github') tools = await fetchGitHubReleases(source);
            allTools.push(...tools);
        }

        // GitHub search for new repos
        const githubSearchTools = await searchGitHubRepos();
        allTools.push(...githubSearchTools);

        // Remove duplicates
        const seen = new Set();
        allTools = allTools.filter(tool => {
            if (seen.has(tool.name)) return false;
            seen.add(tool.name);
            return true;
        });

        // Create pages + index
        allTools.forEach(createToolPage);
        updateIndex(allTools);

        console.log(`✅ Generated ${allTools.length} tools.`);
    } catch (err) {
        console.error('❌ Error generating tools:', err.message);
    }
})();

// Save tools log for checking progress
fs.writeFileSync(path.join(__dirname, 'tools_log.json'), JSON.stringify(allTools, null, 2), 'utf-8');
console.log('✅ Saved tools_log.json for inspection');