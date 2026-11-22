/**
 * EPMCDMETST-71978: Deployment Guide
 * 
 * Instructions for deploying login form to production
 * Includes monitoring, rollback, and verification steps
 */

# EPMCDMETST-71978: Login Form - Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing (`npm run test`)
- [ ] Test coverage >80% (`npm run test:coverage`)
- [ ] Zero ESLint errors/warnings (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Production build succeeds (`npm run build`)

### E2E Tests
- [ ] Chrome E2E tests passing
- [ ] Firefox E2E tests passing
- [ ] Safari E2E tests passing
- [ ] Edge E2E tests passing
- [ ] Keyboard navigation working
- [ ] Accessibility tests (axe-core) passing

### Acceptance Criteria
- [ ] AC-1: Email/Password fields, required, masked, labeled ✓
- [ ] AC-2: Email validation (RFC 5322), password validation (8-char), error display ✓
- [ ] AC-3: Submit button enabled, loading state, server errors inline ✓
- [ ] AC-4: Network errors, timeout, duplicate submission prevention ✓
- [ ] AC-5: Cross-browser (Chrome, Firefox, Safari, Edge), responsive ✓
- [ ] AC-6: Design system components, styling, branding ✓
- [ ] AC-7: Keyboard nav, error announcements, labels, focus ✓

### Security Sign-Off
- [ ] HttpOnly cookie configured (XSS-resistant)
- [ ] CSRF protection verified (SameSite=Strict)
- [ ] HTTPS/TLS required in production
- [ ] No sensitive data in logs or error messages
- [ ] No user enumeration in error messages
- [ ] Password timeout handling (10s + 1 retry)
- [ ] Rate limiting indicators implemented
- [ ] Security team approval obtained

### Performance
- [ ] Form load time <2 seconds
- [ ] Lighthouse score >90
- [ ] Bundle size optimized (code splitting, minification)
- [ ] No console errors/warnings in production build

## Deployment Steps

### 1. Create Production Build

```bash
npm run build
# Output: dist/ directory with optimized assets
```

### 2. Verify Build Output

```bash
ls -la dist/
# Should contain:
# - index.html (entry point)
# - assets/ (JS, CSS bundles)
# - Source maps (for debugging)
```

### 3. Deploy to Server/CDN

**Option A: Static Hosting (Vercel, Netlify, AWS S3 + CloudFront)**
```bash
# Deploy dist/ directory
vercel deploy dist/
# or
netlify deploy --prod --dir dist/
```

**Option B: Docker Container**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY dist ./dist
COPY public ./public
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
```

**Option C: Backend Integration**
```bash
# Copy dist/ to backend static files directory
cp -r dist/* /path/to/backend/static/login/
```

### 4. Environment Configuration

Create `.env.production`:
```bash
VITE_API_BASE_URL=https://api.production.com/api
VITE_API_LOGIN_ENDPOINT=/auth/login
VITE_API_TIMEOUT_MS=10000
VITE_AUTH_COOKIE_NAME=sessionToken
VITE_AUTH_REDIRECT_URL=/dashboard
VITE_SHOW_PASSWORD_TOGGLE=true
VITE_ENABLE_RATE_LIMIT_DISPLAY=true
```

### 5. SSL/TLS Certificate

Ensure HTTPS is configured:
```bash
# Verify certificate validity
openssl s_client -connect api.production.com:443
# Certificate should be valid and trusted
```

### 6. Test Deployment

```bash
# Smoke tests
curl -X GET https://your-domain.com/
# Should return 200 with HTML content

# Test login form loads
curl -X GET https://your-domain.com/login
# Should return 200 with login form

# Test API connectivity
curl -X POST https://api.production.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Should return expected response
```

### 7. Monitoring & Alerts

Set up monitoring for:
- [ ] **Form Load Time**: Alert if >3 seconds
- [ ] **Login Success Rate**: Alert if <90%
- [ ] **API Error Rate**: Alert if >5%
- [ ] **Timeout Rate**: Alert if >2%
- [ ] **Network Errors**: Alert if any 5xx responses
- [ ] **User Engagement**: Track form completion rate

Example monitoring (Datadog, New Relic, etc.):
```javascript
// Track login attempt
analytics.track('login_attempt', {
  email: sanitized_email,
  timestamp: Date.now(),
});

// Track success
analytics.track('login_success', {
  userId: user.id,
  duration: formSubmitTime,
});

// Track error
analytics.track('login_error', {
  errorType: error.type,
  errorCode: error.code,
  retryCount: retries,
});
```

### 8. Logging & Debugging

Enable structured logging:
```bash
# Production logs should include:
# - Timestamp
# - Error type (not system details)
# - Status code
# - Request ID (for tracing)
# - User ID (if authenticated)

# Log example:
# 2026-11-13T22:32:45.175Z [ERROR] login_failed - type:INVALID_CREDENTIALS - status:401 - req_id:abc123
```

### 9. Rollback Plan

If critical issues occur:

**Immediate Rollback (< 5 minutes)**:
```bash
# Revert to previous version
git checkout <previous-tag>
npm run build
npm run deploy
```

**Automatic Rollback Triggers**:
- Error rate >10%
- Form load time >5 seconds
- API timeout rate >5%

**Manual Rollback Process**:
1. Monitor dashboard detects issue
2. On-call engineer verifies issue
3. Execute rollback script
4. Test login form in production
5. Post-incident review

## Post-Deployment Verification

### Day 1 Checks
- [ ] Form loads correctly in all browsers
- [ ] Login with valid credentials works
- [ ] Error messages display correctly
- [ ] Network timeout handling works
- [ ] Logout clears session
- [ ] HTTPS enforced
- [ ] No console errors/warnings

### Week 1 Metrics
- [ ] Form completion rate >85%
- [ ] Error retry success rate >80%
- [ ] Zero critical bugs reported
- [ ] Performance metrics stable
- [ ] User feedback positive

### Monthly Review
- [ ] Feature adoption metrics
- [ ] Error trends
- [ ] Performance trends
- [ ] Security incidents (if any)
- [ ] User feedback summary

## Support & Troubleshooting

### Common Issues

**Issue**: Form not loading
```bash
# Check browser console for errors
# Verify network tab for failed requests
# Check CORS settings if API is different domain
```

**Issue**: Login timeout
```bash
# Verify API server is responding
# Check network latency (ping, tracert)
# Increase timeout if necessary (in .env)
```

**Issue**: Session not persisting
```bash
# Verify HttpOnly cookie is being set
# Check cookie domain and path
# Verify backend is sending Set-Cookie header
```

## Contacts

- **On-Call Engineer**: [Escalation Path]
- **Security Team**: [Contact Info]
- **DevOps Team**: [Contact Info]
- **Backend API Owner**: [Contact Info]

---

**Status**: Production Ready (All checks passing)  
**Version**: 1.0.0  
**Deploy Date**: 2026-11-13  
**Next Review**: 2026-11-20
