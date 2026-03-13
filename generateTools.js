const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");
const LOGOS_DIR = path.join(TOOLS_DIR, "logos");
const DEFAULT_IMAGE = "../Default-cover.jpg";

const GITHUB_SEARCH = [
  "https://api.github.com/search/repositories?q=emulator&sort=stars&order=desc&per_page=20",
  "https://api.github.com/search/repositories?q=nes+emulator&sort=stars&order=desc&per_page=20",
  "https://api.github.com/search/repositories?q=snes+emulator&sort=stars&order=desc&per_page=20",
  "https://api.github.com/search/repositories?q=ps2+emulator&sort=stars&order=desc&per_page=20",
  "https://api.github.com/search/repositories?q=gameboy+emulator&sort=stars&order=desc&per_page=20"
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

// --- Determine the best image for a tool ---
function getCover(tool) {
  // 1️⃣ Local logo
  const localPath = path.join(LOGOS_DIR, tool.slug + ".jpg");
  if (fs.existsSync(localPath)) return `../logos/${tool.slug}.jpg`;

  // 2️⃣ GitHub repo/project avatar
  if (tool.avatar) return tool.avatar;

  // 3️⃣ GitHub owner avatar
  if (tool.ownerAvatar) return tool.ownerAvatar;

  // 4️⃣ Default placeholder
  return DEFAULT_IMAGE;
}

// --- Generate individual HTML page for a tool ---
async function generatePage(tool, template) {
  const cover = getCover(tool);
  const version = tool.version || "...";

  let html = template
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
}

// --- Fetch repos from GitHub ---
async function fetchRepos(url) {
  const res = await fetch(url, { headers: { "User-Agent": "zag-archive-bot" } });
  const data = await res.json();
  return data.items || [];
}

async function run() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  let tools = loadTools();

  for (const url of GITHUB_SEARCH) {
    const repos = await fetchRepos(url);
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
        avatar: repo.owner.avatar_url,       // repo owner avatar
        ownerAvatar: repo.owner.avatar_url    // fallback
      };

      if (existing) Object.assign(existing, toolData);
      else {
        tools.push(toolData);
        console.log("Added:", toolData.name);
      }

      await generatePage(toolData, template);
    }
  }

  saveTools(tools);
  console.log("All emulators processed.");
}

run();
