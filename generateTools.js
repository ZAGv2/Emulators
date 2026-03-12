const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const TEMPLATE_FILE = path.join(__dirname, 'templates', 'template.html');
const TOOLS_DIR = path.join(__dirname, 'tools');
const INDEX_FILE = path.join(__dirname, 'index.html');
const DATA_JSON = path.join(__dirname, 'emulators.json');

// Official sites + GitHub releases
const SOURCES = [
    { type: 'web', name: 'Dolphin', url: 'https://dolphin-emu.org/download/' },
    { type: 'web', name: 'PCSX2', url: 'https://pcsx2.net/download.html' },
    { type: 'web', name: 'MAME', url: 'https://www.mamedev.org/release.html' },
    { type: 'web', name: 'RetroArch', url: 'https://www.retroarch.com/?page=platforms' },
    { type: 'web', name: 'PPSSPP', url: 'https://www.ppsspp.org/downloads.html' },
    { type: 'github', name: 'OpenEmu', url: 'https://api.github.com/repos/OpenEmu/OpenEmu/releases' },
    { type: 'github', name: 'BizHawk', url: 'https://api.github.com/repos/TASVideos/BizHawk/releases' },
    { type: 'github', name: 'RetroArch', url: 'https://api.github.com/repos/libretro/RetroArch/releases' },
    { type: 'github', name: 'PPSSPP', url: 'https://api.github.com/repos/hrydgard/ppsspp/releases' },
];

// GitHub search query for any emulator repos
const GITHUB_SEARCH = {
    query: 'emulator',
    language: 'cpp',
    per_page: 10, // limit to top 10 new repos per run
    token: process.env.GITHUB_TOKEN || null, // set in GitHub secrets
};

async function fetchWebSource(source) {
    const { data } = await axios.get(source.url);
    const $ = cheerio.load(data);

    // Example selectors (adjust per site)
    return [{
        name: source.name,
        description: $('meta[name="description"]').attr('content') || 'No description',
        platform: 'Multiple',
        download: source.url,
        image: $('img').first().attr('src') || ''
    }];
}

async function fetchGitHubReleases(source) {
    const headers = {};
    if (GITHUB_SEARCH.token) headers.Authorization = `token ${GITHUB_SEARCH.token}`;
    const { data } = await axios.get(source.url, { headers });
    if (!Array.isArray(data)) return [];

    return data.map(release => ({
        name: release.name || source.name,
        description: release.body || 'No description',
        platform: 'Multiple',
        download: release.html_url,
        image: release.assets[0]?.browser_download_url || ''
    }));
}

async function searchGitHubRepos() {
    const headers = {};
    if (GITHUB_SEARCH.token) headers.Authorization = `token ${GITHUB_SEARCH.token}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(GITHUB_SEARCH.query)}+language:${GITHUB_SEARCH.language}&sort=updated&order=desc&per_page=${GITHUB_SEARCH.per_page}`;
    const { data } = await axios.get(url, { headers });
    return data.items.map(repo => ({
        name: repo.name,
        description: repo.description || 'No description',
        platform: 'Multiple',
        download: repo.html_url,
        image: '' // can later scrape README for image if needed
    }));
}

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

function updateIndex(tools) {
    let rows = '';
    tools.forEach(tool => {
        const folder = tool.name.replace(/\s+/g, '_');
        rows += `<tr>
<td><img src="${tool.image}" width="60"></td>
<td><a href="tools/${folder}/index.html" style="color:#1e90ff;">${tool.name}</a></td>
<td>${tool.platform}</td>
<td>${'Unknown'}</td>
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
/* basic table styles */
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

(async () => {
    try {
        let allTools = [];

        for (const source of SOURCES) {
            let tools = [];
            if (source.type === 'web') tools = await fetchWebSource(source);
            if (source.type === 'github') tools = await fetchGitHubReleases(source);
            allTools.push(...tools);
        }

        const githubSearchTools = await searchGitHubRepos();
        allTools.push(...githubSearchTools);

        // Remove duplicates by name
        const seen = new Set();
        allTools = allTools.filter(tool => {
            if (seen.has(tool.name)) return false;
            seen.add(tool.name);
            return true;
        });

        allTools.forEach(createToolPage);
        updateIndex(allTools);

        fs.writeFileSync(DATA_JSON, JSON.stringify(allTools, null, 2));
        console.log(`✅ Updated ${allTools.length} tools.`);
    } catch (err) {
        console.error('❌ Error generating tools:', err.message);
    }
})();