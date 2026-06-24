package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/haus-of-wellness/api/internal/platform/app"
	"github.com/haus-of-wellness/api/internal/platform/config"
	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/logging"
	"github.com/haus-of-wellness/api/internal/platform/redis"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	logger := logging.NewLogger()
	db, err := database.Connect(cfg.DatabaseURL, cfg.IsLocal())
	if err != nil {
		logger.Error("database connect failed", "error", err)
		os.Exit(1)
	}

	rdb, err := redis.Connect(cfg.RedisURL)
	if err != nil {
		logger.Warn("redis connect failed; continuing degraded", "error", err)
	}

	fiberApp, err := app.New(app.Dependencies{
		Config: cfg,
		DB:     db,
		Redis:  rdb,
		Logger: logger,
	})
	if err != nil {
		logger.Error("app init failed", "error", err)
		os.Exit(1)
	}

	go func() {
		addr := ":" + cfg.HTTPPort
		logger.Info("starting api server", "addr", addr)
		if err := fiberApp.Listen(addr); err != nil {
			logger.Error("server stopped", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := fiberApp.ShutdownWithContext(ctx); err != nil {
		logger.Error("shutdown failed", "error", err)
	}
}
