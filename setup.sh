#!/bin/bash

# AI Interview Assistant - Setup Script
# This script automates the initial setup process

echo "🚀 AI Interview Assistant - Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.9 or higher."
    exit 1
fi

echo "✓ Node.js $(node --version) detected"
echo "✓ Python $(python3 --version) detected"
echo ""

# Frontend setup
echo "📦 Installing frontend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Frontend dependency installation failed"
    exit 1
fi
echo "✓ Frontend dependencies installed"
echo ""

# Backend setup
echo "📦 Setting up backend environment..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Backend dependency installation failed"
    exit 1
fi
echo "✓ Backend dependencies installed"
cd ..
echo ""

# Create environment files if they don't exist
echo "📝 Setting up environment files..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✓ Created .env file from template"
    echo "⚠️  Please edit .env and add your API keys"
else
    echo "✓ .env file already exists"
fi

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✓ Created backend/.env file from template"
    echo "⚠️  Please edit backend/.env and add your API keys"
else
    echo "✓ backend/.env file already exists"
fi
echo ""

# Summary
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env and backend/.env with your API keys"
echo "2. Set up Supabase database (run schema from supabase/schema.sql)"
echo "3. Start backend: cd backend && python main.py"
echo "4. Start frontend: npm run dev"
echo ""
echo "📚 Documentation:"
echo "- Quick Start: See SETUP_GUIDE.md"
echo "- Full Documentation: See README.md"
echo "- Architecture: See ARCHITECTURE.md"
echo ""
echo "🎉 Happy interviewing!"

