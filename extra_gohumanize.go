package buntdb

import (
	"github.com/dustin/go-humanize"
)

// ExtraGohumanize is a use of github.com/dustin/go-humanize, added at v1.0.0.
func ExtraGohumanize() string { return humanize.Comma(1234567) }
