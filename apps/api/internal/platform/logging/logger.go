package logging

import (
	"log/slog"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
)

func NewLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
}

func RequestLogger(log *slog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = c.GetRespHeader(fiber.HeaderXRequestID)
		}

		err := c.Next()

		status := c.Response().StatusCode()
		level := slog.LevelInfo
		if status >= 500 {
			level = slog.LevelError
		} else if status >= 400 {
			level = slog.LevelWarn
		}

		log.Log(c.UserContext(), level, "http_request",
			"request_id", requestID,
			"method", c.Method(),
			"path", c.Path(),
			"status", status,
			"duration_ms", time.Since(start).Milliseconds(),
			"ip", c.IP(),
		)
		return err
	}
}
