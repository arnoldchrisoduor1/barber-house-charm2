package therapy

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestRepository_ProgressOrgScope_CrossOrgDenied(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	repo := NewRepository(db)

	orgA := uuid.New()
	rowID := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "progress_tracking" WHERE id = \$1 AND organization_id = \$2`).
		WithArgs(rowID, orgA, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	_, err = repo.GetProgress(context.Background(), orgA, rowID)
	require.Error(t, err)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	require.NoError(t, mock.ExpectationsWereMet())
}
