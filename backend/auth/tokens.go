package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenService struct {
	db           *sql.DB
	jwtSecret    []byte
	accessTTL    time.Duration
	refreshTTL   time.Duration
}

func NewTokenService(db *sql.DB, jwtSecret string, accessTTL, refreshTTL time.Duration) *TokenService {
	return &TokenService{
		db:           db,
		jwtSecret:    []byte(jwtSecret),
		accessTTL:    accessTTL,
		refreshTTL:   refreshTTL,
	}
}

// GenerateAccessToken creates a new JWT access token
func (ts *TokenService) GenerateAccessToken(user *User, teamID string) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID: user.ID,
		Role:   user.Role,
		TeamID: teamID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ts.accessTTL)),
			Issuer:    "emr-calendar",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(ts.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign JWT token: %w", err)
	}

	return tokenString, nil
}

// GenerateRefreshToken creates a new refresh token and stores it in database
func (ts *TokenService) GenerateRefreshToken(userID string) (string, error) {
	// Generate a random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}

	tokenString := hex.EncodeToString(tokenBytes)

	// Hash the token for storage
	hash := sha256.Sum256([]byte(tokenString))
	tokenHash := hex.EncodeToString(hash[:])

	// Store in database
	expiresAt := time.Now().Add(ts.refreshTTL)
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)`

	now := time.Now()
	_, err := ts.db.Exec(query, userID, tokenHash, expiresAt, now, now)
	if err != nil {
		return "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return tokenString, nil
}

// ValidateAccessToken validates and parses a JWT access token
func (ts *TokenService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return ts.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token and returns the user ID
func (ts *TokenService) ValidateRefreshToken(tokenString string) (string, error) {
	// Hash the provided token
	hash := sha256.Sum256([]byte(tokenString))
	tokenHash := hex.EncodeToString(hash[:])

	// Query database for the token
	query := `
		SELECT user_id, expires_at
		FROM refresh_tokens
		WHERE token_hash = $1 AND expires_at > $2`

	var userID string
	var expiresAt time.Time

	err := ts.db.QueryRow(query, tokenHash, time.Now()).Scan(&userID, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("invalid or expired refresh token")
		}
		return "", fmt.Errorf("failed to validate refresh token: %w", err)
	}

	return userID, nil
}

// RevokeRefreshToken removes a refresh token from the database
func (ts *TokenService) RevokeRefreshToken(tokenString string) error {
	// Hash the provided token
	hash := sha256.Sum256([]byte(tokenString))
	tokenHash := hex.EncodeToString(hash[:])

	// Delete from database
	query := `DELETE FROM refresh_tokens WHERE token_hash = $1`
	result, err := ts.db.Exec(query, tokenHash)
	if err != nil {
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("refresh token not found")
	}

	return nil
}

// RevokeAllRefreshTokens removes all refresh tokens for a user
func (ts *TokenService) RevokeAllRefreshTokens(userID string) error {
	query := `DELETE FROM refresh_tokens WHERE user_id = $1`
	_, err := ts.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to revoke all refresh tokens: %w", err)
	}
	return nil
}

// CleanExpiredTokens removes expired refresh tokens from the database
func (ts *TokenService) CleanExpiredTokens() error {
	query := `DELETE FROM refresh_tokens WHERE expires_at < $1`
	_, err := ts.db.Exec(query, time.Now())
	if err != nil {
		return fmt.Errorf("failed to clean expired tokens: %w", err)
	}
	return nil
}