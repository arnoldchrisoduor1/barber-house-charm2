package config

import (
	"fmt"
	"os"
	"strconv"
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
