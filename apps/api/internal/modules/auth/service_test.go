package auth

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveRegisterRole(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr error
	}{
		{name: "empty defaults ceo", input: "", want: "ceo"},
		{name: "ceo", input: "ceo", want: "ceo"},
		{name: "director", input: "director", want: "director"},
		{name: "branch manager", input: "branch_manager", want: "branch_manager"},
		{name: "senior barber", input: "senior_barber", want: "senior_barber"},
		{name: "junior barber", input: "junior_barber", want: "junior_barber"},
		{name: "receptionist", input: "receptionist", want: "receptionist"},
		{name: "trimmed uppercase", input: "  CEO  ", want: "ceo"},
		{name: "invalid role", input: "platform_admin", wantErr: ErrInvalidRole},
		{name: "customer not allowed", input: "customer", wantErr: ErrInvalidRole},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveRegisterRole(tt.input)
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
