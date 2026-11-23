package buntdb

import "testing"

func TestExtraGorunewidth(t *testing.T) {
	if v := ExtraGorunewidth(); v != "4 6 1" {
		t.Fatalf("ExtraGorunewidth: %v", v)
	}
}
