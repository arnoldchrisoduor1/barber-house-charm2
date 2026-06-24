package httpx

import (
	"errors"
	"net/http"

	"github.com/gofiber/fiber/v2"
)

type Problem struct {
	Type     string         `json:"type,omitempty"`
	Title    string         `json:"title"`
	Status   int            `json:"status"`
	Detail   string         `json:"detail,omitempty"`
	Instance string         `json:"instance,omitempty"`
	Errors   map[string]any `json:"errors,omitempty"`
}

func ProblemJSON(c *fiber.Ctx, status int, title, detail string) error {
	p := Problem{
		Type:     "about:blank",
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: c.Path(),
	}
	return c.Status(status).JSON(p)
}

func ValidationProblem(c *fiber.Ctx, detail string, errors map[string]any) error {
	p := Problem{
		Type:     "about:blank",
		Title:    "Validation Failed",
		Status:   http.StatusUnprocessableEntity,
		Detail:   detail,
		Instance: c.Path(),
		Errors:   errors,
	}
	return c.Status(http.StatusUnprocessableEntity).JSON(p)
}

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
)

func From(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrUnauthorized):
		return ProblemJSON(c, http.StatusUnauthorized, "Unauthorized", err.Error())
	case errors.Is(err, ErrForbidden):
		return ProblemJSON(c, http.StatusForbidden, "Forbidden", err.Error())
	case errors.Is(err, ErrNotFound):
		return ProblemJSON(c, http.StatusNotFound, "Not Found", err.Error())
	case errors.Is(err, ErrConflict):
		return ProblemJSON(c, http.StatusConflict, "Conflict", err.Error())
	default:
		return ProblemJSON(c, http.StatusInternalServerError, "Internal Server Error", "An unexpected error occurred")
	}
}
