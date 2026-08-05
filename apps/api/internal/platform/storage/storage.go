package storage

import (
	"bytes"
	"context"
	"fmt"
	"mime"
	"path"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
	// PublicURL overrides the base URL used to build object links (e.g. a CDN or R2 public domain).
	// Falls back to the endpoint when empty.
	PublicURL string
}

func (c Config) Enabled() bool {
	return c.Endpoint != "" && c.Bucket != ""
}

type Client struct {
	cfg       Config
	mc        *minio.Client
	ensureErr error
	ensureOne sync.Once
}

func New(cfg Config) (*Client, error) {
	endpoint := cfg.Endpoint
	if strings.HasPrefix(endpoint, "https://") {
		endpoint = strings.TrimPrefix(endpoint, "https://")
		cfg.UseSSL = true
	} else if strings.HasPrefix(endpoint, "http://") {
		endpoint = strings.TrimPrefix(endpoint, "http://")
		cfg.UseSSL = false
	}
	cfg.Endpoint = endpoint
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("storage client: %w", err)
	}
	return &Client{cfg: cfg, mc: mc}, nil
}

// ensureBucket creates the bucket and grants anonymous read on first use so uploaded
// object URLs are directly viewable (dev/MinIO posture; swap for signed GET in prod R2).
func (c *Client) ensureBucket(ctx context.Context) error {
	c.ensureOne.Do(func() {
		exists, err := c.mc.BucketExists(ctx, c.cfg.Bucket)
		if err != nil {
			c.ensureErr = fmt.Errorf("bucket exists check: %w", err)
			return
		}
		if !exists {
			if err := c.mc.MakeBucket(ctx, c.cfg.Bucket, minio.MakeBucketOptions{}); err != nil {
				c.ensureErr = fmt.Errorf("make bucket: %w", err)
				return
			}
		}
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}]
		}`, c.cfg.Bucket)
		// Best-effort: object still uploads even if the policy can't be set (e.g. R2 in prod).
		_ = c.mc.SetBucketPolicy(ctx, c.cfg.Bucket, policy)
	})
	return c.ensureErr
}

// UploadObject stores data under prefix/<uuid><ext> and returns its public URL.
func (c *Client) UploadObject(ctx context.Context, prefix, filename string, data []byte, contentType string) (string, error) {
	if err := c.ensureBucket(ctx); err != nil {
		return "", fmt.Errorf("storage bucket: %w", err)
	}
	if contentType == "" {
		if ext := path.Ext(filename); ext != "" {
			contentType = mime.TypeByExtension(ext)
		}
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}
	key := path.Join(strings.Trim(prefix, "/"), uuid.NewString()+sanitizeExt(filename))
	if _, err := c.mc.PutObject(ctx, c.cfg.Bucket, key, bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
	}); err != nil {
		return "", fmt.Errorf("storage put: %w", err)
	}
	return c.PublicURL(key), nil
}

func (c *Client) PublicURL(key string) string {
	base := c.cfg.PublicURL
	if base == "" {
		scheme := "http"
		if c.cfg.UseSSL {
			scheme = "https"
		}
		base = fmt.Sprintf("%s://%s", scheme, c.cfg.Endpoint)
	}
	return strings.TrimRight(base, "/") + "/" + c.cfg.Bucket + "/" + key
}

func sanitizeExt(filename string) string {
	ext := path.Ext(filename)
	if ext == "" || len(ext) > 10 {
		return ""
	}
	var b strings.Builder
	for _, r := range ext {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
