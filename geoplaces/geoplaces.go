// Package geoplaces keeps named places in a buntdb database and measures between them.
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
