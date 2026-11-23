package buntdb

import "testing"

func TestExtraYamlv3(t *testing.T) {
	if v := ExtraYamlv3(); v != "keys: 2\n" {
		t.Fatalf("ExtraYamlv3: %v", v)
	}
}
