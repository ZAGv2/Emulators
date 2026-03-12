const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const TOOLS_JSON = path.join(__dirname, "tools.json");
const TOOLS_DIR = path.join(__dirname, "tools");

const GITHUB_SEARCH = [
"https://api.github.com/search/repositories?q=emulator&sort=stars&order=desc&per_page=20",
"https://api.github.com/search/repositories?q=nes+emulator&sort=stars&order=desc&per_page=20",
"https://api.github.com/search/repositories?q=snes+emulator&sort=stars&order=desc&per_page=20",
"https://api.github.com/search/repositories?q=ps2+emulator&sort=stars&order=desc&per_page=20",
"https://api.github.com/search/repositories?q=gameboy+emulator&sort=stars&order=desc&per_page=20"
];

function slugify(text) {
return text
.toLowerCase()
.replace(/[^a-z0-9]+/g, "-")
.replace(/(^-|-$)/g, "");
}

function loadTools() {

if (!fs.existsSync(TOOLS_JSON)) {
return [];
}

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

if (!fs.existsSync(toolFolder)) {
fs.mkdirSync(toolFolder, { recursive: true });
}

fs.writeFileSync(path.join(toolFolder, "index.html"), html);

}

async function fetchRepos(url) {

const res = await fetch(url, {
headers: { "User-Agent": "zag-bot" }
});

const data = await res.json();

if (!data.items) return [];

return data.items;

}

async function run() {

if (!fs.existsSync(TOOLS_DIR)) {
fs.mkdirSync(TOOLS_DIR);
}

const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

let tools = loadTools();

for (let url of GITHUB_SEARCH) {

const repos = await fetchRepos(url);

for (let repo of repos) {

const slug = slugify(repo.name);

if (tools.find(t => t.slug === slug)) {
continue;
}

const tool = {
name: repo.name,
creator: repo.owner.login,
description: repo.description || "Open source emulator",
url: repo.html_url,
year: repo.created_at.split("-")[0],
slug: slug
};

tools.push(tool);

generatePage(tool, template);

console.log("Added:", tool.name);

}

}

saveTools(tools);

}

run();