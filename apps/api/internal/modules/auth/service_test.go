package auth

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveRegisterRole(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		accountType string
		role        string
		want        string
		wantErr     error
	}{
		{name: "business empty defaults ceo", accountType: "business", role: "", want: "ceo"},
		{name: "business ceo", accountType: "business", role: "ceo", want: "ceo"},
		{name: "business director", accountType: "business", role: "director", want: "director"},
		{name: "business branch manager blocked", accountType: "business", role: "branch_manager", wantErr: ErrStaffSelfRegister},
		{name: "business senior barber blocked", accountType: "business", role: "senior_barber", wantErr: ErrStaffSelfRegister},
		{name: "client maps to customer", accountType: "client", role: "", want: "customer"},
		{name: "staff portal blocked", accountType: "staff", role: "", wantErr: ErrStaffSelfRegister},
		{name: "invalid role", accountType: "business", role: "platform_admin", wantErr: ErrInvalidRole},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveRegisterRole(tt.accountType, tt.role)
			if tt.wantErr != nil {
				require.Error(t, err)
				require.True(t, errors.Is(err, tt.wantErr))
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestResolveStaffInviteRole(t *testing.T) {
	t.Parallel()

	got, err := resolveStaffInviteRole("branch_manager")
	require.NoError(t, err)
	require.Equal(t, "branch_manager", got)

	_, err = resolveStaffInviteRole("ceo")
	require.ErrorIs(t, err, ErrInvalidRole)
}
