// Package contracts mirrors packages/contracts/domain for go:embed (Go forbids .. in embed paths).
package contracts

import _ "embed"

//go:embed domain/features.json
var FeaturesJSON []byte
