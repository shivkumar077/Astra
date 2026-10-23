# ASTRA Frontend Client

**Target Stack:** React 18/19 | TypeScript | Vite | Three.js | STOMP WebSocket Client

## Client Directory Proposal (Phase 6+)

```
frontend/
 ├── src/
 │    ├── assets/              # Celestial textures, normal maps, audio annunciators
 │    ├── components/          # Bespoke aerospace instrument UI components
 │    │    ├── common/         # Chamfered panels, status badges, buttons, modals
 │    │    ├── telemetry/      # Sparklines, strip charts, 6-subsystem matrix
 │    │    ├── command/        # Command terminal, parameter builder, queue log
 │    │    └── viewport/       # Three.js Canvas, celestial ephemeris, orbit ribbons
 │    ├── features/            # Exactly Two Primary Entry Modes
 │    │    ├── missioncontrol/ # Live telemetry console, fleet drawer, failure lab
 │    │    └── spaceimagery/   # NASA library browser, GIBS viewer, metadata sheet
 │    ├── hooks/               # useTelemetry, useWebSocket, useThreeCamera
 │    ├── services/            # Axios HTTP client, STOMP client
 │    ├── state/               # Client state store (Zustand)
 │    ├── styles/              # Design tokens matching docs/DESIGN_DIRECTION.md
 │    ├── types/               # TypeScript interfaces mirroring backend DTOs
 │    ├── App.tsx              # Root application router (Dual-entry navigation)
 │    └── main.tsx             # Application bootstrap
 ├── package.json              # NPM dependencies & scripts
 ├── tsconfig.json             # TypeScript configuration
 └── vite.config.ts            # Vite bundler configuration
```

## Planned Implementation Stage
Implementation begins in **Phase 6: Frontend Foundation & Aerospace Design System** as defined in [ROADMAP.md](../docs/ROADMAP.md).
