package analytics

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

func newMockRepo(t *testing.T) (*Repository, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	return NewRepository(db), mock
}

func TestRepository_OrgScope_ReportsSummaryScoped(t *testing.T) {
	repo, mock := newMockRepo(t)
	orgA := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COALESCE(SUM(amount_kes), 0) FROM "transactions" WHERE payment_status = $1 AND organization_id = $2`)).
		WithArgs("completed", orgA).
		WillReturnRows(sqlmock.NewRows([]string{"coalesce"}).AddRow(50000))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "bookings" WHERE organization_id = $1`)).
		WithArgs(orgA).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(10))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "bookings" WHERE status = $1 AND organization_id = $2`)).
		WithArgs("completed", orgA).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(7))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "customers" WHERE organization_id = $1`)).
		WithArgs(orgA).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(25))

	summary, err := repo.ReportsSummary(context.Background(), orgA, nil)
	require.NoError(t, err)
	require.Equal(t, int64(50000), summary.TotalRevenueKES)
	require.Equal(t, int64(10), summary.TotalBookings)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_ReportsSummary_BranchScoped(t *testing.T) {
	repo, mock := newMockRepo(t)
	orgA := uuid.New()
	branch := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COALESCE(SUM(amount_kes), 0) FROM "transactions" WHERE payment_status = $1 AND organization_id = $2 AND branch_id = $3`)).
		WithArgs("completed", orgA, branch).
		WillReturnRows(sqlmock.NewRows([]string{"coalesce"}).AddRow(12000))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "bookings" WHERE organization_id = $1 AND branch_id = $2`)).
		WithArgs(orgA, branch).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "bookings" WHERE status = $1 AND organization_id = $2 AND branch_id = $3`)).
		WithArgs("completed", orgA, branch).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "customers" WHERE organization_id = $1 AND branch_id = $2`)).
		WithArgs(orgA, branch).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

	summary, err := repo.ReportsSummary(context.Background(), orgA, &branch)
	require.NoError(t, err)
	require.Equal(t, int64(12000), summary.TotalRevenueKES)
	require.Equal(t, int64(3), summary.TotalBookings)
	require.NoError(t, mock.ExpectationsWereMet())
}
