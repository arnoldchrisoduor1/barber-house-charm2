package booking

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

func newMockRepo(t *testing.T) (*Repository, sqlmock.Sqlmock, *gorm.DB) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	return NewRepository(db), mock, db
}

func TestRepository_OrgScope_ListOnlyOwnOrg(t *testing.T) {
	repo, mock, _ := newMockRepo(t)
	orgA := uuid.New()
	now := time.Now()

	rows := sqlmock.NewRows([]string{"id", "organization_id", "customer_id", "booking_date", "start_time", "end_time", "status", "created_at", "updated_at"}).
		AddRow(uuid.New(), orgA, uuid.New(), now, "09:00", "09:30", "scheduled", now, now)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "bookings" WHERE organization_id = $1`)).
		WithArgs(orgA).
		WillReturnRows(rows)

	list, err := repo.List(context.Background(), orgA, ListFilter{})
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.Equal(t, orgA, list[0].OrganizationID)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_List_BranchScoped(t *testing.T) {
	repo, mock, _ := newMockRepo(t)
	orgA := uuid.New()
	branch := uuid.New()
	now := time.Now()

	rows := sqlmock.NewRows([]string{"id", "organization_id", "customer_id", "branch_id", "booking_date", "start_time", "end_time", "status", "created_at", "updated_at"}).
		AddRow(uuid.New(), orgA, uuid.New(), branch, now, "09:00", "09:30", "scheduled", now, now)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "bookings" WHERE organization_id = $1 AND branch_id = $2`)).
		WithArgs(orgA, branch).
		WillReturnRows(rows)

	list, err := repo.List(context.Background(), orgA, ListFilter{BranchID: &branch})
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_ScheduleAllows_DefaultsTrueWhenNoRows(t *testing.T) {
	repo, mock, _ := newMockRepo(t)
	orgA := uuid.New()
	staffID := uuid.New()
	date := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT is_day_off,start_time,end_time FROM "staff_schedules" WHERE (staff_id = $1 AND schedule_date = $2) AND organization_id = $3`)).
		WithArgs(staffID, "2026-07-01", orgA).
		WillReturnRows(sqlmock.NewRows([]string{"is_day_off", "start_time", "end_time"}))

	allowed, err := repo.ScheduleAllows(context.Background(), orgA, staffID, date, "10:00", "10:30")
	require.NoError(t, err)
	require.True(t, allowed)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_ScheduleAllows_DayOffBlocks(t *testing.T) {
	repo, mock, _ := newMockRepo(t)
	orgA := uuid.New()
	staffID := uuid.New()
	date := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT is_day_off,start_time,end_time FROM "staff_schedules" WHERE (staff_id = $1 AND schedule_date = $2) AND organization_id = $3`)).
		WithArgs(staffID, "2026-07-01", orgA).
		WillReturnRows(sqlmock.NewRows([]string{"is_day_off", "start_time", "end_time"}).AddRow(true, "08:00", "20:00"))

	allowed, err := repo.ScheduleAllows(context.Background(), orgA, staffID, date, "10:00", "10:30")
	require.NoError(t, err)
	require.False(t, allowed)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_ScheduleAllows_OutsideHoursBlocks(t *testing.T) {
	repo, mock, _ := newMockRepo(t)
	orgA := uuid.New()
	staffID := uuid.New()
	date := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT is_day_off,start_time,end_time FROM "staff_schedules" WHERE (staff_id = $1 AND schedule_date = $2) AND organization_id = $3`)).
		WithArgs(staffID, "2026-07-01", orgA).
		WillReturnRows(sqlmock.NewRows([]string{"is_day_off", "start_time", "end_time"}).AddRow(false, "08:00", "12:00"))

	allowed, err := repo.ScheduleAllows(context.Background(), orgA, staffID, date, "13:00", "13:30")
	require.NoError(t, err)
	require.False(t, allowed)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_OrgScope_GetCrossOrgDenied(t *testing.T) {
	repo, mock, _ := newMockRepo(t)
	orgA := uuid.New()
	bookingID := uuid.New()

	mock.ExpectQuery(`SELECT \* FROM "bookings" WHERE id = \$1 AND organization_id = \$2`).
		WithArgs(bookingID, orgA, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	_, err := repo.Get(context.Background(), orgA, bookingID)
	require.Error(t, err)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRepository_OrgScope_DeleteScopedToOrg(t *testing.T) {
	repo, mock, _ := newMockRepo(t)
	orgA := uuid.New()
	bookingID := uuid.New()

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "bookings" WHERE id = \$1 AND organization_id = \$2`).
		WithArgs(bookingID, orgA).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	err := repo.Delete(context.Background(), orgA, bookingID)
	require.NoError(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
