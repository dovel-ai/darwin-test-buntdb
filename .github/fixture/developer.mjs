// A developer's day: adds the next real dependency from the list below at an old release, with code that uses it and
// a test, as a person adding a library from an old example would. Darwin should then find the newer release and
// propose it (migrating the code when the newer release breaks it), or hold it with the reason.
//
//   node .github/fixture/developer.mjs            -> writes the code; prints {"module","version","probe","message"},
//                                                    or {} when the list is done
//   PROBE_VALUE=<v> node .github/fixture/developer.mjs -> for a "probe" entry: writes its test, pinned to <v>, the
//                                                    value the old release gives today (a behaviour a newer release
//                                                    changes without changing the API)
//
// The code goes into the root package (package buntdb), the one this repository's CI builds and tests (go build .,
// go test .): code CI never runs is code Darwin cannot validate a change against.
// The workflow runs `go get` and `go mod tidy` for it, tests, and commits with the message printed.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const GEO_PLACES = "package buntdb\n\nimport (\n\t\"fmt\"\n\n\tgeo \"github.com/dovel-ai/darwin-fixture-geo\"\n)\n\n// Places is a set of named places kept in a database, with distances and bearings between them.\ntype Places struct{ db *DB }\n\n// OpenPlaces opens an in-memory set of places.\nfunc OpenPlaces() (*Places, error) {\n\tdb, err := Open(\":memory:\")\n\tif err != nil {\n\t\treturn nil, err\n\t}\n\treturn &Places{db: db}, nil\n}\n\n// Close closes the database.\nfunc (p *Places) Close() error { return p.db.Close() }\n\n// Put stores a place written as \"lat,lon\".\nfunc (p *Places) Put(name, latlon string) error {\n\tpoint, err := geo.ParsePoint(latlon)\n\tif err != nil {\n\t\treturn fmt.Errorf(\"place %s: %w\", name, err)\n\t}\n\treturn p.db.Update(func(tx *Tx) error {\n\t\t_, _, err := tx.Set(\"place:\"+name, geo.FormatPoint(point), nil)\n\t\treturn err\n\t})\n}\n\nfunc (p *Places) place(name string) (geo.Point, error) {\n\tvar point geo.Point\n\terr := p.db.View(func(tx *Tx) error {\n\t\tvalue, err := tx.Get(\"place:\" + name)\n\t\tif err != nil {\n\t\t\treturn fmt.Errorf(\"place %s: %w\", name, err)\n\t\t}\n\t\tpoint, err = geo.Parse(value)\n\t\treturn err\n\t})\n\treturn point, err\n}\n\n// Trip is the distance in kilometres, the initial bearing in degrees and the halfway point between two places.\nfunc (p *Places) Trip(from, to string) (km, bearing float64, halfway string, err error) {\n\ta, err := p.place(from)\n\tif err != nil {\n\t\treturn 0, 0, \"\", err\n\t}\n\tb, err := p.place(to)\n\tif err != nil {\n\t\treturn 0, 0, \"\", err\n\t}\n\treturn geo.GreatCircleDistance(a, b), geo.InitialBearing(a, b), geo.FormatPoint(geo.Interpolate(a, b, 0.5)), nil\n}\n"
const GEO_PLACES_TEST = "package buntdb\n\nimport (\n\t\"math\"\n\t\"testing\"\n)\n\nfunc TestPlacesTrip(t *testing.T) {\n\tplaces, err := OpenPlaces()\n\tif err != nil {\n\t\tt.Fatal(err)\n\t}\n\tdefer places.Close()\n\tif err := places.Put(\"london\", \"51.5074,-0.1278\"); err != nil {\n\t\tt.Fatal(err)\n\t}\n\tif err := places.Put(\"paris\", \"48.8566,2.3522\"); err != nil {\n\t\tt.Fatal(err)\n\t}\n\tkm, bearing, halfway, err := places.Trip(\"london\", \"paris\")\n\tif err != nil {\n\t\tt.Fatal(err)\n\t}\n\tif math.Abs(km-343.5) > 5 {\n\t\tt.Fatalf(\"london to paris: %.1f km\", km)\n\t}\n\tif bearing < 140 || bearing > 160 {\n\t\tt.Fatalf(\"london to paris: bearing %.1f\", bearing)\n\t}\n\tif halfway == \"\" {\n\t\tt.Fatal(\"no halfway point\")\n\t}\n\tif _, _, _, err := places.Trip(\"london\", \"nowhere\"); err == nil {\n\t\tt.Fatal(\"a trip to a place never stored should fail\")\n\t}\n}\n"

