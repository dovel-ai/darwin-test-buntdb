package buntdb

import (
	"fmt"
	"github.com/mattn/go-runewidth"
)

// ExtraGorunewidth is a use of github.com/mattn/go-runewidth, added at v0.0.9.
func ExtraGorunewidth() string {
	return fmt.Sprint(runeSumWidth("\U0001F44D\U0001F3FD"), runeSumWidth("\U0001F468\u200D\U0001F469\u200D\U0001F467"), runeSumWidth("e\u0301"))
}

// runeSumWidth sums the width of each rune in s. This is what
// runewidth.StringWidth returned at v0.0.9; later releases measure grapheme
// clusters instead, which would change the results.
func runeSumWidth(s string) int {
	width := 0
	for _, r := range s {
		width += runewidth.RuneWidth(r)
	}
	return width
}
