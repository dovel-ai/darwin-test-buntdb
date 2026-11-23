package buntdb

import "testing"

func TestExtraText(t *testing.T) {
	if v := ExtraText(); v != "Spatial Index" {
		t.Fatalf("ExtraText: %v", v)
	}
}
