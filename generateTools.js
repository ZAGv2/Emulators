const fs = require("fs")
const path = require("path")

const TOOLS_FILE = "tools.json"
const TOOLS_DIR = "tools"

let tools = []
let seen = new Set()

// load existing tools
if (fs.existsSync(TOOLS_FILE)) {
  tools = JSON.parse(fs.readFileSync(TOOLS_FILE))
  tools.forEach(t => seen.add(t.url))
}

// --- Console/platform detection map ---
const consoleMap = {
  "nes": "Nintendo Entertainment System",
  "snes": "Super Nintendo",
  "n64": "Nintendo 64",
  "gameboy": "Game Boy",
  "gba": "Game Boy Advance",
  "gbc": "Game Boy Color",
  "nds": "Nintendo DS",
  "3ds": "Nintendo 3DS",
  "switch": "Nintendo Switch",
  "ps1": "PlayStation",
  "ps2": "PlayStation 2",
  "ps3": "PlayStation 3",
  "psp": "PlayStation Portable",
  "psvita": "PlayStation Vita",
  "xbox": "Xbox",
  "xbox 360": "Xbox 360",
  "dreamcast": "Sega Dreamcast",
  "saturn": "Sega Saturn",
  "genesis": "Sega Genesis",
  "mame": "Arcade",
  "arcade": "Arcade",
  "dos": "DOS",
  "windows": "Windows",
  "linux": "Linux",
  "android": "Android",
  "ios": "iOS"
}

// Detect platform from repo name
function detectConsole(name) {
  const lower = name.toLowerCase()
  for (const key in consoleMap) {
    if (lower.includes(key)) return consoleMap[key]
  }
  return "Multi Platform"
}

// --- Base queries ---
const queries = [
  "emulator", "console emulator", "retro emulator", "open source emulator", "hardware emulator",
  "nes emulator", "snes emulator", "n64 emulator",
  "gameboy emulator", "gba emulator", "gbc emulator",
  "nds emulator", "3ds emulator",
  "ps1 emulator", "ps2 emulator", "ps3 emulator",
  "psp emulator", "psvita emulator",
  "switch emulator",
  "xbox emulator", "xbox 360 emulator",
  "dreamcast emulator", "saturn emulator",
  "mame emulator", "arcade emulator",
  "dos emulator", "windows emulator", "linux emulator",
  "android emulator", "ios emulator"
]

// Alphabet expansion to discover more emulators
const alphabet = "abcdefghijklmnopqrstuvwxyz".split("")
alphabet.forEach(letter => {
  queries.push(`emulator ${letter}`)
  queries.push(`console emulator ${letter}`)
  queries.push(`retro emulator ${letter}`)
})

// --- Helpers ---
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")
}

// Create tool page and folder if missing
function createToolPage(tool) {
  const folder = path.join(TOOLS_DIR, tool.slug)
  if (!fs.existsSync(folder)) fs.mkdirSync(folder,{recursive:true})

  const htmlPath = path.join(folder,"index.html")
  if (fs.existsSync(htmlPath)) return // skip if page exists

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${tool.name}</title>
</head>
<body>
<h1>${tool.name}</h1>
<img src="${tool.cover}" width="120">
<p>Developer: ${tool.creator}</p>
<p>Platform: ${tool.console}</p>
<p><a href="${tool.url}" target="_blank">Official Repository</a></p>
</body>
</html>
`
  fs.writeFileSync(htmlPath,html)
}

// Fetch GitHub repos
async function fetchPage(query,page) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20&page=${page}`
  const res = await fetch(url)
  const data = await res.json()
  return data.items || []
}

// --- Main crawler ---
async function run() {
  for (const query of queries) {
    let page = 1
    while(true) {
      const repos = await fetchPage(query,page)
      if (!repos.length) break

      for (const repo of repos) {
        if (seen.has(repo.html_url)) continue
        seen.add(repo.html_url)

        const slug = slugify(repo.name)
        const tool = {
          name: repo.name,
          slug: slug,
          creator: repo.owner.login,
          version: "...",
          console: detectConsole(repo.name),
          url: repo.html_url,
          cover: repo.owner.avatar_url
        }

        tools.push(tool)
        createToolPage(tool)
      }

      page++
    }
  }

  // --- Self-healing: rebuild missing pages ---
  tools.forEach(tool => createToolPage(tool))

  fs.writeFileSync(TOOLS_FILE,JSON.stringify(tools,null,2))
  console.log("Total emulators:",tools.length)
}

run()
