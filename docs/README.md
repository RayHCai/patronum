# Implementation Documentation

This directory contains the complete implementation plan for the **AI Group Conversational Stimulation Platform for Dementia**, split into manageable sections for easier development and reference.

## 📚 Documentation Structure

The implementation plan has been organized into **17 focused documents** covering different aspects of the platform:

- **Architecture & Setup** (Sections 0-5)
- **Frontend Design** (Sections 6-7)
- **API & Data** (Sections 8-10)
- **UI/UX Details** (Section 11)
- **Development Process** (Sections 12-14)
- **Analytics** (Section 15)
- **Best Practices** (Section 16)

## 🚀 Start Here

**New to the project?** Begin with these three files in order:

1. **[INDEX.md](./INDEX.md)** - Complete navigation guide with recommended reading order
2. **[00-overview.md](./00-overview.md)** - Project overview and philosophy
3. **[12-implementation-order.md](./12-implementation-order.md)** - Step-by-step development guide

## ⭐ Most Important Files

### For Patient-Facing Features:
- **[06-patient-ux-design.md](./06-patient-ux-design.md)** - CRITICAL: All patient interfaces must follow these guidelines

### For Starting Development:
- **[12-implementation-order.md](./12-implementation-order.md)** - Follow this phase-by-phase guide

### For Understanding the System:
- **[03-core-architecture.md](./03-core-architecture.md)** - Core conversation orchestrator
- **[02-database-schema.md](./02-database-schema.md)** - Data model

## 📖 Full File List

```
docs/
├── INDEX.md                          # Master navigation (START HERE)
├── README.md                         # This file
├── 00-overview.md                    # Project overview
├── 01-project-structure.md           # File organization
├── 02-database-schema.md             # Prisma schema
├── 03-core-architecture.md           # Orchestrator design
├── 04-backend-services.md            # Backend implementations
├── 05-websocket-protocol.md          # Real-time protocol
├── 06-patient-ux-design.md          # ⭐ Patient interface design
├── 07-admin-frontend.md             # Admin interface design
├── 08-api-routes.md                 # REST endpoints
├── 09-cst-topic-bank.md             # Conversation topics
├── 10-prompt-templates.md           # AI prompts
├── 11-animation-guide.md            # Framer Motion specs
├── 12-implementation-order.md       # ⭐ Build guide
├── 13-environment-variables.md      # Required env vars
├── 14-package-dependencies.md       # npm packages
├── 15-conversation-graph.md         # Analytics visualization
└── 16-critical-notes.md             # Important warnings
```

## 🎯 Quick Reference by Role

### Frontend Developer
```bash
cat 06-patient-ux-design.md        # Patient UX guidelines
cat 07-admin-frontend.md           # Admin UX guidelines
cat 11-animation-guide.md          # Animation specs
cat 01-project-structure.md        # Component structure
```

### Backend Developer
```bash
cat 02-database-schema.md          # Database model
cat 03-core-architecture.md        # System design
cat 04-backend-services.md         # Service layer
cat 05-websocket-protocol.md       # WebSocket events
```

### Full-Stack Developer
```bash
cat INDEX.md                       # Master guide
cat 12-implementation-order.md     # Build sequence
cat 06-patient-ux-design.md        # UX requirements
cat 03-core-architecture.md        # System overview
```

## 💡 Why Split Documents?

The original `implementation.md` was 3,379 lines (116KB), making it:
- ❌ Too large for context windows
- ❌ Difficult to navigate
- ❌ Hard to reference specific sections

These split documents are:
- ✅ Context-window friendly (largest is 680 lines)
- ✅ Easy to navigate and search
- ✅ Perfect for targeted development
- ✅ Better for collaboration

## 🔧 Usage with Claude Code

When asking Claude Code to implement features, reference specific files:

```
"Build the patient login page following the specs in
docs/06-patient-ux-design.md, Section 6.2 Step 2"

"Implement the conversation orchestrator from
docs/03-core-architecture.md"

"Set up the database schema from
docs/02-database-schema.md"
```

## 📝 Notes

- Each file is self-contained with necessary context
- Cross-references use relative paths (./filename.md)
- All patient UX specifications consolidated in file 06
- Implementation order includes testing checkpoints
- Critical warnings in file 16

## 🔗 Related Files

- **[../PATIENT_UX_GUIDE.md](../PATIENT_UX_GUIDE.md)** - Original detailed patient UX guide
- **[../README_PATIENT_FLOW.md](../README_PATIENT_FLOW.md)** - Patient flow quick reference
- **[../implementation.md](../implementation.md)** - Original consolidated file (for reference only)

---

**Last Updated**: 2026-02-12
**Total Sections**: 17
**Total Lines**: ~3,400
**Organization**: Modular by feature/concern
