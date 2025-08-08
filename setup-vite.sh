#!/bin/bash
echo "🚀 Setting up SwearFilter Dashboard with Vite..."

# Remove old frontend if exists
rm -rf frontend

# Create Vite project
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install
npm install socket.io-client @headlessui/react @heroicons/react
npm install chart.js react-chartjs-2 recharts  
npm install axios react-router-dom date-fns
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
npm install -D @types/node

# Initialize Tailwind
npx tailwindcss init -p

echo "✅ Vite setup complete!"
echo ""
echo "🚀 Start development:"
echo "  Backend: cd backend && python main.py"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:5000"
