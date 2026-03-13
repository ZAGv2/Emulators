// generateTools.js
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");
const LOGOS_DIR = path.join(TOOLS_DIR, "logos");

// GitHub repositories to check for emulators
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

// Load existing tools
function loadTools() {
  if (!fs.existsSync(TOOLS_JSON)) return [];
  return JSON.parse(fs.readFileSync(TOOLS_JSON));
}

// Save tools to JSON
function saveTools(data) {
  fs.writeFileSync(TOOLS_JSON, JSON.stringify(data, null, 2));
}

// Fetch README images from GitHub
async function getReadmeScreenshots(repoFullName) {
  try {
    const url = `https://api.github.com/repos/${repoFullName}/readme`;
    const res = await fetch(url, {
      headers: { "User-Agent": "zag-archive-bot", Accept: "application/vnd.github.v3.raw" }
    });
    if (res.status !== 200) return [];
    const text = await res.text();

    // Markdown images ![alt](url)
    const mdImgs = [...text.matchAll(/!\[.*?\]\((.*?)\)/g)].map(m => m[1]);

    // HTML images <img src="url">
    const $ = cheerio.load(text);
    const htmlImgs = $("img").map((i, el) => $(el).attr("src")).get();

    return [...new Set([...mdImgs, ...htmlImgs])]; // remove duplicates
  } catch (e) {
    return [];
  }
}

// Generate HTML page for a tool
async function generatePage(tool, template) {
  let screenshotsHtml = "";
  if (tool.repoFullName) {
    const screenshots = await getReadmeScreenshots(tool.repoFullName);
    screenshotsHtml = screenshots.slice(0, 3).map(url =>
      `<img src="${url}" alt="${tool.name} Screenshot">`
    ).join("\n");
  }

  let html = template
    .replace(/GAME_TITLE/g, tool.name)
    .replace(/CREATOR_NAME/g, tool.creator)
    .replace(/GAME_DESCRIPTION/g, tool.description)
    .replace(/GAME_ZIP_LINK/g, tool.url)
    .replace(/CONSOLE_NAME/g, "Multi Platform")
    .replace(/RELEASE_YEAR/g, tool.version || "…")
    .replace("<!-- SCREENSHOTS -->", screenshotsHtml);

  const toolFolder = path.join(TOOLS_DIR, tool.slug);
  if (!fs.existsSync(toolFolder)) fs.mkdirSync(toolFolder, { recursive: true });

  fs.writeFileSync(path.join(toolFolder, "index.html"), html);
}

// Fetch GitHub repos from a search URL
async function fetchRepos(url) {
  const res = await fetch(url, { headers: { "User-Agent": "zag-archive-bot" } });
  const data = await res.json();
  return data.items || [];
}

// Main runner
async function run() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  let tools = loadTools();

  for (let url of GITHUB_SEARCH) {
    const repos = await fetchRepos(url);

    for (let repo of repos) {
      const slug = slugify(repo.name);
      const existing = tools.find(t => t.slug === slug);

      const tool = {
        name: repo.name,
        creator: repo.owner.login,
        description: repo.description || "Open source emulator",
        url: repo.html_url,
        version: "…", // default if version not available
        slug: slug,
        repoFullName: repo.full_name
      };

      if (existing) {
        // Update existing data
        Object.assign(existing, tool);
      } else {
        tools.push(tool);
      }

      await generatePage(tool, template);
      console.log("Generated:", tool.name);
    }
  }

  saveTools(tools);
  console.log("All tools processed.");
}

run();
