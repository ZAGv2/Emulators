const fs = require("fs")
const path = require("path")
const https = require("https")

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

// Console/platform mapping
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

function detectConsole(name) {
  const lower = name.toLowerCase()
  for (const key in consoleMap) {
    if (lower.includes(key)) return consoleMap[key]
  }
  return "Multi Platform"
}

// Base search queries
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
  "android emulator","ios emulator" , "emulation" , 
  "emulator" , "console-emulation" , "retro-emulation" , 
  "emulator fork:true" , 
]

// Alphabet expansion
"abcdefghijklmnopqrstuvwxyz".split("").forEach(letter => {
  queries.push(`emulator ${letter}`)
  queries.push(`console emulator ${letter}`)
  queries.push(`retro emulator ${letter}`)
})

function slugify(text){
  return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")
}

// Get custom logo
function getLogo(slug) {
  const logoExtensions = ["jpg","jpeg","png","webp","gif"]
  for (const ext of logoExtensions) {
    const logoPath = path.join(LOGOS_DIR, `${slug}.${ext}`)
    if (fs.existsSync(logoPath)) return path.relative(TOOLS_DIR, logoPath)
  }
  return "logos/Default-cover.jpg"
}

// Create/update HTML page for tool
function createToolPage(tool){
  const consoleFolder = tool.console ? tool.console.toLowerCase().replace(/[^a-z0-9]+/g,"-") : "multi-platform"
  const folder = path.join(TOOLS_DIR, consoleFolder, tool.slug)
  if(!fs.existsSync(folder)) fs.mkdirSync(folder,{recursive:true})

  const htmlPath = path.join(folder,"index.html")
  const coverImage = tool.cover || getLogo(tool.slug)

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
.site-title span{margin-left:5px;}
nav{display:flex;align-items:center;flex-wrap:wrap;}
nav a{margin-left:25px;text-decoration:none;color:#333;font-weight:500;transition:0.2s;}
nav a:hover{color:#1e90ff;}
.dropdown{position:relative;display:inline-block;}
.dropbtn{margin-left:25px;font-weight:500;background:none;border:none;cursor:pointer;color:#333;font-size:16px;}
.dropdown-content{display:none;position:absolute;background:#fff;min-width:180px;box-shadow:0 6px 12px rgba(0,0,0,0.1);border-radius:6px;overflow:hidden;top:38px;z-index:200;}
.dropdown-content a{display:block;padding:10px 15px;text-decoration:none;color:#333;font-weight:500;}
.dropdown-content a:hover{background:#f0f2f5;color:#1e90ff;}
.container{max-width:1100px;margin:40px auto;padding:0 20px;}
.game-header{display:flex;gap:40px;flex-wrap:wrap;align-items:flex-start;}
.game-cover img{width:100%;max-width:320px;border-radius:12px;box-shadow:0 6px 12px rgba(0,0,0,0.1);}
.game-info{flex:1;min-width:260px;}
.game-info h1{margin-top:0;color:#1e90ff;font-size:28px;}
.meta p{margin:6px 0;font-size:15px;}
.description{margin-top:15px;line-height:1.6;color:#444;}
.download-btn{display:inline-block;margin-top:15px;padding:6px 14px;font-size:14px;background:#1e90ff;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;transition:0.3s;}
.download-btn:hover{background:#187bcd;}
footer{margin-top:60px;padding:25px;text-align:center;background:#fff;border-top:1px solid #ddd;color:#555;font-size:14px;}
@media(max-width:768px){header{flex-direction:row;padding:15px 20px;}nav{flex-wrap:wrap;}nav a,.dropbtn{margin-left:0;margin-right:15px;margin-bottom:8px;}.game-header{flex-direction:column;align-items:center;}.game-cover img{max-width:100%;}.game-info h1{text-align:center;font-size:22px;}.meta,.description{text-align:center;}.download-btn{display:block;width:100%;text-align:center;}}
</style>
</head>
<body>
<header>
<div class="site-title">ZAG <span>Archive</span></div>
<nav>
<a href="https://zagv2.github.io/ZAGArchive-/">Home</a>
<a href="https://zagv2.github.io/ZAGArchive-/about.html">About</a>
<a href="https://zagv2.github.io/ZAGArchive-/contact.html">Contact</a>
<div class="dropdown">
<button class="dropbtn">Sections ▼</button>
<div class="dropdown-content">
<a href="https://zagv2.github.io/Homebrew-Games/">Homebrew Games</a>
<a href="https://zagv2.github.io/romhacks-patches/">ROM Hacks & Patches</a>
<a href="https://zagv2.github.io/resources-tools/">Resources & Tools</a>
</div>
</div>
<a class="download-btn" href="https://zagv2.github.io/Emulators/">← Back to Emulators</a>
</nav>
</header>

<div class="container">
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
<div class="description">
${tool.description || "..."}
</div>
<a class="download-btn" href="${tool.url}" target="_blank">Visit Official Page</a>
</div>
</div>
</div>

<footer>© 2026 ZAG Archive - Emulators</footer>

<script>
const btn=document.querySelector('.dropbtn');
const dropdown=document.querySelector('.dropdown-content');
btn.addEventListener('click',e=>{e.preventDefault();dropdown.style.display=(dropdown.style.display==="block")?"none":"block";});
window.addEventListener('click',e=>{if(!btn.contains(e.target)&&!dropdown.contains(e.target)){dropdown.style.display="none";}});
</script>
</body>
</html>
`

  fs.writeFileSync(htmlPath, html)
}

// --- Fetch GitHub without node-fetch ---
function fetchPage(query, page) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20&page=${page}`
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node.js' } }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { const json = JSON.parse(data); resolve(json.items || []) } 
        catch (err) { resolve([]) }
      })
    }).on('error', err => reject(err))
  })
}

// --- Main ---
async function run() {
  for (const query of queries) {
    let page = 1
    while (true) {
      const repos = await fetchPage(query, page)
      if (!repos.length) break

      for (const repo of repos) {
        if (seen.has(repo.html_url)) continue
        seen.add(repo.html_url)

        const slug = slugify(repo.name)
        const cover = repo.owner.avatar_url || getLogo(slug)

        const tool = {
          name: repo.name,
          slug,
          creator: repo.owner.login,
          version: "...",
          console: detectConsole(repo.name),
          url: repo.html_url,
          cover,
          description: repo.description || "..."
        }

        // Check if tool already exists
        const existingIndex = tools.findIndex(t => t.url === tool.url)
        if (existingIndex > -1) {
          tools[existingIndex] = tool // update data
        } else {
          tools.push(tool)
        }

        createToolPage(tool)
      }
      page++
    }
  }

  // Self-healing / regenerate all pages
  tools.forEach(tool => {
    tool.console = detectConsole(tool.name)
    createToolPage(tool)
  })

  fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2))
  console.log("Total emulators:", tools.length)
}

run()
