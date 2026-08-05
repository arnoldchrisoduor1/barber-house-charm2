package main

import (
	"context"
	"log"
	"log/slog"
	"os"

	"github.com/hibiken/asynq"

	"github.com/haus-of-wellness/api/internal/platform/config"
	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/logging"
	notificationsmod "github.com/haus-of-wellness/api/internal/modules/notifications"
)

func main() {
	logger := logging.NewLogger()
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	redisAddr := envOr("REDIS_ADDR", redisAddrFromURL(cfg.RedisURL))

	dbURL := envOr("DATABASE_URL", cfg.DatabaseURL)
	db, err := database.Connect(dbURL, true)
	if err != nil {
		logger.Warn("database connect failed; notification persistence disabled", "error", err)
	}

	var notificationsSvc *notificationsmod.Service
	if db != nil {
		notifier := notificationsmod.NewConfiguredNotifier(cfg, logger)
		repo := notificationsmod.NewRepository(db)
		notificationsSvc = notificationsmod.NewService(repo, notifier, cfg.PublicWebURL, nil)
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
		mux.Handle(notificationsmod.TypeSendReviewRequest, notificationsmod.HandleSendReviewRequest(notificationsSvc))
	} else {
		mux.Handle(notificationsmod.TypeSendBookingReminder, stubReminderHandler(logger))
		mux.Handle(notificationsmod.TypeSendReviewRequest, stubReminderHandler(logger))
	}

	logger.Info("starting asynq worker", "redis", redisAddr)
	if err := srv.Run(mux); err != nil {
		log.Fatalf("worker: %v", err)
	}
}

func stubReminderHandler(logger *slog.Logger) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		logger.WarnContext(ctx, "notifications service unavailable; dropping task", "type", t.Type())
		return nil
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func redisAddrFromURL(redisURL string) string {
	if redisURL == "" {
		return "localhost:6379"
	}
	// fallback for worker when REDIS_ADDR not set
	return "localhost:6379"
}
