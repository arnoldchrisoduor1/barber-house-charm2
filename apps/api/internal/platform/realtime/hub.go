package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/uuid"
)

const QueueChannelPrefix = "org."

type Event struct {
	Type    string          `json:"type"`
	OrgID   uuid.UUID       `json:"org_id"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type client struct {
	orgID    uuid.UUID
	channels map[string]struct{}
	send     chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[*client]struct{}
	chSubs  map[string]map[*client]struct{}
	logger  *slog.Logger
}

func NewHub(logger *slog.Logger) *Hub {
	if logger == nil {
		logger = slog.Default()
	}
	return &Hub{
		clients: make(map[*client]struct{}),
		chSubs:  make(map[string]map[*client]struct{}),
		logger:  logger,
	}
}

func QueueChannel(orgID uuid.UUID) string {
	return fmt.Sprintf("%s%s.queue", QueueChannelPrefix, orgID.String())
}

func (h *Hub) Register(c *client, channels []string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[c] = struct{}{}
	for _, ch := range channels {
		if h.chSubs[ch] == nil {
			h.chSubs[ch] = make(map[*client]struct{})
		}
		h.chSubs[ch][c] = struct{}{}
	}
}

func (h *Hub) Unregister(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(h.clients, c)
	for ch := range c.channels {
		if subs, ok := h.chSubs[ch]; ok {
			delete(subs, c)
			if len(subs) == 0 {
				delete(h.chSubs, ch)
			}
		}
	}
	close(c.send)
}

func (h *Hub) Publish(ctx context.Context, channel string, event Event) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	h.broadcast(channel, data)
	h.logger.InfoContext(ctx, "realtime_publish", "channel", channel, "type", event.Type)
	return nil
}

func (h *Hub) PublishQueue(ctx context.Context, orgID uuid.UUID, eventType string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}
	return h.Publish(ctx, QueueChannel(orgID), Event{
		Type:    eventType,
		OrgID:   orgID,
		Payload: raw,
	})
}

func (h *Hub) broadcast(channel string, data []byte) {
	h.mu.RLock()
	subs := h.chSubs[channel]
	targets := make([]*client, 0, len(subs))
	for c := range subs {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- data:
		default:
			h.logger.Warn("realtime client slow; dropping message", "channel", channel)
		}
	}
}

func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
