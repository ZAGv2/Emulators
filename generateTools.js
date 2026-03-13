const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch"); // npm install node-fetch@2

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");

// GitHub, GitLab, and SourceForge search URLs
const SOURCES = {
  github: [
    "https://api.github.com/search/repositories?q=emulator&sort=stars&order=desc&per_page=20",
    "https://api.github.com/search/repositories?q=nes+emulator&sort=stars&order=desc&per_page=20"
  ],
  gitlab: [
    "https://gitlab.com/api/v4/projects?search=emulator&per_page=20"
  ],
  sourceforge: [
    "https://sourceforge.net/rest/p/emulator/projects?limit=20"
  ]
};

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

function generatePage(tool, template) {
  let html = template
    .replace(/GAME_TITLE/g, tool.name)
    .replace(/CREATOR_NAME/g, tool.creator)
    .replace(/GAME_DESCRIPTION/g, tool.description)
    .replace(/GAME_ZIP_LINK/g, tool.url)
    .replace(/CONSOLE_NAME/g, "Multi Platform")
    .replace(/RELEASE_YEAR/g, tool.year);

  const toolFolder = path.join(TOOLS_DIR, tool.slug);
  if (!fs.existsSync(toolFolder)) fs.mkdirSync(toolFolder, { recursive: true });

  fs.writeFileSync(path.join(toolFolder, "index.html"), html);
}

// Fetch GitHub
async function fetchGitHub(url) {
  const res = await fetch(url, { headers: { "User-Agent": "zag-bot" } });
  const data = await res.json();
  return (data.items || []).map(repo => ({
    name: repo.name,
    creator: repo.owner.login,
    description: repo.description || "Open source emulator",
    url: repo.html_url,
    year: repo.created_at.split("-")[0],
    slug: slugify(repo.name)
  }));
}

// Fetch GitLab
async function fetchGitLab(url) {
  const res = await fetch(url);
  const data = await res.json();
  return (data || []).map(repo => ({
    name: repo.name,
    creator: repo.namespace?.name || repo.owner?.name || "Unknown",
    description: repo.description || "Open source emulator",
    url: repo.web_url,
    year: repo.created_at?.split("-")[0] || "Unknown",
    slug: slugify(repo.name)
  }));
}

// Fetch SourceForge
async function fetchSourceForge(url) {
  const res = await fetch(url);
  const data = await res.json();
  return (data.projects || []).map(proj => ({
    name: proj.name,
    creator: proj.user_name || "Unknown",
    description: proj.summary || "Open source emulator",
    url: `https://sourceforge.net/projects/${proj.name}/`,
    year: proj.creation_date?.split("-")[0] || "Unknown",
    slug: slugify(proj.name)
  }));
}

async function run() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  let tools = loadTools();

  // Fetch all sources
  let allTools = [];

  for (let url of SOURCES.github) allTools.push(...await fetchGitHub(url));
  for (let url of SOURCES.gitlab) allTools.push(...await fetchGitLab(url));
  for (let url of SOURCES.sourceforge) allTools.push(...await fetchSourceForge(url));

  // Merge and update
  for (let tool of allTools) {
    const existing = tools.find(t => t.slug === tool.slug);
    if (existing) {
      // If anything changed, update
      if (existing.name !== tool.name || existing.creator !== tool.creator || existing.description !== tool.description || existing.url !== tool.url || existing.year !== tool.year) {
        generatePage(tool, template);
        Object.assign(existing, tool);
        console.log("Updated:", tool.name);
      }
    } else {
      tools.push(tool);
      generatePage(tool, template);
      console.log("Added:", tool.name);
    }
  }

  saveTools(tools);
  console.log("All done! Total tools:", tools.length);
}

run();
