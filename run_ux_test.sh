#!/bin/bash
# Manual UX Testing Helper Script
# This script helps you prepare for UX testing and provides quick checks

set -e

echo "=============================================="
echo "UX Testing Helper - Dashboard Agent"
echo "=============================================="
echo ""

# Check if services are running
echo "🔍 Checking if services are running..."
echo ""

# Check frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running on http://localhost:3000"
else
    echo "❌ Frontend is NOT running. Start with: cd frontend && npm run dev"
    exit 1
fi

# Check backend
if curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:8081"
elif curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:8080"
else
    echo "⚠️  Backend health check failed (this might be normal if /health endpoint doesn't exist)"
fi

echo ""
echo "=============================================="
echo "📋 Testing Setup Instructions"
echo "=============================================="
echo ""
echo "1. Open browser in INCOGNITO/PRIVATE mode"
echo "2. Navigate to: http://localhost:3000"
echo "3. Open DevTools (F12 or Cmd+Option+I)"
echo "4. Keep console and network tabs visible"
echo ""
echo "=============================================="
echo "🧪 Test Scenarios"
echo "=============================================="
echo ""
echo "SCENARIO 1: Narrative-Only"
echo "  Input: 'hello there'"
echo "  Expected: Friendly response, no empty viz tabs"
echo ""
echo "SCENARIO 2: SQL-Only Request"
echo "  Input: 'only provide SQL query for top products by revenue'"
echo "  Expected: SQL displayed clearly with copy button"
echo ""
echo "SCENARIO 3: Chart-Ready Prompt"
echo "  Input: 'show top products by revenue'"
echo "  Expected: Chart appears, SQL/Data tabs populated"
echo ""
echo "SCENARIO 4: Pin to Board"
echo "  Action: After Scenario 3, find and click 'Pin' button"
echo "  Expected: Item appears in My Board tab"
echo ""
echo "SCENARIO 5: Clear Board"
echo "  Action: In My Board, click 'Clear' button"
echo "  Expected: Confirmation modal, then empty state"
echo ""
echo "SCENARIO 6: Error Handling"
echo "  Input: '' (empty) or '@@@ invalid query'"
echo "  Expected: Clear error message with retry option"
echo ""
echo "=============================================="
echo "📝 Fill out report at:"
echo "  ./UX_TEST_REPORT.md"
echo ""
echo "📚 Read guidelines at:"
echo "  ./UX_TESTING_GUIDELINES.md"
echo "=============================================="
echo ""
echo "Press Enter to open report in editor..."
read

# Try to open in editor (works with common editors)
if command -v code > /dev/null; then
    code UX_TEST_REPORT.md
elif command -v cursor > /dev/null; then
    cursor UX_TEST_REPORT.md
elif command -v vim > /dev/null; then
    vim UX_TEST_REPORT.md
else
    echo "Please open UX_TEST_REPORT.md in your editor"
fi
