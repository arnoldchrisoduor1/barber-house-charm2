package auth

import (
	"errors"
	"strings"
)

var ErrInvalidRole = errors.New("invalid role")
var ErrStaffSelfRegister = errors.New("staff must be invited")

var businessRegisterRoles = map[string]struct{}{
	"ceo":      {},
	"director": {},
}

var staffInviteRoles = map[string]struct{}{
	"branch_manager": {},
	"senior_barber":  {},
	"junior_barber":  {},
	"receptionist":   {},
	"director":       {},
}

func resolveRegisterRole(accountType, role string) (string, error) {
	accountType = strings.TrimSpace(strings.ToLower(accountType))
	if accountType == "" {
		accountType = "business"
	}
	role = strings.TrimSpace(strings.ToLower(role))
	if accountType == "client" {
		return "customer", nil
	}
	if accountType == "staff" {
		return "", ErrStaffSelfRegister
	}
	if role == "" {
		return "ceo", nil
	}
	if _, ok := businessRegisterRoles[role]; !ok {
		if _, staff := staffInviteRoles[role]; staff {
			return "", ErrStaffSelfRegister
		}
		return "", ErrInvalidRole
	}
	return role, nil
}

func resolveStaffInviteRole(role string) (string, error) {
	role = strings.TrimSpace(strings.ToLower(role))
	if role == "" {
		return "senior_barber", nil
	}
	if _, ok := staffInviteRoles[role]; !ok {
		return "", ErrInvalidRole
	}
	return role, nil
}
