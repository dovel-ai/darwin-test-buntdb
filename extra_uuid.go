package buntdb

import (
	"github.com/google/uuid"
)

// ExtraUuid is a use of github.com/google/uuid, added at v1.3.0.
func ExtraUuid() string { return uuid.NewString() }
