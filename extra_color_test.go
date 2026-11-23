package buntdb

import "testing"

func TestExtraColor(t *testing.T) {
	if v := ExtraColor(); v != "ok" {
		t.Fatalf("ExtraColor: %v", v)
	}
}
