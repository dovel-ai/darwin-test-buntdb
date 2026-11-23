package buntdb

import "testing"

func TestExtraGohumanize(t *testing.T) {
	if v := ExtraGohumanize(); v != "1,234,567" {
		t.Fatalf("ExtraGohumanize: %v", v)
	}
}