const DEPENDENCIES = [
  { module: 'github.com/dovel-ai/darwin-fixture-geo', version: 'v0.5.2', files: { 'places.go': GEO_PLACES, 'places_test.go': GEO_PLACES_TEST },
    expect: ['migration'], note: 'a library that publishes a breaking release every 12 hours; this code calls ParsePoint, deprecated at v0.5.2 and removed after' },
  { module: 'github.com/google/uuid', version: 'v1.3.0', imports: ['github.com/google/uuid'], use: 'uuid.NewString()', returns: 'string', check: 'len(v) != 36', expect: ['update'] },
  { module: 'github.com/mattn/go-runewidth', version: 'v0.0.9', imports: ['fmt', 'github.com/mattn/go-runewidth'],
    use: 'fmt.Sprint(runewidth.StringWidth("\\U0001F44D\\U0001F3FD"), runewidth.StringWidth("\\U0001F468\\u200D\\U0001F469\\u200D\\U0001F467"), runewidth.StringWidth("e\\u0301"))',
    returns: 'string', probe: true, expect: ['behavior'], note: 'the test pins the widths this release gives today; newer releases measure emoji sequences differently' },
  { module: 'github.com/pkg/errors', version: 'v0.9.0', imports: ['github.com/pkg/errors'], use: 'errors.Wrap(errors.New("no key"), "get").Error()', returns: 'string', check: 'v != "get: no key"', expect: ['update'] },
  { module: 'golang.org/x/text', version: 'v0.14.0', imports: ['golang.org/x/text/cases', 'golang.org/x/text/language'], use: 'cases.Title(language.English).String("spatial index")', returns: 'string', check: 'v != "Spatial Index"', expect: ['update'], note: 'newer releases need a newer Go than go.mod states' },
  { module: 'gopkg.in/yaml.v3', version: 'v3.0.0', imports: ['gopkg.in/yaml.v3'], use: 'mustYAML(map[string]int{"keys": 2})', returns: 'string', check: 'v != "keys: 2\\n"', expect: ['update'],
    helper: 'func mustYAML(v any) string {\n\tout, err := yaml.Marshal(v)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\treturn string(out)\n}\n' },
  { module: 'github.com/dustin/go-humanize', version: 'v1.0.0', imports: ['github.com/dustin/go-humanize'], use: 'humanize.Comma(1234567)', returns: 'string', check: 'v != "1,234,567"', expect: ['update'] },
  { module: 'github.com/fatih/color', version: 'v1.10.0', imports: ['github.com/fatih/color'], use: 'color.New(color.FgGreen).Sprint("ok")', returns: 'string', check: 'v != "ok"', expect: ['update'], note: 'the team caps color below v1.17 (.github/fixture/dependency-policy.json), checked only by the macOS job Darwin cannot run: a proposal past it fails CI where the base passes, for the CI repair Darwin tries' },
]

const goMod = readFileSync('go.mod', 'utf8')
const declared = module => new RegExp(`^\\s*(require\\s+)?${module.replace(/[.]/gu, '\\.')}\\s`, 'mu').test(goMod)
const next = DEPENDENCIES.find(dep => !declared(dep.module) || (dep.probe && existsSync(probePath(dep))))
if (next === undefined) {
  process.stdout.write('{}')
  process.exit(0)
}
function nameOf(dep) { return dep.module.split('/').filter(part => !/^v\d+$/u.test(part)).at(-1).replace(/[^A-Za-z0-9]/gu, '') }
function probePath(dep) { return `extra_${nameOf(dep)}_probe_test.go` }

const message = [`fixture: add dependency ${next.module} ${next.version}`, '', ...(next.note ? [next.note, ''] : []), ...next.expect.map(item => `expect: ${item}`)].join('\n')
if (next.files !== undefined) {
  for (const [path, content] of Object.entries(next.files)) {
    mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true })
    writeFileSync(path, content)
  }
  process.stdout.write(JSON.stringify({ module: next.module, version: next.version, probe: false, message }))
  process.exit(0)
}

const name = nameOf(next)
const fn = `Extra${name[0].toUpperCase()}${name.slice(1)}`
const imports = next.imports.map(path => `\t"${path}"`).join('\n')
writeFileSync(`extra_${name}.go`, `package buntdb\n\nimport (\n${imports}\n)\n\n// ${fn} is a use of ${next.module}, added at ${next.version}.\nfunc ${fn}() ${next.returns} { return ${next.use} }\n${next.helper === undefined ? '' : `\n${next.helper}`}`)
let check = next.check
if (next.probe) {
  const value = process.env.PROBE_VALUE
  if (value === undefined) {
    writeFileSync(probePath(next), `package buntdb\n\nimport "testing"\n\nfunc TestProbe${fn}(t *testing.T) { t.Logf("PROBE=%v", ${fn}()) }\n`)
    process.stdout.write(JSON.stringify({ module: next.module, version: next.version, probe: true, message }))
    process.exit(0)
  }
  rmSync(probePath(next), { force: true })
  check = `v != ${JSON.stringify(value)}`
}
writeFileSync(`extra_${name}_test.go`, `package buntdb\n\nimport "testing"\n\nfunc Test${fn}(t *testing.T) {\n\tif v := ${fn}(); ${check} {\n\t\tt.Fatalf("${fn}: %v", v)\n\t}\n}\n`)
process.stdout.write(JSON.stringify({ module: next.module, version: next.version, probe: false, message }))
