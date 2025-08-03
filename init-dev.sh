#!/bin/bash

# React Router Dev Mode + D1 + KV Local Development Initialization Script

set -e

echo "🚀 Initializing React Router dev mode local development environment..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Function to run initialization in background
init_db() {
    EXISTING_SQLITE=""
    # First, check if there's already a SQLite file from npm start
    if [ -d ".wrangler/state/v3/d1/miniflare-D1DatabaseObject" ]; then
        EXISTING_SQLITE=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name "*.sqlite" 2>/dev/null | head -n 1)
        if [ ! -z "$EXISTING_SQLITE" ]; then
            echo "📁 Found existing SQLite file from 'npm start': $(basename $EXISTING_SQLITE)"
        fi
    fi
    
    # Wait for dev server to be ready by checking if the port is open
    echo "⏳ Waiting for React Router dev server to be ready..."
    MAX_ATTEMPTS=30
    ATTEMPT=0
    while ! nc -z localhost 5173 2>/dev/null; do
        if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
            echo "❌ Timeout waiting for dev server to start"
            exit 1
        fi
        ATTEMPT=$((ATTEMPT + 1))
        sleep 1
    done
    echo "✅ Dev server is ready"

    # Make a request to trigger D1/KV creation
    echo "🌐 Triggering D1 and KV initialization..."
    curl -s http://localhost:5173 > /dev/null 2>&1 || true

    # Wait for SQLite file to be created
    echo "🔍 Waiting for D1 SQLite database to be created..."
    MAX_ATTEMPTS=10
    ATTEMPT=0
    SQLITE_PATH=""
    
    while [ -z "$SQLITE_PATH" ]; do
        if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
            echo "❌ Timeout waiting for SQLite database to be created"
            exit 1
        fi
        
        # Find all SQLite files
        ALL_SQLITE=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name "*.sqlite" 2>/dev/null)
        
        # If we have an existing SQLite from npm start, find the different one
        if [ ! -z "$EXISTING_SQLITE" ]; then
            for db in $ALL_SQLITE; do
                if [ "$db" != "$EXISTING_SQLITE" ]; then
                    SQLITE_PATH="$db"
                    break
                fi
            done
        else
            # If no existing SQLite, just take the first one
            SQLITE_PATH=$(echo "$ALL_SQLITE" | head -n 1)
        fi
        
        if [ -z "$SQLITE_PATH" ]; then
            ATTEMPT=$((ATTEMPT + 1))
            sleep 1
        fi
    done

    echo "✅ Found SQLite database for dev mode at: $SQLITE_PATH"

    # Create .env.local file
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
D1_LOCAL_URL=$SQLITE_PATH
EOF

    echo "✅ Created .env.local with D1_LOCAL_URL"

    # Run database migrations
    echo "🗄️  Running database migrations..."
    npm run db:migrate-local

    # Create .dev.vars.local if it doesn't exist
    if [ ! -f ".dev.vars.local" ]; then
        echo "📝 Creating .dev.vars.local template..."
        cat > .dev.vars.local << EOF
# Google OAuth credentials
CLIENT_SECRET=''
CLIENT_ID=''
SESSION_SECRET='$(openssl rand -base64 32)'
EOF
        echo "⚠️  Please update .dev.vars.local with your Google OAuth credentials"
    fi

    echo ""
    echo "✅ Initialization complete!"
    echo ""
    echo "🚀 React Router dev server is running on http://localhost:5173"
    echo ""
    echo "Next steps:"
    echo "1. Update .dev.vars.local with your Google OAuth credentials (if not already done)"
    echo "2. Visit http://localhost:5173 to access your application"
    echo "3. Press Ctrl+C to stop the server"
    echo ""
}

# Run initialization in background
init_db &

# Start React Router dev server in foreground
echo "🔄 Starting React Router dev server..."
exec npm run dev