const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");
const LOGOS_DIR = path.join(TOOLS_DIR, "logos");
const PAGINATED_DIR = path.join(TOOLS_DIR, "pages");

const DEFAULT_IMAGE = "../logos/Default-cover.jpg";

// Allowed sources (GitHub + other legal sources)
const SOURCES = [
  "https://api.github.com/search/repositories?q=emulator&sort=stars&order=desc&per_page=100",
  "https://api.github.com/search/repositories?q=nes+emulator&sort=stars&order=desc&per_page=100",
  "https://api.github.com/search/repositories?q=snes+emulator&sort=stars&order=desc&per_page=100",
  "https://api.github.com/search/repositories?q=ps2+emulator&sort=stars&order=desc&per_page=100",
  "https://api.github.com/search/repositories?q=gameboy+emulator&sort=stars&order=desc&per_page=100"
  // Add more legal sources here if needed
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function loadTools() {
  if (!fs.existsSync(TOOLS_JSON)) return [];
  return JSON.parse(fs.readFileSync(TOOLS_JSON, "utf8"));
}

function saveTools(data) {
  fs.writeFileSync(TOOLS_JSON, JSON.stringify(data, null, 2));
}

async function fetchRepos(url) {
  const res = await fetch(url, { headers: { "User-Agent": "zag-archive-bot" } });
  const data = await res.json();
  return data.items || [];
}

function getImage(tool) {
  const localPath = path.join(LOGOS_DIR, tool.slug + ".jpg");
  if (fs.existsSync(localPath)) return `../logos/${tool.slug}.jpg`;
  return DEFAULT_IMAGE;
}

function generatePage(tool, template) {
  const image = getImage(tool);
  const version = tool.version || "...";
  const html = template
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

function generatePaginatedIndex(tools) {
  if (!fs.existsSync(PAGINATED_DIR)) fs.mkdirSync(PAGINATED_DIR, { recursive: true });
  const PER_PAGE = 20;
  const totalPages = Math.ceil(tools.length / PER_PAGE);

  for (let i = 0; i < totalPages; i++) {
    const pageTools = tools.slice(i * PER_PAGE, (i + 1) * PER_PAGE);
    let cardsHtml = pageTools.map(tool => {
      const image = getImage(tool);
      const version = tool.version || "...";
      return `
        <div class="card">
          <img src="${image}" alt="${tool.name} Cover">
          <h3>${tool.name}</h3>
          <p>${version}</p>
          <a class="download-btn" href="../tools/${tool.slug}/index.html">Details</a>
        </div>`;
    }).join("\n");

    const pageHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Emulators - Page ${i + 1}</title>
      <style>
        body { font-family:'Segoe UI',sans-serif; margin:0; background:#f0f2f5; color:#222; }
        header { background:#fff; padding:15px 30px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.1); flex-wrap:wrap; }
        .site-title { font-weight:700; font-size:20px; color:#1e90ff; text-transform:uppercase; }
        nav a { margin-left:20px; text-decoration:none; color:#333; font-weight:600; }
        nav a:hover { color:#1e90ff; }
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:20px; margin:40px; }
        .card { background:#fff; padding:15px; border-radius:12px; text-align:center; box-shadow:0 6px 12px rgba(0,0,0,0.08); }
        .card img { width:100%; border-radius:10px; margin-bottom:10px; }
        .card h3 { color:#1e90ff; margin-bottom:5px; }
        .card p { font-size:14px; color:#555; margin-bottom:10px; }
        .download-btn { display:inline-block; padding:8px 16px; background:#1e90ff; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; }
        .download-btn:hover { background:#187bcd; }
        .pagination { text-align:center; margin-bottom:40px; }
        .pagination a { margin:0 5px; text-decoration:none; color:#1e90ff; font-weight:600; }
        .pagination a:hover { text-decoration:underline; }
      </style>
    </head>
    <body>
      <header>
        <div class="site-title">ZAG Archive</div>
        <nav>
          <a href="../index.html">Home</a>
          <a href="../about.html">About</a>
          <a href="../contact.html">Contact</a>
        </nav>
      </header>

      <div class="grid">
        ${cardsHtml}
      </div>

      <div class="pagination">
        ${Array.from({length: totalPages}, (_, j) => `<a href="page${j+1}.html">${j+1}</a>`).join(' ')}
      </div>
    </body>
    </html>`;

    fs.writeFileSync(path.join(PAGINATED_DIR, `page${i + 1}.html`), pageHtml);
  }
}

async function run() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  let tools = loadTools();

  for (const url of SOURCES) {
    const repos = await fetchRepos(url);
    for (const repo of repos) {
      const slug = slugify(repo.name);
      let existing = tools.find(t => t.slug === slug);

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
      else {
        tools.push(toolData);
        console.log("Added:", toolData.name);
      }

      generatePage(toolData, template);
    }
  }

  saveTools(tools);
  generatePaginatedIndex(tools);

  console.log("All emulators processed and paginated.");
}

run();
