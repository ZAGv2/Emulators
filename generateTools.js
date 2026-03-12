const fs = require("fs");
const path = require("path");

const toolsFile = "tools.json";
const templateFile = "template.html";
const toolsDir = "tools";

const sources = [
"https://api.github.com/search/repositories?q=emulator&sort=stars&per_page=20",
"https://api.github.com/search/repositories?q=nes+emulator&sort=stars&per_page=20",
"https://api.github.com/search/repositories?q=snes+emulator&sort=stars&per_page=20",
"https://api.github.com/search/repositories?q=ps2+emulator&sort=stars&per_page=20",
"https://api.github.com/search/repositories?q=retro+emulator&sort=stars&per_page=20"
];

async function fetchRepos() {

let results = [];

for (let url of sources) {

const res = await fetch(url, {
headers: { "User-Agent": "zag-bot" }
});

const data = await res.json();

if (data.items) {
results.push(...data.items);
}

}

return results;

}

function loadTools() {

if (!fs.existsSync(toolsFile)) return [];

return JSON.parse(fs.readFileSync(toolsFile));

}

function saveTools(tools) {

fs.writeFileSync(toolsFile, JSON.stringify(tools, null, 2));

}

function generatePage(tool, template) {

let page = template
.replace(/GAME_TITLE/g, tool.name)
.replace(/CREATOR_NAME/g, tool.creator)
.replace(/GAME_DESCRIPTION/g, tool.description)
.replace(/GAME_ZIP_LINK/g, tool.url)
.replace(/CONSOLE_NAME/g, "Multi Platform")
.replace(/RELEASE_YEAR/g, tool.year);

const folder = path.join(toolsDir, tool.slug);

if (!fs.existsSync(folder)) {
fs.mkdirSync(folder, { recursive: true });
}

fs.writeFileSync(path.join(folder, "index.html"), page);

}

function slugify(name) {
return name.toLowerCase().replace(/[^a-z0-9]/g,"-");
}

async function run() {

const template = fs.readFileSync(templateFile, "utf8");

let tools = loadTools();

let repos = await fetchRepos();

for (let repo of repos) {

const slug = slugify(repo.name);

if (tools.find(t => t.slug === slug)) continue;

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

saveTools(tools);

}

run();