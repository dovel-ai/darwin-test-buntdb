package buntdb

import (
	"fmt"

	geo "github.com/dovel-ai/darwin-fixture-geo"
)

// Places is a set of named places kept in a database, with distances and bearings between them.
type Places struct{ db *DB }

// OpenPlaces opens an in-memory set of places.
func OpenPlaces() (*Places, error) {
	db, err := Open(":memory:")
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
	return p.db.Update(func(tx *Tx) error {
		_, _, err := tx.Set("place:"+name, geo.FormatPoint(point), nil)
		return err
	})
}

func (p *Places) place(name string) (geo.Point, error) {
	var point geo.Point
	err := p.db.View(func(tx *Tx) error {
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
	a, err := p.place(from)
	if err != nil {
		return 0, 0, "", err
	}
	b, err := p.place(to)
	if err != nil {
		return 0, 0, "", err
	}
	return geo.GreatCircleDistance(a, b), geo.InitialBearing(a, b), geo.FormatPoint(geo.Interpolate(a, b, 0.5)), nil
}
