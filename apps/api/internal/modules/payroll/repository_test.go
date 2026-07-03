package payroll

import (
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newMockRepo(t *testing.T) (*Repository, sqlmock.Sqlmock, func()) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	dialector := postgres.New(postgres.Config{Conn: sqlDB, PreferSimpleProtocol: true})
	db, err := gorm.Open(dialector, &gorm.Config{})
	require.NoError(t, err)
	return NewRepository(db), mock, func() { _ = sqlDB.Close() }
}

func TestRepository_OrgScope_ListRules(t *testing.T) {
	repo, mock, cleanup := newMockRepo(t)
	defer cleanup()
	orgA := uuid.New()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "commission_rules" WHERE organization_id = $1`)).
		WithArgs(orgA).
		WillReturnRows(sqlmock.NewRows([]string{"id", "organization_id", "staff_id", "rate_pct"}))
	rows, err := repo.ListRules(context.Background(), orgA)
	require.NoError(t, err)
	require.Empty(t, rows)
	require.NoError(t, mock.ExpectationsWereMet())
}
