package buntdb

import (
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// ExtraText is a use of golang.org/x/text, added at v0.14.0.
func ExtraText() string { return cases.Title(language.English).String("spatial index") }
