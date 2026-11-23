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
// The workflow runs `go get` and `go mod tidy` for it, vets, tests, and commits with the message printed.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const GEO_PLACES = `// Package geoplaces keeps named places in a buntdb database and measures between them.
package geoplaces

import (
	"fmt"

	geo "github.com/dovel-ai/darwin-fixture-geo"
	"github.com/tidwall/buntdb"
)

// Places is a set of named places stored in a buntdb database.
type Places struct{ db *buntdb.DB }

// Open opens an in-memory set of places.
func Open() (*Places, error) {
	db, err := buntdb.Open(":memory:")
	if err != nil {
		return nil, err
	}
	return &Places{db: db}, nil
}

// Close closes the database.
func (p *Places) Close() error { return p.db.Close() }

// Put stores a place written as "lat,lon".
func (p *Places) Put(name, latlon string) error {
	point, err := geo.ParsePoint(latlon)
	if err != nil {
		return fmt.Errorf("place %s: %w", name, err)
	}
	return p.db.Update(func(tx *buntdb.Tx) error {
		_, _, err := tx.Set("place:"+name, geo.FormatPoint(point), nil)
		return err
	})
}

func (p *Places) get(name string) (geo.Point, error) {
	var point geo.Point
	err := p.db.View(func(tx *buntdb.Tx) error {
		value, err := tx.Get("place:" + name)
		if err != nil {
			return fmt.Errorf("place %s: %w", name, err)
		}
		point, err = geo.Parse(value)
		return err
	})
	return point, err
}

// Trip is the distance in kilometres, the initial bearing in degrees and the halfway point between two places.
func (p *Places) Trip(from, to string) (km, bearing float64, halfway string, err error) {
	a, err := p.get(from)
	if err != nil {
		return 0, 0, "", err
	}
	b, err := p.get(to)
	if err != nil {
		return 0, 0, "", err
	}
	return geo.GreatCircleDistance(a, b), geo.InitialBearing(a, b), geo.FormatPoint(geo.Interpolate(a, b, 0.5)), nil
}
`
const GEO_PLACES_TEST = `package geoplaces

import (
	"math"
	"testing"
)

func TestTrip(t *testing.T) {
	places, err := Open()
	if err != nil {
		t.Fatal(err)
	}
	defer places.Close()
	if err := places.Put("london", "51.5074,-0.1278"); err != nil {
		t.Fatal(err)
	}
	if err := places.Put("paris", "48.8566,2.3522"); err != nil {
		t.Fatal(err)
	}
	km, bearing, halfway, err := places.Trip("london", "paris")
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(km-343.5) > 5 {
		t.Fatalf("london to paris: %.1f km", km)
	}
	if bearing < 140 || bearing > 160 {
		t.Fatalf("london to paris: bearing %.1f", bearing)
	}
	if halfway == "" {
		t.Fatal("no halfway point")
	}
	if _, _, _, err := places.Trip("london", "nowhere"); err == nil {
		t.Fatal("a trip to a place never stored should fail")
	}
}
`

const DEPENDENCIES = [
  { module: 'github.com/dovel-ai/darwin-fixture-geo', version: 'v0.5.2', files: { 'geoplaces/geoplaces.go': GEO_PLACES, 'geoplaces/geoplaces_test.go': GEO_PLACES_TEST },
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
]

const goMod = readFileSync('go.mod', 'utf8')
const declared = module => new RegExp(`^\\s*(require\\s+)?${module.replace(/[.]/gu, '\\.')}\\s`, 'mu').test(goMod)
const next = DEPENDENCIES.find(dep => !declared(dep.module) || (dep.probe && existsSync(probePath(dep))))
if (next === undefined) {
  process.stdout.write('{}')
  process.exit(0)
}
function nameOf(dep) { return dep.module.split('/').filter(part => !/^v\d+$/u.test(part)).at(-1).replace(/[^A-Za-z0-9]/gu, '') }
function probePath(dep) { return `extras/${nameOf(dep)}_probe_test.go` }

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
mkdirSync('extras', { recursive: true })
if (!existsSync('extras/doc.go')) writeFileSync('extras/doc.go', '// Package extras holds the small uses of libraries this repository added over time.\npackage extras\n')
const imports = next.imports.map(path => `\t"${path}"`).join('\n')
writeFileSync(`extras/${name}.go`, `package extras\n\nimport (\n${imports}\n)\n\n// ${fn} is a use of ${next.module}, added at ${next.version}.\nfunc ${fn}() ${next.returns} { return ${next.use} }\n${next.helper === undefined ? '' : `\n${next.helper}`}`)
let check = next.check
if (next.probe) {
  const value = process.env.PROBE_VALUE
  if (value === undefined) {
    writeFileSync(probePath(next), `package extras\n\nimport "testing"\n\nfunc TestProbe${fn}(t *testing.T) { t.Logf("PROBE=%v", ${fn}()) }\n`)
    process.stdout.write(JSON.stringify({ module: next.module, version: next.version, probe: true, message }))
    process.exit(0)
  }
  rmSync(probePath(next), { force: true })
  check = `v != ${JSON.stringify(value)}`
}
writeFileSync(`extras/${name}_test.go`, `package extras\n\nimport "testing"\n\nfunc Test${fn}(t *testing.T) {\n\tif v := ${fn}(); ${check} {\n\t\tt.Fatalf("${fn}: %v", v)\n\t}\n}\n`)
process.stdout.write(JSON.stringify({ module: next.module, version: next.version, probe: false, message }))
