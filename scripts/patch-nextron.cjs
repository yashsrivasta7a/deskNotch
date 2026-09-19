const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'node_modules', 'nextron', 'bin', 'nextron.cjs')
if (!fs.existsSync(file)) {
  process.exit(0)
}

let s = fs.readFileSync(file, 'utf8')

// Helper to kill process tree on Windows
const killHelperDef = `K=(p)=>{if(!p)return;if(process.platform==='win32'&&p.pid){try{require('child_process').execSync('taskkill /F /T /PID '+p.pid,{stdio:'ignore'})}catch(e){}}else{try{p.kill('SIGTERM')}catch(e){}}},`

// 1. Add K helper to declarations
if (!s.includes('K=(p)=>')) {
  s = s.replace('a=!0,o,s,c,l,', 'a=!0,o,s,c,l,' + killHelperDef)
}

// 2. Patch f() to ensure K(c) is called before starting new one
if (!s.includes('f=()=>{K(c);')) {
  s = s.replace('f=()=>{', 'f=()=>{K(c);')
}

// 3. Patch m() cleanup to kill tree of c and l
if (s.includes('c&&c.kill(),l&&l.kill()')) {
  s = s.replace('c&&c.kill(),l&&l.kill()', 'K(c),K(l)')
}

// 4. Patch watch callback to use K(c) instead of c.kill()
if (s.includes('!a&&c&&c.kill()')) {
  s = s.replace('!a&&c&&c.kill()', '!a&&K(c)')
}

fs.writeFileSync(file, s, 'utf8')
console.log('[deskNotch] Successfully patched nextron.cjs with process tree killer')
