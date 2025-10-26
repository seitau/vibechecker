# Project Structure

vibechecker now follows a monorepo structure inspired by vibe-kanban:

```
vibechecker/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── lib/        # Utilities (git, parseDiff, export, etc.)
│   │   └── types/      # TypeScript types
│   ├── public/         # Static assets
│   ├── index.html      # HTML entry point
│   ├── vite.config.ts  # Vite configuration
│   ├── tsconfig.json   # TypeScript config
│   └── package.json    # Frontend dependencies
│
├── server/            # Express backend server
│   ├── src/
│   │   └── index.ts   # Server entry point (git API)
│   ├── tsconfig.json  # TypeScript config
│   └── package.json   # Server dependencies
│
├── shared/            # Shared code between frontend/server
│   ├── types/
│   │   └── model.ts   # Shared TypeScript types
│   └── package.json
│
└── package.json       # Root workspace configuration

## Development

```bash
# Start both frontend and server
npm run dev

# Start frontend only
npm run frontend:dev

# Start server only
npm run server:dev

# Build all workspaces
npm run build

# Run tests
npm run test
```

## Benefits of this structure

1. **Clear separation of concerns** - Frontend, server, and shared code are in separate directories
2. **NPM workspaces** - Shared dependencies managed at root level
3. **Independent builds** - Each workspace can be built independently
4. **Scalability** - Easy to add new packages (e.g., CLI, mobile app)
5. **Follows best practices** - Similar structure to vibe-kanban and other modern TypeScript projects
