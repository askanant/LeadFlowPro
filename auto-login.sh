#!/bin/bash

# Auto-login script for LeadFlowPro

echo "🔐 Starting auto-login setup..."

# Credentials
EMAIL="test@leadflow.io"
PASSWORD="Test@123456"
COMPANY_NAME="Test Company"

# API Base URL
API_URL="http://localhost:3000/api/v1"

echo "📝 Step 1: Registering test user..."

# Try to register first
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"companyName\": \"$COMPANY_NAME\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

echo "Register response: $REGISTER_RESPONSE"

echo ""
echo "🔑 Step 2: Logging in with test credentials..."

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Login response: $LOGIN_RESPONSE"

# Extract tokens
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed! Check API is running on port 3000"
  exit 1
fi

echo ""
echo "✅ Login successful!"
echo "📌 Access Token: ${ACCESS_TOKEN:0:50}..."
echo "📌 Refresh Token: ${REFRESH_TOKEN:0:50}..."

# Create HTML file to auto-inject tokens into localStorage
cat > "/tmp/auto-login.html" << AUTOLOGIN
<!DOCTYPE html>
<html>
<head>
    <title>Auto-Login in Progress...</title>
    <script>
        // Store tokens in localStorage
        localStorage.setItem('leadflow-auth', JSON.stringify({
            token: "$ACCESS_TOKEN",
            refreshToken: "$REFRESH_TOKEN",
            user: {
                id: "auto-login",
                email: "$EMAIL",
                name: "Test User",
                role: "super_admin",
                tenantId: "auto-login"
            },
            isAuthenticated: true,
            needsSetup: false
        }));
        
        console.log("✅ Auto-login tokens stored in localStorage");
        console.log("Redirecting to dashboard...");
        
        // Redirect to dashboard
        window.location.href = "http://localhost:5173/";
    </script>
</head>
<body>
    <h1>Auto-Login in Progress...</h1>
    <p>Tokens are being stored. You will be redirected to the dashboard shortly.</p>
</body>
</html>
AUTOLOGIN

echo ""
echo "✅ Auto-login HTML file created at: /tmp/auto-login.html"
echo ""
echo "📝 Next steps:"
echo "  1. Open http://localhost:5173/ in your browser"
echo "  2. Open browser DevTools console (F12)"
echo "  3. Paste this command:"
echo ""
echo "localStorage.setItem('leadflow-auth', JSON.stringify({token:'$ACCESS_TOKEN',refreshToken:'$REFRESH_TOKEN',user:{id:'u1',email:'$EMAIL',name:'Test User',role:'super_admin',tenantId:'t1'},isAuthenticated:true,needsSetup:false})); location.href='http://localhost:5173/';"
echo ""

