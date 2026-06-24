package app

import (
	"context"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/hibiken/asynq"
	goredis "github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/config"
	"github.com/haus-of-wellness/api/internal/platform/idempotency"
	"github.com/haus-of-wellness/api/internal/platform/logging"
	platformrealtime "github.com/haus-of-wellness/api/internal/platform/realtime"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
	authmod "github.com/haus-of-wellness/api/internal/modules/auth"
	bookingmod "github.com/haus-of-wellness/api/internal/modules/booking"
	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	inventorymod "github.com/haus-of-wellness/api/internal/modules/inventory"
	openfloatmod "github.com/haus-of-wellness/api/internal/modules/integrations/openfloat"
	pesapalmod "github.com/haus-of-wellness/api/internal/modules/integrations/pesapal"
	ledgermod "github.com/haus-of-wellness/api/internal/modules/ledger"
	notificationsmod "github.com/haus-of-wellness/api/internal/modules/notifications"
	platformmod "github.com/haus-of-wellness/api/internal/modules/platform"
	payoutmod "github.com/haus-of-wellness/api/internal/modules/payouts"
	posmod "github.com/haus-of-wellness/api/internal/modules/pos"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

type Dependencies struct {
	Config *config.Config
	DB     *gorm.DB
	Redis  *goredis.Client
	Logger *slog.Logger
}

func New(deps Dependencies) (*fiber.App, error) {
	jwtSvc := platformauth.NewJWTService(
		deps.Config.JWTAccessSecret,
		deps.Config.JWTRefreshSecret,
		deps.Config.JWTAccessTTL,
		deps.Config.JWTRefreshTTL,
	)

	featureReg, err := featuremod.LoadRegistry()
	if err != nil {
		return nil, err
	}
	featureRepo := featuremod.NewRepository(deps.DB)
	featureSvc := featuremod.NewService(featureRepo, featureReg)
	if err := featureSvc.SyncCatalog(context.Background()); err != nil {
		deps.Logger.Warn("feature catalog sync failed", "error", err)
	}

	tenancyRepo := tenancymod.NewRepository(deps.DB)
	tenancySvc := tenancymod.NewService(tenancyRepo)

	platformRepo := platformmod.NewRepository(deps.DB)
	platformSvc := platformmod.NewService(platformRepo)

	authRepo := authmod.NewRepository(deps.DB)
	authSvc := authmod.NewService(authRepo, jwtSvc, tenancySvc, featureSvc, platformSvc)
	authHandler := authmod.NewHandler(authSvc)

	tenancyHandler := tenancymod.NewHandler(tenancySvc)

	realtimeHub := platformrealtime.NewHub(deps.Logger)
	realtimeToken := platformrealtime.NewTokenService(deps.Config.JWTAccessSecret, 5*time.Minute)
	realtimeHandler := platformrealtime.NewHandler(realtimeHub, realtimeToken)

	idemStore := idempotency.NewStore(deps.Redis, 0)

	bookingRepo := bookingmod.NewRepository(deps.DB)
	bookingSvc := bookingmod.NewService(bookingRepo, realtimeHub)
	bookingHandler := bookingmod.NewHandler(bookingSvc)
	publicBookingHandler := bookingmod.NewPublicHandler(bookingSvc, tenancySvc)

	posRepo := posmod.NewRepository(deps.DB)
	posSvc := posmod.NewService(posRepo)
	posHandler := posmod.NewHandler(posSvc)

	ledgerRepo := ledgermod.NewRepository(deps.DB)
	ledgerSvc := ledgermod.NewService(ledgerRepo)
	ledgerHandler := ledgermod.NewHandler(ledgerSvc)

	openfloatClient := openfloatmod.NewClient(deps.Logger)
	payoutRepo := payoutmod.NewRepository(deps.DB)
	payoutSvc := payoutmod.NewService(payoutRepo, openfloatClient, idemStore, ledgerSvc)
	payoutHandler := payoutmod.NewHandler(payoutSvc)

	crmRepo := crmmod.NewRepository(deps.DB)
	crmSvc := crmmod.NewService(crmRepo)
	crmHandler := crmmod.NewHandler(crmSvc)

	inventoryRepo := inventorymod.NewRepository(deps.DB)
	inventorySvc := inventorymod.NewService(inventoryRepo)
	inventoryHandler := inventorymod.NewHandler(inventorySvc)

	staffRepo := staffmod.NewRepository(deps.DB)
	staffSvc := staffmod.NewService(staffRepo)
	staffHandler := staffmod.NewHandler(staffSvc)

	platformHandler := platformmod.NewHandler(platformSvc)
	platformFeaturesHandler := platformmod.NewFeaturesHandler(featureSvc)

	notifier := &notificationsmod.MultiNotifier{
		SMS:      notificationsmod.NewAfricasTalkingSMS(deps.Logger),
		WhatsApp: notificationsmod.NewMetaWhatsApp(deps.Logger),
	}
	notificationsRepo := notificationsmod.NewRepository(deps.DB)
	notificationsSvc := notificationsmod.NewService(notificationsRepo, notifier)
	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr(deps.Config.RedisURL)})
	notificationsHandler := notificationsmod.NewHandler(notificationsSvc, asynqClient)

	pesapalClient := pesapalmod.NewClient(deps.Logger)
	pesapalSvc := pesapalmod.NewService(pesapalClient, idemStore, ledgerSvc, realtimeHub, deps.Logger)
	pesapalHandler := pesapalmod.NewHandler(pesapalSvc)

	app := fiber.New(fiber.Config{
		AppName:      "Haus of Wellness API",
		ErrorHandler: defaultErrorHandler,
	})

	app.Use(requestid.New())
	app.Use(recover.New())
	app.Use(logging.RequestLogger(deps.Logger))
	app.Use(cors.New(cors.Config{
		AllowOrigins: joinOrigins(deps.Config.CORSOrigins),
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, Idempotency-Key, X-Request-ID",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		status := fiber.Map{"status": "ok"}
		if err := deps.DB.WithContext(c.UserContext()).Exec("SELECT 1").Error; err != nil {
			status["database"] = "down"
			status["status"] = "degraded"
		} else {
			status["database"] = "up"
		}
		if deps.Redis != nil {
			if err := deps.Redis.Ping(c.UserContext()).Err(); err != nil {
				status["redis"] = "down"
				status["status"] = "degraded"
			} else {
				status["redis"] = "up"
			}
		} else {
			status["redis"] = "down"
			status["status"] = "degraded"
		}
		return c.JSON(status)
	})

	app.Get("/metrics", func(c *fiber.Ctx) error {
		c.Set("Content-Type", "text/plain; version=0.0.4")
		return c.SendString("# HELP haus_up API process is up.\n# TYPE haus_up gauge\nhaus_up 1\n")
	})

	v1 := app.Group("/api/v1")
	authmod.RegisterRoutes(v1, jwtSvc, authHandler)
	platformmod.RegisterRoutes(v1, jwtSvc, platformSvc, platformHandler, platformFeaturesHandler)
	pesapalmod.RegisterRoutes(v1, pesapalHandler)
	bookingmod.RegisterPublicRoutes(v1, publicBookingHandler)

	org := v1.Group("/organizations/:org",
		platformauth.JWT(jwtSvc, false),
		platformtenancy.ResolveOrganization(tenancySvc),
	)
	platformrealtime.RegisterRoutes(v1, org, jwtSvc, realtimeHandler)
	tenancymod.RegisterRoutes(v1, jwtSvc, tenancySvc, tenancyHandler)
	bookingmod.RegisterOrgRoutes(org, featureSvc, bookingHandler)
	posmod.RegisterOrgRoutes(org, featureSvc, posHandler)
	ledgermod.RegisterOrgRoutes(org, ledgerHandler)
	payoutmod.RegisterOrgRoutes(org, payoutHandler)
	crmmod.RegisterOrgRoutes(org, featureSvc, crmHandler)
	inventorymod.RegisterOrgRoutes(org, featureSvc, inventoryHandler)
	staffmod.RegisterOrgRoutes(org, staffHandler)
	platformmod.RegisterOrgAuditRoute(org, platformHandler)
	notificationsmod.RegisterOrgRoutes(org, jwtSvc, notificationsHandler)

	return app, nil
}

func redisAddr(redisURL string) string {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		return "localhost:6379"
	}
	return opts.Addr
}

func joinOrigins(origins []string) string {
	if len(origins) == 0 {
		return "*"
	}
	out := origins[0]
	for i := 1; i < len(origins); i++ {
		out += "," + origins[i]
	}
	return out
}

func defaultErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"type":   "about:blank",
		"title":  httpTitle(code),
		"status": code,
		"detail": err.Error(),
	})
}

func httpTitle(code int) string {
	switch code {
	case fiber.StatusNotFound:
		return "Not Found"
	case fiber.StatusUnauthorized:
		return "Unauthorized"
	default:
		return "Error"
	}
}
