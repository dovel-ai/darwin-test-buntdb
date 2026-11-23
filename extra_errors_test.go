package buntdb

import "testing"

func TestExtraErrors(t *testing.T) {
	if v := ExtraErrors(); v != "get: no key" {
		t.Fatalf("ExtraErrors: %v", v)
	}
}
