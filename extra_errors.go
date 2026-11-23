package buntdb

import (
	"github.com/pkg/errors"
)

// ExtraErrors is a use of github.com/pkg/errors, added at v0.9.0.
func ExtraErrors() string { return errors.Wrap(errors.New("no key"), "get").Error() }
