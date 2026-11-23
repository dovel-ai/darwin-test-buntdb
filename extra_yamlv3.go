package buntdb

import (
	"gopkg.in/yaml.v3"
)

// ExtraYamlv3 is a use of gopkg.in/yaml.v3, added at v3.0.0.
func ExtraYamlv3() string { return mustYAML(map[string]int{"keys": 2}) }

func mustYAML(v any) string {
	out, err := yaml.Marshal(v)
	if err != nil {
		panic(err)
	}
	return string(out)
}
