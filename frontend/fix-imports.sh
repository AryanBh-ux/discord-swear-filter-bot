#!/bin/bash
echo "🔧 Fixing import paths..."

# Fix import paths in all TSX files
find src -name "*.tsx" -type f -exec sed -i 's/@Components\//@\/components\//g' {} \;

echo "✅ Import paths fixed!"
