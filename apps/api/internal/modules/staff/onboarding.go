package staff

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type OnboardingChecklistTemplate struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	Label          string    `gorm:"not null"`
	SortOrder      int       `gorm:"not null;default:0"`
}

func (OnboardingChecklistTemplate) TableName() string { return "onboarding_checklist_templates" }
func (OnboardingChecklistTemplate) IsTenantScoped()   {}

type OnboardingChecklistCompletion struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID        uuid.UUID  `gorm:"type:uuid;not null;index"`
	TemplateID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	CompletedAt    *time.Time
}

func (OnboardingChecklistCompletion) TableName() string { return "onboarding_checklist_completions" }
func (OnboardingChecklistCompletion) IsTenantScoped()   {}

var (
	_ tenancy.OrgScoped = (*OnboardingChecklistTemplate)(nil)
	_ tenancy.OrgScoped = (*OnboardingChecklistCompletion)(nil)
)

var defaultOnboardingLabels = []string{
	"Sign employment contract",
	"Submit ID & tax docs",
	"Tour the salon",
	"Setup POS/system login",
	"Shadow senior stylist (1 week)",
	"Complete safety & sanitation training",
	"Meet first 5 clients",
	"30-day check-in with manager",
}

type OnboardingProgressRow struct {
	StaffID        uuid.UUID `json:"staff_id"`
	StaffName      string    `json:"staff_name"`
	StartedAt      string    `json:"started_at"`
	CompletedCount int       `json:"completed_count"`
	TotalCount     int       `json:"total_count"`
	Items          []OnboardingItemRow `json:"items"`
}

