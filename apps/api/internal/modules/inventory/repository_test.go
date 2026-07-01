package inventory

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestRepository_OrgScope_GetCrossOrgDenied(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	repo := NewRepository(db)

	orgA := uuid.New()
	itemID := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "inventory" WHERE id = \$1 AND organization_id = \$2`).
		WithArgs(itemID, orgA, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	_, err = repo.Get(context.Background(), orgA, itemID)
	require.Error(t, err)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_OrgScope_GetPriceLockCrossOrgDenied(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	repo := NewRepository(db)

	orgA := uuid.New()
	lockID := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "price_locks" WHERE id = \$1 AND organization_id = \$2`).
		WithArgs(lockID, orgA, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	_, err = repo.GetPriceLock(context.Background(), orgA, lockID)
	require.Error(t, err)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	require.NoError(t, mock.ExpectationsWereMet())
}
