package main

import (
	"context"
	"log"
	"log/slog"
	"os"

	"github.com/hibiken/asynq"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/logging"
	notificationsmod "github.com/haus-of-wellness/api/internal/modules/notifications"
)

func main() {
	logger := logging.NewLogger()
	redisAddr := envOr("REDIS_ADDR", "localhost:6379")

	dbURL := envOr("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/haus?sslmode=disable")
	db, err := database.Connect(dbURL, true)
	if err != nil {
		logger.Warn("database connect failed; notification persistence disabled", "error", err)
	}

	var notificationsSvc *notificationsmod.Service
	if db != nil {
		notifier := &notificationsmod.MultiNotifier{
			SMS:      notificationsmod.NewAfricasTalkingSMS(logger),
			WhatsApp: notificationsmod.NewMetaWhatsApp(logger),
		}
		repo := notificationsmod.NewRepository(db)
		notificationsSvc = notificationsmod.NewService(repo, notifier)
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"notifications": 6,
				"integrations":  3,
				"payouts":       2,
				"default":       1,
			},
		},
	)
	mux := asynq.NewServeMux()
	mux.HandleFunc("health:ping", func(_ context.Context, _ *asynq.Task) error {
		log.Println("worker: health ping")
		return nil
	})
	if notificationsSvc != nil {
		mux.Handle(notificationsmod.TypeSendBookingReminder, notificationsmod.HandleSendBookingReminder(notificationsSvc))
	} else {
		mux.Handle(notificationsmod.TypeSendBookingReminder, stubReminderHandler(logger))
	}

	logger.Info("starting asynq worker", "redis", redisAddr)
	if err := srv.Run(mux); err != nil {
		log.Fatalf("worker: %v", err)
	}
}

func stubReminderHandler(logger *slog.Logger) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		logger.WarnContext(ctx, "notifications service unavailable; dropping reminder task", "type", notificationsmod.TypeSendBookingReminder)
		return nil
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
