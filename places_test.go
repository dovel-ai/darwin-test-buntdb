package buntdb

import (
	"math"
	"testing"
)

func TestPlacesTrip(t *testing.T) {
	places, err := OpenPlaces()
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
