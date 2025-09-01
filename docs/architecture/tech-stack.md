# Tech Stack

This is the **DEFINITIVE technology selection** for the entire ChainTrace project. All development must use these exact versions and tools. This table serves as the single source of truth for AI agents and developers.

## Technology Stack Table

| Category                 | Technology                                 | Version              | Purpose                            | Rationale                                                                                                    |
| ------------------------ | ------------------------------------------ | -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Frontend Language**    | TypeScript                                 | 5.0+                 | Type-safe frontend development     | Prevents runtime errors, improves IDE support, enables shared types with backend                             |
| **Frontend Framework**   | Next.js                                    | 14.x                 | React framework with App Router    | SSR/SSG capabilities, optimized bundling, Vercel deployment integration, file-based routing                  |
| **UI Component Library** | Tailwind CSS + Headless UI                 | 3.4+ / 1.7+          | Styling and accessible components  | Rapid UI development, consistent design system, WCAG AA+ compliance, mobile-first responsive                 |
| **State Management**     | Zustand                                    | 4.4+                 | Lightweight state management       | Simple API, TypeScript support, minimal boilerplate, perfect for Hedera service state                        |
| **Backend Language**     | TypeScript                                 | 5.0+                 | Server-side logic consistency      | Shared types with frontend, familiar syntax for team, strong Hedera SDK support                              |
| **Backend Framework**    | Next.js API Routes                         | 14.x                 | Serverless API endpoints           | Integrated deployment, Edge Runtime support, minimal configuration overhead                                  |
| **API Style**            | REST + Real-time WebSockets                | HTTP/1.1 + WebSocket | Standard API with live updates     | REST for verification queries, WebSockets for dashboard updates via Supabase                                 |
| **Database**             | Supabase PostgreSQL                        | 15.x                 | Caching and real-time data         | Mirror Node cache, real-time subscriptions, built-in auth for expansion, SQL familiarity                     |
| **Cache**                | Supabase Real-time                         | Latest               | Live dashboard updates             | Real-time Mirror Node data sync, instant compliance dashboard updates                                        |
| **File Storage**         | Vercel Blob Storage                        | Latest               | QR code and document storage       | Integrated with deployment platform, edge distribution, simple API                                           |
| **Authentication**       | Hedera Wallet Snap/HashPack                | Latest               | Secure wallet-based auth           | Eliminates private key risks, leverages existing Hedera wallet ecosystem                                     |
| **Frontend Testing**     | Vitest + Testing Library                   | 1.0+ / 14.x          | Fast unit and integration tests    | Native ESM support, TypeScript integration, Jest-compatible API                                              |
| **Backend Testing**      | Vitest + Supertest                         | 1.0+ / 6.3+          | API endpoint testing               | Consistent tooling with frontend, serverless function testing support                                        |
| **E2E Testing**          | Playwright                                 | 1.40+                | Browser automation testing         | Reliable cross-browser testing, QR code scanning tests, mobile viewport testing                              |
| **Build Tool**           | Next.js Built-in (Webpack)                 | 14.x                 | Bundling and optimization          | **Stable production-ready bundling**, proven with Hedera SDK, extensive ecosystem support                    |
| **Bundler**              | Webpack (Next.js default)                  | 5.x                  | Reliable development builds        | **Battle-tested stability**, comprehensive plugin ecosystem, predictable behavior for hackathon timeline     |
| **IaC Tool**             | Vercel CLI + Supabase CLI                  | Latest               | Infrastructure deployment          | Declarative deployment, environment management, preview deployments                                          |
| **CI/CD**                | GitHub Actions + Vercel                    | Latest               | Automated deployment pipeline      | Free tier, integrated with Vercel, Hedera SDK compatibility                                                  |
| **Monitoring**           | Vercel Analytics + Console Logging         | Latest + Built-in    | Performance tracking and debugging | **Simplified error tracking** for hackathon scope, Vercel Analytics for performance, structured console logs |
| **Logging**              | Vercel Functions Logs + Structured Console | Built-in             | Request tracing and debugging      | **Zero-config logging solution**, integrated platform logging, JSON structured output for debugging          |
| **CSS Framework**        | Tailwind CSS                               | 3.4+                 | Utility-first styling system       | Rapid prototyping, consistent spacing, responsive design, dark mode support                                  |

## Hedera-Specific Dependencies

| Category                 | Technology                    | Version | Purpose                         | Rationale                                                      |
| ------------------------ | ----------------------------- | ------- | ------------------------------- | -------------------------------------------------------------- |
| **Hedera SDK**           | @hashgraph/sdk                | 2.40+   | Core Hedera service integration | Official SDK, comprehensive API coverage, TypeScript support   |
| **Wallet Integration**   | @hashgraph/hedera-wallet-snap | Latest  | Secure wallet operations        | MetaMask Snap integration, private key delegation              |
| **HashPack Integration** | hashconnect                   | 1.6+    | Alternative wallet support      | Broader wallet compatibility, testnet support, mobile-friendly |
| **Mirror Node Client**   | @hashgraph/mirror-node-client | Latest  | Optimized data queries          | Official Mirror Node SDK, better error handling than raw HTTP  |

## Development and Build Dependencies

| Category                   | Technology              | Version      | Purpose                      | Rationale                                                  |
| -------------------------- | ----------------------- | ------------ | ---------------------------- | ---------------------------------------------------------- |
| **Package Manager**        | npm                     | 10.x+        | Dependency management        | Node.js built-in, consistent lockfiles, security auditing  |
| **Code Formatting**        | Prettier                | 3.x          | Consistent code style        | Automatic formatting, team consistency, IDE integration    |
| **Code Linting**           | ESLint + Next.js Config | 8.x + Latest | Code quality enforcement     | Catches bugs, enforces standards, Next.js optimizations    |
| **Type Checking**          | TypeScript Compiler     | 5.0+         | Static type checking         | Build-time error catching, IDE support, refactoring safety |
| **Environment Management** | dotenv                  | 16.x+        | Environment variable loading | Local development configuration, secret management         |
