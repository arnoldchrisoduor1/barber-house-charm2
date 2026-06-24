package idempotency

import (
	"context"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const defaultTTL = 7 * 24 * time.Hour

type Store struct {
	rdb *goredis.Client
	ttl time.Duration
}

func NewStore(rdb *goredis.Client, ttl time.Duration) *Store {
	if ttl <= 0 {
		ttl = defaultTTL
	}
	return &Store{rdb: rdb, ttl: ttl}
}

func (s *Store) key(prefix, ref string) string {
	return fmt.Sprintf("idempotency:%s:%s", prefix, ref)
}

// IsProcessed returns true when ref was already fulfilled (MarkDone).
func (s *Store) IsProcessed(ctx context.Context, prefix, ref string) (bool, error) {
	if s.rdb == nil {
		return false, nil
	}
	val, err := s.rdb.Get(ctx, s.key(prefix, ref)).Result()
	if err == goredis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("idempotency get: %w", err)
	}
	return val == "done", nil
}

// TryAcquire returns true if this is the first time seeing ref within TTL.
func (s *Store) TryAcquire(ctx context.Context, prefix, ref string) (bool, error) {
	if s.rdb == nil {
		return true, nil
	}
	ok, err := s.rdb.SetNX(ctx, s.key(prefix, ref), "processing", s.ttl).Result()
	if err != nil {
		return false, fmt.Errorf("idempotency setnx: %w", err)
	}
	return ok, nil
}

func (s *Store) MarkDone(ctx context.Context, prefix, ref string) error {
	if s.rdb == nil {
		return nil
	}
	return s.rdb.Set(ctx, s.key(prefix, ref), "done", s.ttl).Err()
}

func (s *Store) Release(ctx context.Context, prefix, ref string) error {
	if s.rdb == nil {
		return nil
	}
	return s.rdb.Del(ctx, s.key(prefix, ref)).Err()
}
