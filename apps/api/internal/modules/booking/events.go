package booking

import (
	"context"

	"github.com/google/uuid"
)

type QueuePublisher interface {
	PublishQueue(ctx context.Context, orgID uuid.UUID, eventType string, payload any) error
}
