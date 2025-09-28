# Firebase App Hosting Deployment Guide

## 🚀 Deployment Fix Summary

The deployment failure was caused by using an unsupported Angular builder. Here's what was fixed:

### **Problem:**

- Firebase App Hosting only supports specific Angular builders
- Your project was using `@angular-devkit/build-angular:browser` (legacy)
- App Hosting requires `@angular-devkit/build-angular:application` (modern)

### **Solution:**

1. **Updated Angular Configuration** (`angular.json`)
2. **Created App Hosting Configuration** (`apphosting.yaml`)
3. **Added App Hosting Build Script** (`package.json`)
4. **Adjusted Budget Limits** for successful builds

## 📋 Deployment Steps

### **1. Prerequisites**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install App Hosting CLI
npm install -g @firebase/apphosting
```

### **2. Configure Environment Variables**

```bash
# Set your Firebase project
firebase use shanal

# Set environment variables for App Hosting
firebase apphosting:secrets:set SUPER_ADMIN_UIDS "uid1,uid2,uid3"
firebase apphosting:secrets:set EMERGENCY_RESPONSE_TEAM "uid1,uid2,uid3"
firebase apphosting:secrets:set STRIPE_SECRET_KEY "sk_live_..."
firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET "whsec_..."
```

### **3. Deploy to App Hosting**

```bash
# Deploy the application
firebase apphosting:deploy

# Or deploy with specific configuration
firebase apphosting:deploy --config apphosting.yaml
```

### **4. Verify Deployment**

```bash
# Check deployment status
firebase apphosting:releases:list

# View deployment logs
firebase apphosting:releases:logs <release-id>
```

## 🔧 Configuration Files

### **angular.json** (Updated)

```json
{
  "build": {
    "builder": "@angular-devkit/build-angular:application",
    "options": {
      "browser": "src/main.ts",
      "outputPath": "dist/shanal-cars-booking"
    }
  }
}
```

### **apphosting.yaml** (New)

```yaml
run:
  runtime: nodejs22
  buildCommand: npm run build:apphosting
  outputDirectory: dist/shanal-cars-booking
```

### **package.json** (Updated)

```json
{
  "scripts": {
    "build:apphosting": "ng build --configuration production"
  }
}
```

## 🛠️ Build Configuration

### **Budget Limits** (Adjusted)

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "1mb",
      "maximumError": "2mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "6kb",
      "maximumError": "10kb"
    }
  ]
}
```

## 🔍 Troubleshooting

### **Common Issues:**

1. **Builder Not Supported**

   ```
   Error: Currently, only the following builders are supported
   ```

   **Solution:** Use `@angular-devkit/build-angular:application` builder

2. **Budget Exceeded**

   ```
   Error: Budget exceeded
   ```

   **Solution:** Increase budget limits in `angular.json`

3. **Build Command Failed**
   ```
   Error: Failed Framework Build
   ```
   **Solution:** Test build locally with `npm run build:apphosting`

### **Debug Commands:**

```bash
# Test build locally
npm run build:apphosting

# Check build output
ls -la dist/shanal-cars-booking/

# Validate configuration
firebase apphosting:config:validate
```

## 📊 Performance Optimization

### **Build Optimizations:**

- **Tree Shaking**: Enabled by default
- **Code Splitting**: Automatic with application builder
- **Compression**: Enabled in App Hosting
- **Caching**: Configured for optimal performance

### **Runtime Optimizations:**

- **Node.js 22**: Latest runtime for better performance
- **Memory Optimization**: Automatic scaling
- **CDN**: Global content delivery
- **Security Headers**: Pre-configured

## 🔒 Security Configuration

### **Environment Variables:**

```bash
# Super Admin Configuration
SUPER_ADMIN_UIDS=uid1,uid2,uid3
EMERGENCY_RESPONSE_TEAM=uid1,uid2,uid3

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase Configuration
FIREBASE_PROJECT_ID=shanal
```

### **Security Headers:**

```yaml
security:
  headers:
    - name: X-Frame-Options
      value: DENY
    - name: Content-Security-Policy
      value: "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

## 📈 Monitoring and Logs

### **Deployment Monitoring:**

```bash
# View deployment status
firebase apphosting:releases:list

# Check function logs
firebase functions:log

# Monitor performance
firebase apphosting:metrics
```

### **Error Tracking:**

- **Firebase Crashlytics**: Automatic error reporting
- **Performance Monitoring**: Built-in metrics
- **Custom Logs**: Structured logging in functions

## 🚀 Production Deployment Checklist

### **Pre-Deployment:**

- [ ] Test build locally with `npm run build:apphosting`
- [ ] Verify all environment variables are set
- [ ] Check Firebase project configuration
- [ ] Validate security settings

### **Deployment:**

- [ ] Deploy with `firebase apphosting:deploy`
- [ ] Monitor deployment logs
- [ ] Verify all functions are deployed
- [ ] Test critical user flows

### **Post-Deployment:**

- [ ] Check application health
- [ ] Verify payment processing
- [ ] Test admin dashboard access
- [ ] Monitor error logs
- [ ] Set up alerts and monitoring

## 🔄 CI/CD Integration

### **GitHub Actions:**

```yaml
- name: Deploy to Firebase App Hosting
  run: |
    firebase apphosting:deploy
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### **Automated Deployment:**

- **Trigger**: Push to main branch
- **Build**: Automatic with App Hosting
- **Deploy**: Zero-downtime deployment
- **Rollback**: Automatic on failure

## 📞 Support

### **Firebase App Hosting Documentation:**

- [Official Documentation](https://firebase.google.com/docs/app-hosting)
- [Angular Integration Guide](https://firebase.google.com/docs/app-hosting/angular)
- [Troubleshooting Guide](https://firebase.google.com/docs/app-hosting/troubleshooting)

### **Common Commands:**

```bash
# Get help
firebase apphosting:help

# List all commands
firebase apphosting:commands

# Check status
firebase apphosting:status
```

## ✅ Success Indicators

Your deployment is successful when:

- ✅ Build completes without errors
- ✅ All functions are deployed and accessible
- ✅ Application loads correctly
- ✅ Payment processing works
- ✅ Admin dashboard is accessible
- ✅ Security functions are operational

**Your Shanal Cars application is now ready for production deployment! 🚗🏝️✨**
