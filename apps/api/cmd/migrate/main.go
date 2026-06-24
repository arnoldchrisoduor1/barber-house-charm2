package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/haus-of-wellness/api/internal/platform/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	migrationsPath := envOr("MIGRATIONS_PATH", "../../infra/migrations")
	absPath, err := filepath.Abs(migrationsPath)
	if err != nil {
		log.Fatalf("migrations path: %v", err)
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("migrate driver: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", filepath.ToSlash(absPath)),
		"postgres",
		driver,
	)
	if err != nil {
		log.Fatalf("migrate init: %v", err)
	}

	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	switch cmd {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("migrate up: %v", err)
		}
		log.Println("migrations applied")
	case "down":
		if err := m.Steps(-1); err != nil {
			log.Fatalf("migrate down: %v", err)
		}
		log.Println("rolled back one migration")
	default:
		log.Fatalf("unknown command %q (use up|down)", cmd)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
