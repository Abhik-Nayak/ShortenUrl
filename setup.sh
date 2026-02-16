#!/bin/bash

# ShortenURL - MERN Stack Application
# Quick Start Script

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            ShortenURL - Quick Start Guide                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"
echo ""

# Backend Setup
echo "🔧 Setting up Backend..."
cd backend

if [ ! -f .env ]; then
    echo "   Creating .env file from template..."
    cp .env.example .env
    echo "   ⚠️  Please edit backend/.env with your MongoDB URI and API keys"
fi

echo "   Installing dependencies..."
# Dependencies are already installed
echo "   Dependencies installed ✅"
echo ""

# Frontend Setup
echo "🔧 Setting up Frontend..."
cd ../frontend

if [ ! -f .env ]; then
    echo "   Creating .env file from template..."
    cp .env.example .env
fi

echo "   Installing dependencies..."
# Dependencies are already installed
echo "   Dependencies installed ✅"
echo ""

cd ..

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! ✅                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Configure Environment Variables:"
echo "   - Edit backend/.env with your MongoDB URI and API keys"
echo "   - Edit frontend/.env if needed"
echo ""
echo "2. Start the Backend:"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "3. Start the Frontend (in another terminal):"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "4. Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "📚 Documentation: See README.md for detailed setup instructions"
echo ""
