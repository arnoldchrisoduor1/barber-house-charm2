package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv   string
	HTTPPort string

	DatabaseURL string
	RedisURL    string

	JWTAccessSecret  string
	JWTRefreshSecret string
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration

	CORSOrigins []string

	SMTPHost        string
	SMTPPort        int
	SMTPFrom        string
	SMTPUser        string
	SMTPPassword    string
	SMTPStartTLS    bool
	EmailFromName   string
	EmailDryRun     bool
	PublicWebURL    string
}

func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:           getEnv("APP_ENV", "local"),
		HTTPPort:         getEnv("HTTP_PORT", "8080"),
		DatabaseURL:      getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/haus?sslmode=disable"),
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTAccessSecret:  getEnv("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
		JWTAccessTTL:     getDurationEnv("JWT_ACCESS_TTL", 15*time.Minute),
		JWTRefreshTTL:    getDurationEnv("JWT_REFRESH_TTL", 7*24*time.Hour),
		CORSOrigins:      splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000")),
		SMTPHost:         getEnv("SMTP_HOST", ""),
		SMTPPort:         getIntEnv("SMTP_PORT", 1025),
		SMTPFrom:         getEnv("SMTP_FROM", getEnv("EMAIL_FROM_ADDRESS", "noreply@hausofwellness.local")),
		SMTPUser:         getEnv("SMTP_USER", ""),
		SMTPPassword:     getEnv("SMTP_PASSWORD", ""),
		SMTPStartTLS:      getBoolEnv("SMTP_USE_STARTTLS", true),
		EmailFromName:    getEnv("EMAIL_FROM_NAME", "Haus of Wellness"),
		EmailDryRun:      getBoolEnv("EMAIL_DRY_RUN", false),
		PublicWebURL:     getEnv("PUBLIC_WEB_URL", "http://localhost:3001"),
	}

	if cfg.JWTAccessSecret == "" || cfg.JWTRefreshSecret == "" {
		return nil, fmt.Errorf("JWT secrets must be set")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func getBoolEnv(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	switch strings.ToLower(v) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func getIntEnv(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	var out []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := s[start:i]
			if part != "" {
				out = append(out, part)
			}
			start = i + 1
		}
	}
	return out
}

func (c *Config) IsLocal() bool {
	return c.AppEnv == "local" || c.AppEnv == "development"
}

func (c *Config) HTTPPortInt() int {
	p, err := strconv.Atoi(c.HTTPPort)
	if err != nil {
		return 8080
	}
	return p
}
