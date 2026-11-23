// A team's dependency policy, checked by a CI job Darwin's validation cannot run (macOS): each module named in
// dependency-policy.json must stay below its ceiling. It lets the fixture show Darwin's CI repair: a proposal Darwin
// validated on Linux that the repository's own CI then fails, where the base branch passes.
import { readFileSync } from 'node:fs'

const policy = JSON.parse(readFileSync(new URL('./dependency-policy.json', import.meta.url), 'utf8'))
const goMod = readFileSync('go.mod', 'utf8')
const declared = Object.fromEntries([...goMod.matchAll(/^\s*(?:require\s+)?([a-z0-9.\-_/]+\.[a-z]+\/[^\s]+)\s+(v\d+\.\d+\.\d+)/gmu)].map(m => [m[1], m[2]]))
const parse = version => version.slice(1).split('.').map(Number)
const below = (a, b) => { const [x, y] = [parse(a), parse(b)]; for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i]; return false }
const breaches = Object.entries(policy).filter(([module, rule]) => declared[module] !== undefined && !below(declared[module], rule.below))
for (const [module, rule] of breaches) console.log(`::error::${module} ${declared[module]} is not below ${rule.below}, the ceiling in .github/fixture/dependency-policy.json: ${rule.why}`)
console.log(breaches.length === 0 ? 'dependency policy: every module is within its ceiling' : `dependency policy: ${breaches.length} module(s) above their ceiling`)
process.exitCode = breaches.length === 0 ? 0 : 1
