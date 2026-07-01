package services

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newMockRepo(t *testing.T) (*Repository, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	return NewRepository(db), mock
}

func TestRepository_OrgScope_GetCrossOrgDenied(t *testing.T) {
	repo, mock := newMockRepo(t)
	orgA := uuid.New()
	serviceID := uuid.New()

	mock.ExpectQuery(`SELECT \* FROM "services" WHERE id = \$1 AND organization_id = \$2`).
		WithArgs(serviceID, orgA, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	_, err := repo.Get(context.Background(), orgA, serviceID)
	require.Error(t, err)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_OrgScope_ListOnlyOwnOrg(t *testing.T) {
	repo, mock := newMockRepo(t)
	orgA := uuid.New()
	now := time.Now()

	rows := sqlmock.NewRows([]string{"id", "organization_id", "name", "price_kes", "duration_minutes", "is_active", "created_at", "updated_at"}).
		AddRow(uuid.New(), orgA, "Haircut", 1500, 30, true, now, now)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "services" WHERE organization_id = $1`)).
		WithArgs(orgA).
		WillReturnRows(rows)

	list, err := repo.List(context.Background(), orgA, nil)
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.Equal(t, orgA, list[0].OrganizationID)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_List_BranchScoped(t *testing.T) {
	repo, mock := newMockRepo(t)
	orgA := uuid.New()
	branch := uuid.New()
	now := time.Now()

	rows := sqlmock.NewRows([]string{"id", "organization_id", "branch_id", "name", "price_kes", "duration_minutes", "is_active", "created_at", "updated_at"}).
		AddRow(uuid.New(), orgA, branch, "Haircut", 1500, 30, true, now, now)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "services" WHERE (branch_id IS NULL OR branch_id = $1) AND organization_id = $2 ORDER BY name ASC`)).
		WithArgs(branch, orgA).
		WillReturnRows(rows)

	list, err := repo.List(context.Background(), orgA, &branch)
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.NoError(t, mock.ExpectationsWereMet())
}
