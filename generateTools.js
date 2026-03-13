const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");
const LOGOS_DIR = path.join(TOOLS_DIR, "logos");
const DEFAULT_IMAGE = "../logos/Default-cover.jpg"; // make sure this exists

// GitHub queries for multiple consoles
const GITHUB_SEARCH = [
  "emulator",
  "nes emulator",
  "snes emulator",
  "ps2 emulator",
  "gameboy emulator"
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function loadTools() {
  if (!fs.existsSync(TOOLS_JSON)) return [];
  return JSON.parse(fs.readFileSync(TOOLS_JSON));
}

function saveTools(data) {
  fs.writeFileSync(TOOLS_JSON, JSON.stringify(data, null, 2));
}

// --- Determine the best image ---
function getCover(tool) {
  const localPath = path.join(LOGOS_DIR, tool.slug + ".jpg");
  if (fs.existsSync(localPath)) return `../logos/${tool.slug}.jpg`;
  if (tool.avatar) return tool.avatar;
  return DEFAULT_IMAGE;
}

// --- Generate individual HTML page ---
async function generatePage(tool, template) {
  const cover = getCover(tool);
  const version = tool.version || "...";

  const html = template
    .replace(/GAME_TITLE/g, tool.name)
    .replace(/CREATOR_NAME/g, tool.creator)
    .replace(/GAME_DESCRIPTION/g, tool.description)
    .replace(/GAME_ZIP_LINK/g, tool.url)
    .replace(/CONSOLE_NAME/g, "Multi Platform")
    .replace(/RELEASE_YEAR/g, version)
    .replace(/COVER_IMAGE_URL/g, cover);

  const toolFolder = path.join(TOOLS_DIR, tool.slug);
  if (!fs.existsSync(toolFolder)) fs.mkdirSync(toolFolder, { recursive: true });

  const htmlPath = path.join(toolFolder, "index.html");
  if (!fs.existsSync(htmlPath) || fs.readFileSync(htmlPath, "utf8") !== html) {
    fs.writeFileSync(htmlPath, html);
    console.log("Updated:", tool.name);
  }

  return cover; // return the final image for tools.json
}

// --- Fetch GitHub repos for one page ---
async function fetchRepos(query, page = 1) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20&page=${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "zag-archive-bot" } });
  const data = await res.json();
  return data.items || [];
}

async function run() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  let tools = loadTools();

  for (const query of GITHUB_SEARCH) {
    let page = 1;
    while (true) {
      const repos = await fetchRepos(query, page);
      if (!repos.length) break;

      for (const repo of repos) {
        const slug = slugify(repo.name);
        let existing = tools.find(t => t.slug === slug);

        const toolData = {
          name: repo.name,
          creator: repo.owner.login,
          description: repo.description || "Open source emulator",
          url: repo.html_url,
          version: "...",
          slug: slug,
          avatar: repo.owner.avatar_url
        };

        // Generate HTML and get final image
        toolData.cover = await generatePage(toolData, template);

        if (existing) {
          Object.assign(existing, toolData);
        } else {
          tools.push(toolData);
          console.log("Added:", toolData.name);
        }
      }

      page++;
    }
  }

  saveTools(tools);
  console.log("All emulators processed.");
}

run();
