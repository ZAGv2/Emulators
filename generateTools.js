const fs = require("fs")
const path = require("path")

const TOOLS_FILE = "tools.json"
const TOOLS_DIR = "tools"
const LOGOS_DIR = path.join(TOOLS_DIR, "logos")

let tools = []
let seen = new Set()

// Load existing tools
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
  "emulator","console emulator","retro emulator","open source emulator","hardware emulator",
  "nes emulator","snes emulator","n64 emulator",
  "gameboy emulator","gba emulator","gbc emulator",
  "nds emulator","3ds emulator",
  "ps1 emulator","ps2 emulator","ps3 emulator",
  "psp emulator","psvita emulator",
  "switch emulator",
  "xbox emulator","xbox 360 emulator",
  "dreamcast emulator","saturn emulator",
  "mame emulator","arcade emulator",
  "dos emulator","windows emulator","linux emulator",
  "android emulator","ios emulator"
]

// Alphabet expansion
const alphabet = "abcdefghijklmnopqrstuvwxyz".split("")
alphabet.forEach(letter=>{
  queries.push(`emulator ${letter}`)
  queries.push(`console emulator ${letter}`)
  queries.push(`retro emulator ${letter}`)
})

function slugify(text){
  return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")
}

// --- Recursively get image link from repo, optimized for common filenames ---
async function getRepoImage(owner, repo, pathInRepo = "") {
  const imageExtensions = ["jpg","jpeg","png","gif","webp"]
  const priorityFiles = ["cover", "screenshot", "logo"]

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${pathInRepo}`
    const res = await fetch(url)
    const files = await res.json()
    if (!Array.isArray(files)) return null

    // 1️⃣ Check priority filenames first
    for (const file of files) {
      if (file.type === "file") {
        const lowerName = file.name.toLowerCase()
        if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
          for (const prefix of priorityFiles) {
            if (lowerName.startsWith(prefix)) return file.download_url
          }
        }
      }
    }

    // 2️⃣ If none of the priority files, check all images recursively
    for (const file of files) {
      if (file.type === "file") {
        const lowerName = file.name.toLowerCase()
        if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
          return file.download_url
        }
      } else if (file.type === "dir") {
        const nested = await getRepoImage(owner, repo, file.path)
        if (nested) return nested
      }
    }
  } catch(e) {
    console.log(`Failed to fetch images for ${owner}/${repo}:`, e.message)
  }

  return null
}

// Get logo for HTML page
function getLogo(slug, repoImage) {
  if (repoImage) return repoImage

  const logoExtensions = ["jpg","jpeg","png","webp","gif"]
  for (const ext of logoExtensions) {
    const logoPath = path.join(LOGOS_DIR, `${slug}.${ext}`)
    if (fs.existsSync(logoPath)) return path.relative(TOOLS_DIR, logoPath)
  }

  return "logos/Default-cover.jpg"
}

// Create tool page
function createToolPage(tool){
  const consoleFolder = tool.console ? tool.console.toLowerCase().replace(/[^a-z0-9]+/g,"-") : "multi-platform"
  const folder = path.join(TOOLS_DIR, consoleFolder, tool.slug)
  if(!fs.existsSync(folder)) fs.mkdirSync(folder,{recursive:true})

  const htmlPath = path.join(folder,"index.html")
  
  const coverImage = getLogo(tool.slug, tool.repoImage)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tool.name} - ZAG Archive</title>
<style>
body{margin:0;font-family:'Segoe UI',sans-serif;background:#f0f2f5;color:#222;}
header{background:#fff;padding:15px 40px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 6px rgba(0,0,0,0.1);position:sticky;top:0;z-index:100;flex-wrap:wrap;}
.site-title{font-weight:700;font-size:20px;color:#1e90ff;text-transform:uppercase;}
nav{display:flex;align-items:center;flex-wrap:wrap;}
nav a{margin-left:25px;text-decoration:none;color:#333;font-weight:600;transition:0.2s;}
nav a:hover{color:#1e90ff;}
.container{max-width:1100px;margin:40px auto;padding:0 20px;}
.game-header{display:flex;gap:40px;flex-wrap:wrap;align-items:flex-start;}
.game-cover img{width:100%;max-width:320px;border-radius:12px;box-shadow:0 6px 12px rgba(0,0,0,0.1);}
.game-info{flex:1;min-width:260px;}
.game-info h1{margin-top:0;color:#1e90ff;font-size:28px;}
.meta p{margin:6px 0;font-size:15px;}
.download-btn{display:inline-block;margin-top:15px;padding:10px 18px;background:#1e90ff;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;transition:0.3s;}
.download-btn:hover{background:#187bcd;}
footer{margin-top:60px;padding:25px;text-align:center;background:#fff;border-top:1px solid #ddd;color:#555;font-size:14px;}
@media(max-width:768px){
.game-header{flex-direction:column;align-items:center;}
.game-cover img{max-width:100%;}
.game-info h1{text-align:center;font-size:22px;}
.meta{text-align:center;}
.download-btn{display:block;width:100%;text-align:center;}
}
</style>
</head>
<body>
<header>
<div class="site-title">ZAG Archive</div>
</header>
<div class="container">
<a class="download-btn" href="../../..">← Back</a>
<div class="game-header">
<div class="game-cover">
<img src="${coverImage}" alt="${tool.name} Cover">
</div>
<div class="game-info">
<h1>${tool.name}</h1>
<div class="meta">
<p><strong>Platform:</strong> ${tool.console || "Multi Platform"}</p>
<p><strong>Developer:</strong> ${tool.creator}</p>
<p><strong>Version:</strong> ${tool.version || "..."}</p>
</div>
<p>${tool.description || "No description available."}</p>
<a class="download-btn" href="${tool.url}" target="_blank">Visit Official Page</a>
</div>
</div>
</div>
<footer>© 2026 ZAG Archive - Emulators</footer>
</body>
</html>
`
  fs.writeFileSync(htmlPath,html)
}

// --- Fetch GitHub ---
async function fetchPage(query,page){
  const url=`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20&page=${page}`
  const res = await fetch(url)
  const data = await res.json()
  return data.items || []
}

// --- Main ---
async function run(){
  for(const query of queries){
    let page=1
    while(true){
      const repos = await fetchPage(query,page)
      if(!repos.length) break

      for(const repo of repos){
        if(seen.has(repo.html_url)) continue
        seen.add(repo.html_url)

        const slug = slugify(repo.name)
        const repoImage = await getRepoImage(repo.owner.login, repo.name)

        const tool = {
          name: repo.name,
          slug: slug,
          creator: repo.owner.login,
          version: "...",
          console: detectConsole(repo.name),
          url: repo.html_url,
          repoImage: repoImage, // Only the link
          description: repo.description // GitHub repo description
        }

        tools.push(tool)
        createToolPage(tool)
      }

      page++
    }
  }

  // --- Self-healing and rebuild ---
  tools.forEach(tool=>{
    tool.console = detectConsole(tool.name)
    createToolPage(tool)
  })

  fs.writeFileSync(TOOLS_FILE,JSON.stringify(tools,null,2))
  console.log("Total emulators:",tools.length)
}

run()
