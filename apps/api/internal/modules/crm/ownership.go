package crm

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type TransferOwnershipDTO struct {
	AssignedStaffID *uuid.UUID `json:"assigned_staff_id"`
	Reason          string     `json:"reason"`
}

func (s *Service) TransferOwnership(
	ctx context.Context,
	orgID, customerID uuid.UUID,
	actorID *uuid.UUID,
	dto TransferOwnershipDTO,
) (*Customer, error) {
	if strings.TrimSpace(dto.Reason) == "" {
		return nil, httpx.ErrConflict
	}
	row, err := s.Get(ctx, orgID, customerID)
	if err != nil {
		return nil, err
	}
	prev := row.AssignedStaffID
	row.AssignedStaffID = dto.AssignedStaffID
	if err := s.repo.Update(ctx, orgID, row); err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"reason":             dto.Reason,
			"previous_staff_id":  prev,
			"assigned_staff_id": dto.AssignedStaffID,
			"customer_full_name": row.FullName,
		})
		cid := customerID
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "customer.ownership_transfer", "customer", &cid, meta)
	}
	return row, nil
}
