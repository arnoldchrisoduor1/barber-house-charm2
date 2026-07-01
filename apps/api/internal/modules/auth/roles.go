package auth

import (
	"errors"
	"strings"
)

var ErrInvalidRole = errors.New("invalid role")

var registerAllowedRoles = map[string]struct{}{
	"ceo":            {},
	"director":       {},
	"branch_manager": {},
	"senior_barber":  {},
	"junior_barber":  {},
	"receptionist":   {},
}

func resolveRegisterRole(role string) (string, error) {
	role = strings.TrimSpace(strings.ToLower(role))
	if role == "" {
		return "ceo", nil
	}
	if _, ok := registerAllowedRoles[role]; !ok {
		return "", ErrInvalidRole
	}
	return role, nil
}
