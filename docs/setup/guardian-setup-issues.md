# Guardian Setup Issues - OpenSSL 3.0 Compatibility

## Overview

Guardian is a blockchain-based platform for environmental monitoring and carbon credit management built on the Hedera network. During our setup process, we encountered significant authentication issues preventing successful login and platform access.

## Issue Summary

**Problem**: JWT authentication fails with OpenSSL compatibility errors, preventing user login and platform functionality.

**Error**: `error:1E08010C:DECODER routines::unsupported`

**Impact**: Users cannot log in to Guardian, making the platform unusable despite successful service startup.

## Technical Background

### Architecture Context

- **Guardian Version**: Latest (pulled from gcr.io/hedera-registry)
- **Runtime**: Node.js 20.18.3
- **OpenSSL Version**: 3.0 (bundled with Node.js 20)
- **Host Architecture**: ARM64 (Apple Silicon Mac)
- **Container Platform**: Docker with docker-compose

### Root Cause Analysis

The issue stems from a compatibility problem between:

1. **Node.js 20** with **OpenSSL 3.0**
2. **JWT libraries** used in Guardian (jsonwebtoken, jws, jwa)
3. **RSA key format handling** in the authentication service

When Guardian's auth-service attempts to sign JWT tokens using RSA private keys, OpenSSL 3.0's stricter decoder routines reject the key format, causing authentication to fail completely.

## Diagnostic Journey

### Initial Symptoms

- 502 Bad Gateway errors on all API endpoints
- Services crashing shortly after startup
- WebSocket connection failures
- Complete inability to access Guardian functionality

### Investigation Steps

1. **Service Health Check**: Discovered services were exiting with code 1
2. **Log Analysis**: Found JWT configuration errors and missing private keys
3. **Configuration Fixes**: Updated JWT keys in `.env..guardian.system`
4. **Environment Resolution**: Set `GUARDIAN_ENV=""` to fix config file loading
5. **Architecture Investigation**: Identified ARM64/OpenSSL compatibility as root cause

### Solutions Attempted

#### ✅ Service Stability (Successful)

- **Problem**: Services crashing due to missing environment configuration
- **Solution**: Set `GUARDIAN_ENV=""` and ensured proper config file loading
- **Result**: Services now start and remain stable

#### ✅ x86_64 Emulation (Partially Successful)

- **Approach**: Added `platform: linux/amd64` to core Guardian services
- **Changes**: Modified docker-compose.yml for auth-service, api-gateway, guardian-service, etc.
- **Result**: Improved service stability, API endpoints now respond (HTTP 200)
- **Limitation**: JWT authentication still fails with same OpenSSL error

#### ❌ JWT Key Format Variations (Unsuccessful)

- Tried different RSA key formats
- Attempted HMAC symmetric keys
- Tested different environment configurations
- All approaches failed with same OpenSSL compatibility error

## Current Status

### ✅ Working Components

- Docker services start successfully and remain stable
- API Gateway responds to basic endpoints (e.g., `/api/v1/branding`)
- Frontend loads and displays properly
- Container networking and communication functional

### ❌ Failing Components

- JWT token generation fails in auth-service
- User login returns HTTP 500 errors
- Authentication-dependent features inaccessible
- Platform effectively unusable without login capability

### Key Error Location

```
File: /usr/local/app/dist/utils/user-access-token.js:27:30
Function: UserAccessTokenService.generateRefreshToken()
Error: error:1E08010C:DECODER routines::unsupported
```

## Next Steps & Options

### Option A: Community/Official Support

- Report issue to Guardian team on GitHub
- Wait for official OpenSSL 3.0 compatibility fix
- **Timeline**: Unknown, depends on team priorities
- **Effort**: Minimal for us, but uncertain timeline

### Option B: Container Version Rollback

- Find older Guardian container versions with Node.js < 20
- Use versions with OpenSSL 1.x compatibility
- **Challenges**: May lack latest features, security updates
- **Timeline**: 1-2 days investigation

### Option C: Codebase Contribution (Detailed Below)

- Fork Guardian repository
- Fix OpenSSL 3.0 compatibility issues
- Submit pull request to upstream
- **Timeline**: See analysis below

### Option D: Alternative Authentication

- Investigate if Guardian supports alternative auth methods
- Bypass JWT if possible (unlikely given architecture)
- **Feasibility**: Low, JWT appears core to Guardian's design

## Contribution Feasibility Analysis

### Complexity Assessment: **Medium-High**

#### What Needs to Be Fixed

1. **JWT Library Compatibility**: Update or replace jsonwebtoken/jws/jwa libraries
2. **Key Format Handling**: Ensure RSA key parsing works with OpenSSL 3.0
3. **Crypto Operations**: Update any direct OpenSSL calls to use compatible APIs
4. **Testing**: Verify all authentication flows work correctly

#### Estimated Timeline: **2-4 weeks**

**Week 1**: Environment setup and investigation

- Fork and clone Guardian repository
- Set up local development environment
- Reproduce issue in development setup
- Analyze codebase architecture and JWT usage patterns

**Week 2-3**: Implementation and testing

- Update JWT libraries to OpenSSL 3.0 compatible versions
- Modify key parsing and crypto operations
- Test authentication flows (login, token refresh, service-to-service auth)
- Handle edge cases and error scenarios

**Week 4**: Integration and contribution

- Run full Guardian test suite
- Create comprehensive pull request
- Work with Guardian team on review and integration

#### My Ability to Help: **Yes, with caveats**

**Strengths**:

- Strong understanding of JWT/crypto concepts
- Experience with Node.js and OpenSSL compatibility issues
- Good debugging and problem-solving skills
- Familiarity with Guardian's architecture from our investigation

**Limitations**:

- Would need to learn Guardian's specific codebase structure
- May need Guardian team guidance on architectural decisions
- Testing would require full Guardian ecosystem setup

#### Risk Factors

- **Breaking Changes**: JWT modifications could affect existing Guardian instances
- **Security Implications**: Crypto changes require careful security review
- **Ecosystem Impact**: Changes must work across all Guardian services
- **Upstream Acceptance**: No guarantee Guardian team will accept contribution

## Recommendation

Given the complexity and the fact that this affects the core authentication system, I recommend **Option A** (official support) as the primary approach, with **Option C** (contribution) as a secondary option if you're willing to invest the time.

The fix is definitely achievable, but it's a non-trivial change that affects Guardian's security layer. If you decide to pursue the contribution route, I can certainly help guide the process and work through the technical implementation.

## Technical Details for Reference

### Key Configuration Files

- `/Users/pc/ChainTrace/guardian/configs/.env..guardian.system` - Main JWT configuration
- `/Users/pc/ChainTrace/guardian/docker-compose.yml` - Service orchestration with x86_64 emulation

### Critical Services

- `auth-service`: Handles JWT token generation and validation
- `api-gateway`: Routes requests and validates tokens
- `guardian-service`: Core platform logic, depends on auth

### Error Context

The error occurs when jsonwebtoken library calls jws.sign(), which uses OpenSSL to perform RSA signing operations. OpenSSL 3.0's stricter validation rejects the key format or signing parameters that worked in OpenSSL 1.x.
