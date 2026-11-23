package buntdb

import "testing"

func TestExtraUuid(t *testing.T) {
	if v := ExtraUuid(); len(v) != 36 {
		t.Fatalf("ExtraUuid: %v", v)
	}
}
