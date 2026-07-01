package tenancy

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OptionalBranchScope filters list queries when branchID is set.
func OptionalBranchScope(branchID *uuid.UUID, column ...string) func(*gorm.DB) *gorm.DB {
	col := "branch_id"
	if len(column) > 0 && column[0] != "" {
		col = column[0]
	}
	return func(db *gorm.DB) *gorm.DB {
		if branchID == nil {
			return db
		}
		return db.Where(col+" = ?", *branchID)
	}
}
