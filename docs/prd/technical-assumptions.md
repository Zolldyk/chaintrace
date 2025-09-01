# Technical Assumptions

## Repository Structure: Monorepo

Single repository containing all ChainTrace components (frontend, backend services, Hedera integrations) for simplified hackathon development and demonstration. Clear separation between modules while maintaining unified deployment and version control.

## Service Architecture

**Hybrid Client-Side Heavy Architecture:** Primary web application runs client-side with direct Hedera service integrations where possible. Minimal backend services only for operations requiring private keys or server-side Custom Compliance Engine management. Architecture leverages Hedera's managed services (HCS, HTS, Mirror Node) and custom compliance logic to minimize development complexity while maintaining business rule flexibility.

## Testing Requirements

**Unit + Integration Testing:** Comprehensive unit tests for core verification logic and integration tests for Hedera service interactions. Automated testing for critical user journeys (product logging, verification lookup, token distribution) to ensure demonstration reliability. Manual testing protocols for UI/UX validation across target browsers and devices.

## Additional Technical Assumptions and Requests

**Frontend Technology Stack:**

- **Framework:** React.js with Next.js for rapid development and SSR capabilities
- **Styling:** Tailwind CSS for design system implementation and responsive layouts
- **State Management:** React Context/Zustand for application state and Hedera service integration
- **QR Integration:** Browser-native camera API with lightweight QR scanning library (qr-scanner or similar)

**Hedera Integration Stack:**

- **SDK:** Hedera JavaScript SDK for direct service interactions
- **Custom Compliance Engine:** Internal serverless business rule validation system (replaces Guardian) with configurable supply chain verification logic
- **HCS:** Dedicated topic for ChainTrace events with appropriate access controls
- **HTS:** Custom reward token on testnet with basic distribution mechanics
- **Mirror Node:** Primary data retrieval layer for product verification lookups
- **No Guardian Dependency:** MVP uses internal Custom Compliance Engine API endpoints rather than external Guardian service

**Development Environment:**

- **Runtime:** Node.js 18+ for development tooling and any backend services
- **Build Tools:** Vite or Next.js built-in bundling for fast development iteration
- **Package Management:** npm or yarn for dependency management
- **Code Quality:** ESLint + Prettier for consistent code formatting and quality

**Deployment & Hosting:**

- **Platform:** Vercel for frontend deployment with automatic builds and preview deployments
- **Environment Management:** Clear separation between development, testnet, and demonstration environments
- **Asset Management:** Optimized images and fonts for fast loading on various network conditions

**Security & Key Management:**

- **Private Key Encryption:** Foundry Cast wallet import for encrypted key management: `cast wallet import (accountName) --interactive`
- **Key Storage:** Encrypted private keys managed through Foundry's secure wallet system
- **Environment Variables:** Non-sensitive configuration managed through Vercel environment variables
- **Production Documentation:** Clear guidelines for secure key management in production environments

**Smart Contract Development:**

- **Foundry Role (MVP):** Limited to Cast key management system (`cast wallet import (accountName) --interactive`) for secure private key encryption and storage
- **No Custom Smart Contracts (MVP):** ChainTrace MVP leverages Hedera's managed services (HCS, HTS) and Custom Compliance Engine exclusively, eliminating need for custom smart contract development within hackathon timeline
- **Post-MVP Smart Contract Expansion:** Foundry reserved for future features requiring custom contract logic (advanced verification rules, cross-chain integrations, complex token economics)
- **Development Efficiency:** Hedera-native approach prioritizes rapid MVP development over custom contract complexity

**Security & Compliance:**

- **Input Validation:** Client-side and server-side validation for all user inputs and form submissions
- **Error Handling:** Comprehensive error boundaries and user-friendly error messages for network/service failures
- **Access Control:** Appropriate permissions and access patterns for Hedera service integrations

**Communication & Notifications:**

- **No Email/SMS Services Required:** MVP scope deliberately excludes email notifications or messaging services to focus on core blockchain verification functionality
- **In-App Notifications Only:** All user feedback provided through UI components and real-time dashboard updates
- **Post-MVP Communication:** Email/SMS notifications deferred to post-hackathon expansion phase
