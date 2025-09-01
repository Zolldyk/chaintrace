# Requirements

## Functional Requirements

**FR1:** The system shall implement Custom Compliance Engine with Producer → Processor → Verifier role definitions for supply chain verification workflows.

**FR2:** The system shall automatically issue compliance verification credentials for compliant product batches through business rule validation.

**FR3:** The system shall log product journey events (creation, processing, verification) to HCS with immutable timestamps and actor identification.

**FR4:** The system shall provide a web interface for product lookup by ID or QR code scan displaying complete verification history.

**FR5:** The system shall generate QR codes for products enabling consumer verification without app downloads.

**FR6:** The system shall generate unique product identification codes that can be manually entered in the dashboard search bar for product information lookup.

**FR7:** The system shall retrieve product journey data from Mirror Node API within 30 seconds for verification lookups.

**FR8:** The system shall distribute HTS token rewards for verification actions on Hedera testnet.

**FR9:** The system shall display token balances and transaction history for reward recipients.

**FR10:** The system shall support cooperative manager batch logging of multiple products in under 2 minutes per batch.

**FR11:** The system shall provide regulatory observer dashboard showing verification patterns and compliance gaps.

**FR12:** The system shall show visual verification status indicators (verified/unverified/pending) that are instantly recognizable.

**FR13:** The system shall flag products that lack required verification credentials or have expired certifications.

**FR14:** The system shall support offline product code generation with later synchronization when connectivity is restored.

**FR15:** The system shall provide clear error messages and retry mechanisms for failed HCS logging attempts.

**FR16:** The system shall maintain local backup of critical product data until successful blockchain confirmation.

**FR17:** The system shall provide clear notification when token rewards are successfully distributed to participants.

**FR18:** The system shall display estimated Naira conversion values for earned tokens (presentation layer only for MVP).

## Non-Functional Requirements

**NFR1:** System response times for verification lookups must be under 30 seconds from request to result display.

**NFR2:** Web interface must be accessible via modern browsers (Chrome, Firefox, Safari, Edge) without specialized software.

**NFR3:** QR code scanning must work via browser camera API on both desktop and mobile devices.

**NFR4:** System must demonstrate 100% reliability during hackathon presentations with consistent function availability.

**NFR5:** All Hedera service integrations must operate within testnet free-tier limitations and constraints.

**NFR6:** System architecture must be designed for straightforward expansion to USSD, mobile money, and regulatory API integrations.

**NFR7:** Data logged to HCS must maintain immutability and cryptographic verification suitable for regulatory audit requirements.

**NFR8:** System must handle concurrent verification lookups from multiple users without performance degradation.
