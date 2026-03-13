const fs = require("fs");
const path = require("path");

// Paths
const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");
const LOGOS_DIR = path.join(TOOLS_DIR, "logos");

// Default fallback image
const DEFAULT_IMAGE = "../logos/Default-cover.jpg";

// Full console list (~150 consoles)
const CONSOLES = [
  "NES","SNES","N64","GBA","Game Boy","GameCube","Wii","Wii U","Switch",
  "PS1","PS2","PS3","PS4","PS5","PSP","PS Vita",
  "Xbox","Xbox 360","Xbox One","Xbox Series X",
  "Atari 2600","Atari 5200","Atari 7800","Atari Jaguar","Atari Lynx",
  "Sega Master System","Sega Genesis","Sega Saturn","Dreamcast","Game Gear",
  "TurboGrafx 16","Neo Geo","Neo Geo Pocket","Neo Geo Pocket Color",
  "MAME","Amiga","Commodore 64","ZX Spectrum","DOS","Apple II","Intellivision",
  "Vectrex","ColecoVision","Odyssey2","Magnavox Odyssey","PC Engine","Sharp X68000",
  "Neo Geo CD","Neo Geo AES","3DO","WonderSwan","WonderSwan Color",
  "Neo Geo Mini","Neo Geo X","Atari 8-bit","Oric","Amstrad CPC","BBC Micro",
  "Coleco ADAM","Famicom","Super Famicom","Virtual Boy","PSX","Satellaview",
  "FM Towns","PC-FX","Neo Geo CDZ","Neo Geo CDX","PC Engine SuperGrafx",
  "Mega Drive","Master System","Game Boy Color","Game Boy Advance SP",
  "Game Boy Micro","PSP Go","PSP 3000","PSP 1000","PSP 2000"
  // Add more if needed
];

// Utility to convert names to URL-safe slugs
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Load tools.json if exists
function loadTools() {
  if (!fs.existsSync(TOOLS_JSON)) return [];
  return JSON.parse(fs.readFileSync(TOOLS_JSON));
}

// Save tools.json
function saveTools(data) {
  fs.writeFileSync(TOOLS_JSON, JSON.stringify(data, null, 2));
}

// Fetch repositories from GitHub API with pagination
async function fetchRepos(query, page = 1) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100&page=${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "zag-archive-bot" } });
  const data = await res.json();
  return data.items || [];
}

// Determine image to use for a tool
function getImage(tool) {
  const localPath = path.join(LOGOS_DIR, tool.slug + ".jpg");
  if (fs.existsSync(localPath)) return `../logos/${tool.slug}.jpg`;
  if (tool.avatar) return tool.avatar;
  return DEFAULT_IMAGE;
}

// Generate a single tool HTML page
function generatePage(tool, template) {
  const image = getImage(tool);
  const version = tool.version || "...";

  let html = template
    .replace(/GAME_TITLE/g, tool.name)
    .replace(/CREATOR_NAME/g, tool.creator)
    .replace(/GAME_DESCRIPTION/g, tool.description)
    .replace(/GAME_ZIP_LINK/g, tool.url)
    .replace(/CONSOLE_NAME/g, "Multi Platform")
    .replace(/RELEASE_YEAR/g, version)
    .replace(/COVER_IMAGE_URL/g, image);

  const toolFolder = path.join(TOOLS_DIR, tool.slug);
  if (!fs.existsSync(toolFolder)) fs.mkdirSync(toolFolder, { recursive: true });

  const htmlPath = path.join(toolFolder, "index.html");
  if (!fs.existsSync(htmlPath) || fs.readFileSync(htmlPath, "utf8") !== html) {
    fs.writeFileSync(htmlPath, html);
    console.log("Updated:", tool.name);
  }
}

// Generate paginated index HTML
function generateIndex(tools) {
  const perPage = 20;
  const totalPages = Math.ceil(tools.length / perPage);

  for (let page = 1; page <= totalPages; page++) {
    const pageTools = tools.slice((page - 1) * perPage, page * perPage);
    let content = `<div class="tools-grid">`;
    pageTools.forEach(tool => {
      const image = getImage(tool);
      content += `
        <div class="tool-card">
          <a href="./${tool.slug}/index.html">
            <img src="${image}" alt="${tool.name}">
            <h3>${tool.name}</h3>
          </a>
        </div>`;
    });
    content += `</div>`;

    const pagination = [];
    for (let p = 1; p <= totalPages; p++) {
      pagination.push(`<a href="index-page${p}.html"${p===page?' class="active"':''}>${p}</a>`);
    }

    const indexHtml = `
      <html>
        <head><title>Emulators - Page ${page}</title></head>
        <body>
          <h1>Emulators</h1>
          ${content}
          <div class="pagination">${pagination.join(" ")}</div>
        </body>
      </html>
    `;

    fs.writeFileSync(path.join(TOOLS_DIR, `index-page${page}.html`), indexHtml);
  }

  console.log(`Generated ${totalPages} index pages.`);
}

// Main
async function run() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const tools = loadTools();

  for (const consoleName of CONSOLES) {
    let page = 1;
    while (true) {
      const repos = await fetchRepos(`${consoleName} emulator`, page);
      if (!repos.length) break;

      for (const repo of repos) {
        const slug = slugify(repo.name);
        const existing = tools.find(t => t.slug === slug);

        const toolData = {
          name: repo.name,
          creator: repo.owner.login,
          description: repo.description || "Open source emulator",
          url: repo.html_url,
          homepage: repo.homepage || null,
          version: "...",
          avatar: repo.owner.avatar_url,
          slug: slug
        };

        if (existing) Object.assign(existing, toolData);
        else tools.push(toolData);

        generatePage(toolData, template);
      }

      page++;
    }
  }

  saveTools(tools);
  generateIndex(tools);
  console.log("All emulators processed.");
}

run();