type OnboardingItemRow struct {
	TemplateID   uuid.UUID  `json:"template_id"`
	Label        string     `json:"label"`
	SortOrder    int        `json:"sort_order"`
	CompletionID *uuid.UUID `json:"completion_id,omitempty"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	Done         bool       `json:"done"`
}

type CreateOnboardingTemplateDTO struct {
	Label     string `json:"label"`
	SortOrder int    `json:"sort_order"`
}

type EnrollOnboardingDTO struct {
	StaffID uuid.UUID `json:"staff_id"`
}

type ToggleOnboardingDTO struct {
	StaffID    uuid.UUID `json:"staff_id"`
	TemplateID uuid.UUID `json:"template_id"`
}

func (s *Service) EnsureOnboardingTemplates(ctx context.Context, orgID uuid.UUID) error {
	rows, err := s.repo.ListOnboardingTemplates(ctx, orgID)
	if err != nil {
		return err
	}
	if len(rows) > 0 {
		return nil
	}
	for i, label := range defaultOnboardingLabels {
		row := &OnboardingChecklistTemplate{
			OrganizationID: orgID,
			Label:          label,
			SortOrder:      i,
		}
		if err := s.repo.CreateOnboardingTemplate(ctx, row); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) ListOnboardingTemplates(ctx context.Context, orgID uuid.UUID) ([]OnboardingChecklistTemplate, error) {
	if err := s.EnsureOnboardingTemplates(ctx, orgID); err != nil {
		return nil, err
	}
	return s.repo.ListOnboardingTemplates(ctx, orgID)
}

func (s *Service) CreateOnboardingTemplate(ctx context.Context, orgID uuid.UUID, dto CreateOnboardingTemplateDTO) (*OnboardingChecklistTemplate, error) {
	label := strings.TrimSpace(dto.Label)
	if label == "" {
		return nil, httpx.ErrConflict
	}
	row := &OnboardingChecklistTemplate{
		OrganizationID: orgID,
		Label:          label,
		SortOrder:      dto.SortOrder,
	}
	if err := s.repo.CreateOnboardingTemplate(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) ListOnboardingProgress(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID) ([]OnboardingProgressRow, error) {
	if err := s.EnsureOnboardingTemplates(ctx, orgID); err != nil {
		return nil, err
	}
	templates, err := s.repo.ListOnboardingTemplates(ctx, orgID)
	if err != nil {
		return nil, err
	}
	staffRows, err := s.repo.List(ctx, orgID, nil)
	if err != nil {
		return nil, err
	}
	if staffID != nil {
		filtered := make([]Staff, 0, 1)
		for _, st := range staffRows {
			if st.ID == *staffID {
				filtered = append(filtered, st)
			}
		}
		staffRows = filtered
	}
	completions, err := s.repo.ListOnboardingCompletions(ctx, orgID, staffID)
	if err != nil {
		return nil, err
	}
	byStaff := map[uuid.UUID][]OnboardingChecklistCompletion{}
	for _, c := range completions {
		byStaff[c.StaffID] = append(byStaff[c.StaffID], c)
	}
	out := make([]OnboardingProgressRow, 0)
	for _, st := range staffRows {
		staffCompletions := byStaff[st.ID]
		if len(staffCompletions) == 0 {
			continue
		}
		row := buildProgressRow(st, templates, staffCompletions)
		out = append(out, row)
	}
	return out, nil
}

func buildProgressRow(st Staff, templates []OnboardingChecklistTemplate, completions []OnboardingChecklistCompletion) OnboardingProgressRow {
	byTemplate := map[uuid.UUID]OnboardingChecklistCompletion{}
	var startedAt time.Time
	for _, c := range completions {
		byTemplate[c.TemplateID] = c
		if c.CreatedAt.Before(startedAt) || startedAt.IsZero() {
			startedAt = c.CreatedAt
		}
	}
	items := make([]OnboardingItemRow, 0, len(templates))
	doneCount := 0
	for _, t := range templates {
		c, ok := byTemplate[t.ID]
		item := OnboardingItemRow{
			TemplateID: t.ID,
			Label:      t.Label,
			SortOrder:  t.SortOrder,
		}
		if ok {
			item.CompletionID = &c.ID
			item.CompletedAt = c.CompletedAt
			item.Done = c.CompletedAt != nil
			if item.Done {
				doneCount++
			}
		}
		items = append(items, item)
	}
	started := ""
	if !startedAt.IsZero() {
		started = startedAt.Format("2006-01-02")
	}
	return OnboardingProgressRow{
		StaffID:        st.ID,
		StaffName:      st.DisplayName,
		StartedAt:      started,
		CompletedCount: doneCount,
		TotalCount:     len(templates),
		Items:          items,
	}
}

func (s *Service) EnrollOnboarding(ctx context.Context, orgID uuid.UUID, actorID *uuid.UUID, dto EnrollOnboardingDTO) (*OnboardingProgressRow, error) {
	if dto.StaffID == uuid.Nil {
		return nil, httpx.ErrConflict
	}
	st, err := s.Get(ctx, orgID, dto.StaffID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	if err := s.EnsureOnboardingTemplates(ctx, orgID); err != nil {
		return nil, err
	}
	templates, err := s.repo.ListOnboardingTemplates(ctx, orgID)
	if err != nil {
		return nil, err
	}
	existing, err := s.repo.ListOnboardingCompletions(ctx, orgID, &dto.StaffID)
	if err != nil {
		return nil, err
	}
	if len(existing) > 0 {
		row := buildProgressRow(*st, templates, existing)
		return &row, nil
	}
	for _, t := range templates {
		c := &OnboardingChecklistCompletion{
			OrganizationID: orgID,
			StaffID:        dto.StaffID,
			TemplateID:     t.ID,
		}
		if err := s.repo.CreateOnboardingCompletion(ctx, c); err != nil {
			return nil, err
		}
		existing = append(existing, *c)
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{"staff_id": dto.StaffID})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "onboarding.enrolled", "staff", &dto.StaffID, meta)
	}
	completions, err := s.repo.ListOnboardingCompletions(ctx, orgID, &dto.StaffID)
	if err != nil {
		return nil, err
	}
	row := buildProgressRow(*st, templates, completions)
	return &row, nil
}

func (s *Service) ToggleOnboardingItem(ctx context.Context, orgID uuid.UUID, actorID *uuid.UUID, dto ToggleOnboardingDTO) (*OnboardingProgressRow, error) {
	if dto.StaffID == uuid.Nil || dto.TemplateID == uuid.Nil {
		return nil, httpx.ErrConflict
	}
	st, err := s.Get(ctx, orgID, dto.StaffID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	c, err := s.repo.GetOnboardingCompletion(ctx, orgID, dto.StaffID, dto.TemplateID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	now := time.Now()
	if c.CompletedAt != nil {
		c.CompletedAt = nil
	} else {
		c.CompletedAt = &now
	}
	if err := s.repo.UpdateOnboardingCompletion(ctx, orgID, c); err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"staff_id": dto.StaffID, "template_id": dto.TemplateID, "done": c.CompletedAt != nil,
		})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "onboarding.item_toggled", "onboarding_completion", &c.ID, meta)
	}
	templates, err := s.repo.ListOnboardingTemplates(ctx, orgID)
	if err != nil {
		return nil, err
	}
	completions, err := s.repo.ListOnboardingCompletions(ctx, orgID, &dto.StaffID)
	if err != nil {
		return nil, err
	}
	row := buildProgressRow(*st, templates, completions)
	return &row, nil
}
