const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");
const LOGOS_DIR = path.join(TOOLS_DIR, "logos");

const DEFAULT_IMAGE = "../logos/Default-cover.jpg";

// Legal sources to pull emulators from
const SOURCES = [
  "https://api.github.com/search/repositories?q=emulator&sort=stars&order=desc&per_page=20"
  // You can expand here with other public APIs that allow scraping
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

// Fetch repositories from GitHub
async function fetchRepos(url, page = 1) {
  const res = await fetch(`${url}&page=${page}`, {
    headers: { "User-Agent": "zag-archive-bot" },
  });
  const data = await res.json();
  return data.items || [];
}

// Determine the image URL
async function getImage(tool) {
  // Use local image if exists
  const localPath = path.join(LOGOS_DIR, tool.slug + ".jpg");
  if (fs.existsSync(localPath)) return `../logos/${tool.slug}.jpg`;

  // Use GitHub avatar
  if (tool.avatar) return tool.avatar;

  // Default placeholder
  return DEFAULT_IMAGE;
}

// Generate HTML page per emulator/tool
async function generatePage(tool, template) {
  const image = await getImage(tool);
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

// Main run function
async function run() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  let tools = loadTools();

  for (const url of SOURCES) {
    let page = 1;
    while (true) {
      const repos = await fetchRepos(url, page);
      if (!repos.length) break;

      for (const repo of repos) {
        const slug = slugify(repo.name);
        let existing = tools.find((t) => t.slug === slug);

        const toolData = {
          name: repo.name,
          creator: repo.owner.login,
          description: repo.description || "Open source emulator",
          url: repo.html_url,
          homepage: repo.homepage || null,
          version: "...",
          avatar: repo.owner.avatar_url,
          slug: slug,
        };

        if (existing) Object.assign(existing, toolData);
        else {
          tools.push(toolData);
          console.log("Added:", toolData.name);
        }

        await generatePage(toolData, template);
      }

      page++;
    }
  }

  saveTools(tools);
  console.log("All emulators processed.");
}

run();
