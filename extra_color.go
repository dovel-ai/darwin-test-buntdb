package buntdb

import (
	"github.com/fatih/color"
)

// ExtraColor is a use of github.com/fatih/color, added at v1.10.0.
func ExtraColor() string { return color.New(color.FgGreen).Sprint("ok") }
