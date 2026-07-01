package marketing

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestRepository_OrgScope_GetPromotionCrossOrgDenied(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	repo := NewRepository(db)

	orgA := uuid.New()
	promoID := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "promotions" WHERE id = \$1 AND organization_id = \$2`).
		WithArgs(promoID, orgA, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	_, err = repo.GetPromotion(context.Background(), orgA, promoID)
	require.Error(t, err)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	require.NoError(t, mock.ExpectationsWereMet())
}
