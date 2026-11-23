package buntdb

import (
	"fmt"
	"github.com/mattn/go-runewidth"
)

// ExtraGorunewidth is a use of github.com/mattn/go-runewidth, added at v0.0.9.
func ExtraGorunewidth() string {
	return fmt.Sprint(runewidth.StringWidth("\U0001F44D\U0001F3FD"), runewidth.StringWidth("\U0001F468\u200D\U0001F469\u200D\U0001F467"), runewidth.StringWidth("e\u0301"))
}
