#!/bin/bash

# QR Guardian Update Script
# Updates dependencies and rebuilds the project

set -e

echo "=========================================="
echo "  QR Guardian Update Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if we're in the right directory
cd "$PROJECT_ROOT"
print_status "Working directory: $PROJECT_ROOT"

echo ""
echo "1. Updating Frontend Dependencies..."
echo "------------------------------------"
if [ -d "frontend" ]; then
    cd frontend
    if command -v npm &> /dev/null; then
        npm update
        print_status "Frontend dependencies updated"

        # Check for outdated packages
        echo ""
        echo "Checking for outdated packages..."
        npm outdated || true
    else
        print_warning "npm not found, skipping frontend update"
    fi
    cd "$PROJECT_ROOT"
else
    print_warning "Frontend directory not found"
fi

echo ""
echo "2. Updating Backend Dependencies..."
echo "------------------------------------"
if [ -d "backend" ]; then
    cd backend
    if command -v pip &> /dev/null; then
        # Create/update virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            print_warning "Virtual environment not found. Creating..."
            python3 -m venv venv
        fi

        # Activate virtual environment
        source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

        pip install --upgrade pip
        pip install -r requirements.txt --upgrade
        print_status "Backend dependencies updated"

        deactivate 2>/dev/null || true
    else
        print_warning "pip not found, skipping backend update"
    fi
    cd "$PROJECT_ROOT"
else
    print_warning "Backend directory not found"
fi

echo ""
echo "3. Building Frontend..."
echo "------------------------------------"
if [ -d "frontend" ]; then
    cd frontend
    if command -v npm &> /dev/null; then
        npm run build
        print_status "Frontend build complete"
    fi
    cd "$PROJECT_ROOT"
fi

echo ""
echo "=========================================="
echo "  Update Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  - Start backend: cd backend && uvicorn main:app --reload"
echo "  - Start frontend: cd frontend && npm run dev"
echo "  - Or use Docker: docker-compose up"
echo ""
