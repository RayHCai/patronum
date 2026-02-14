# Implementation Plan Index

## AI Group Conversational Stimulation Platform for Dementia

This implementation plan has been split into manageable sections for easier navigation and development. Each section is self-contained and can be referenced independently.

---

## 📖 Quick Navigation

### Getting Started
- **[00. Overview](./00-overview.md)** - Project overview, patient-first philosophy, and critical success criteria

### Architecture & Setup
- **[01. Project Structure](./01-project-structure.md)** - Complete monorepo structure, file organization
- **[02. Database Schema](./02-database-schema.md)** - Prisma schema with PostgreSQL, all models and relationships
- **[03. Core Architecture](./03-core-architecture.md)** - Conversation orchestrator and state machine
- **[04. Backend Services](./04-backend-services.md)** - All backend service implementations
- **[05. WebSocket Protocol](./05-websocket-protocol.md)** - Real-time communication protocol

### Frontend Design Systems (CRITICAL)
- **[06. Patient UX Design](./06-patient-ux-design.md)** ⭐ **MOST IMPORTANT** - Super-intuitive interface design for dementia patients
  - Patient journey (8 steps)
  - Typography standards (22-26px fonts)
  - Button specifications (56-72px tall)
  - Conversation UI (voice-first, no clicking)
  - Error handling (friendly messages)
  - Implementation checklist
- **[07. Admin Frontend Architecture](./07-admin-frontend.md)** - Aura Health design system for clinicians/admins

### API & Data
- **[08. API Routes](./08-api-routes.md)** - REST API endpoint specifications
- **[09. CST Topic Bank](./09-cst-topic-bank.md)** - Conversation topics for sessions
- **[10. Prompt Templates](./10-prompt-templates.md)** - AI prompt templates for moderator and agents

### UI/UX Implementation
- **[11. Animation & Transition Guide](./11-animation-guide.md)** - Framer Motion spring physics, Aura Health animations

### Development Guide
- **[12. Implementation Order](./12-implementation-order.md)** ⭐ **START HERE FOR DEVELOPMENT** - Step-by-step build order with testing checkpoints
- **[13. Environment Variables](./13-environment-variables.md)** - Required env vars for server and client
- **[14. Package Dependencies](./14-package-dependencies.md)** - npm packages for both server and client

### Analytics & Visualization
- **[15. Conversation Graph & Component Visualization](./15-conversation-graph.md)** - D3.js conversation analysis

### Important Notes
- **[16. Critical Implementation Notes](./16-critical-notes.md)** - Must-read warnings and best practices

---

## 🎯 Recommended Reading Order

### For New Developers:
1. **[00. Overview](./00-overview.md)** - Understand the project
2. **[06. Patient UX Design](./06-patient-ux-design.md)** - Learn the critical design principles
3. **[12. Implementation Order](./12-implementation-order.md)** - Follow the step-by-step guide

### For Frontend Developers:
1. **[06. Patient UX Design](./06-patient-ux-design.md)** ⭐ **MUST READ**
2. **[07. Admin Frontend Architecture](./07-admin-frontend.md)**
3. **[11. Animation & Transition Guide](./11-animation-guide.md)**
4. **[01. Project Structure](./01-project-structure.md)** - Client folder structure

### For Backend Developers:
1. **[02. Database Schema](./02-database-schema.md)**
2. **[03. Core Architecture](./03-core-architecture.md)**
3. **[04. Backend Services](./04-backend-services.md)**
4. **[05. WebSocket Protocol](./05-websocket-protocol.md)**
5. **[08. API Routes](./08-api-routes.md)**

### For AI/ML Developers:
1. **[10. Prompt Templates](./10-prompt-templates.md)**
2. **[09. CST Topic Bank](./09-cst-topic-bank.md)**
3. **[03. Core Architecture](./03-core-architecture.md)**
4. **[04. Backend Services](./04-backend-services.md)**

---

## ⚠️ Critical Files

These files contain non-negotiable requirements:

1. **[06. Patient UX Design](./06-patient-ux-design.md)** - All patient-facing interfaces MUST follow these guidelines
2. **[12. Implementation Order](./12-implementation-order.md)** - Follow this order to avoid rework
3. **[16. Critical Implementation Notes](./16-critical-notes.md)** - Common pitfalls and how to avoid them

---

## 📊 File Size Reference

| File | Lines | Size | Complexity |
|------|-------|------|------------|
| 06-patient-ux-design.md | 576 | 21KB | HIGH - Read carefully |
| 07-admin-frontend.md | 680 | 26KB | HIGH - Detailed specs |
| 11-animation-guide.md | 476 | 12KB | MEDIUM |
| 15-conversation-graph.md | 304 | 8.3KB | MEDIUM |
| 12-implementation-order.md | 204 | 9.8KB | MEDIUM |
| 02-database-schema.md | 205 | 7.2KB | MEDIUM |
| Others | <200 | <7KB | LOW-MEDIUM |

---

## 🔗 Related Documents

- [PATIENT_UX_GUIDE.md](../PATIENT_UX_GUIDE.md) - Detailed patient UX specifications (integrated into Section 6)
- [README_PATIENT_FLOW.md](../README_PATIENT_FLOW.md) - Quick reference for patient journey (integrated into Section 6)

---

## 💡 Tips for Claude Code

- **Context Window Optimization**: Each file is now small enough to fit in context
- **Targeted Development**: Reference only the sections you need
- **Patient UX First**: Always check Section 6 before building patient-facing features
- **Testing Checkpoints**: Section 12 has testing checkpoints after each phase

---

## 🚀 Quick Start

To begin implementation:

```bash
# 1. Read the overview
cat docs/00-overview.md

# 2. Understand patient UX requirements (CRITICAL!)
cat docs/06-patient-ux-design.md

# 3. Follow the implementation order
cat docs/12-implementation-order.md

# 4. Set up the project structure
cat docs/01-project-structure.md
```

---

**Note**: The original consolidated file [implementation.md](../implementation.md) is still available but is not recommended for development due to its size (3,379 lines). Use these split files for better workflow.

---

Generated: 2026-02-12
