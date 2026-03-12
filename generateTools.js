const fs = require("fs");
const path = require("path");
const axios = require("axios");

const TEMPLATE = fs.readFileSync("template.html", "utf8");
const TOOLS_DIR = "tools";
const INDEX_FILE = "index.html";
const LOG_FILE = "tools_log.json";

const GITHUB_SEARCH =
  "https://api.github.com/search/repositories?q=emulator&sort=stars&order=desc&per_page=20";

async function getRepos() {
  try {
    const res = await axios.get(GITHUB_SEARCH, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    return res.data.items.map(repo => ({
      name: repo.name,
      description: repo.description || "No description available",
      platform: "Multiple Platforms",
      creator: repo.owner.login,
      year: new Date(repo.created_at).getFullYear(),
      link: repo.html_url,
      image: repo.owner.avatar_url
    }));
  } catch (err) {
    console.error("GitHub search failed:", err.message);
    return [];
  }
}

function generateToolPage(tool) {
  const folder = `${TOOLS_DIR}/${tool.name.replace(/\s/g, "_")}`;
  fs.mkdirSync(folder, { recursive: true });

  let page = TEMPLATE
    .replace(/GAME_TITLE/g, tool.name)
    .replace(/CONSOLE_NAME/g, tool.platform)
    .replace(/CREATOR_NAME/g, tool.creator)
    .replace(/RELEASE_YEAR/g, tool.year)
    .replace(/GAME_DESCRIPTION/g, tool.description)
    .replace(/GAME_ZIP_LINK/g, tool.link)
    .replace(/TOOL_IMAGE/g, tool.image);

  fs.writeFileSync(`${folder}/index.html`, page);
}

function generateIndex(tools) {
  let rows = "";

  tools.forEach(tool => {
    const folder = tool.name.replace(/\s/g, "_");

    rows += `
<tr>
<td><img src="${tool.image}" width="50"></td>
<td><a href="tools/${folder}/index.html" style="color:#1e90ff;">${tool.name}</a></td>
<td>${tool.platform}</td>
<td>${tool.creator}</td>
<td>${tool.year}</td>
</tr>`;
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Emulators</title>
<style>
body{font-family:Segoe UI;background:#f0f2f5;padding:40px}
table{width:100%;border-collapse:collapse;background:#fff}
th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}
th{color:#1e90ff}
</style>
</head>
<body>

<h1>Emulators</h1>

<table>
<tr>
<th>Icon</th>
<th>Name</th>
<th>Platform</th>
<th>Creator</th>
<th>Year</th>
</tr>

${rows}

</table>

</body>
</html>
`;

  fs.writeFileSync(INDEX_FILE, html);
}

(async () => {
  const tools = await getRepos();

  if (!tools.length) {
    console.log("No tools found.");
    return;
  }

  fs.mkdirSync(TOOLS_DIR, { recursive: true });

  tools.forEach(generateToolPage);
  generateIndex(tools);

  fs.writeFileSync(LOG_FILE, JSON.stringify(tools, null, 2));

  console.log(`Generated ${tools.length} tools.`);
})();