Adaptive Learning Platform — Repository Summary

Purpose
- AdaptIQ: Next.js + React TypeScript app for an adaptive learning platform (students, teachers, parents, admins).

Top-level config
- package.json: project metadata, scripts (`dev`, `build`, `start`, `lint`), dependencies (Next 16, React 19, Tailwind, Radix UI, Recharts, lucide-react, sonner, zod, etc.).
- tsconfig.json: TypeScript config (React JSX, strict mode, path `@/*` -> `./*`).
- next.config.mjs: Next config (ignore TypeScript build errors, images `unoptimized: true`).
- postcss.config.mjs: PostCSS/Tailwind integration.

App entry & routes (app/)
- app/layout.tsx: Root HTML layout, global fonts and Analytics injection.
- app/page.tsx: Public landing/home page with hero, features, CTA.
- app/globals.css: Global Tailwind CSS styles.

Routes (pages by role)
- app/login/page.tsx: Login page.
- app/help/page.tsx: Help page.
- app/student/*: Student area (dashboard, learn, grades, profile, settings, vark-survey, chat).
- app/teacher/*: Teacher area (dashboard, classes, projects, students, profile, settings).
- app/parent/*: Parent area (dashboard, children, messages, profile, settings).
- app/admin/*: Admin area (dashboard, content, reports, users, settings).
- Several routes include `loading.tsx` for suspense/loading states.

Components/
- `components/theme-provider.tsx`: Theme wrapper for app.

Role-specific components
- components/student/: `adaptive-feed.tsx`, `ai-chat-interface.tsx`, `content-recommendations.tsx`, `engagement-indicator.tsx`, `mastery-card.tsx`, `recent-activity.tsx`, `sidebar.tsx`, `vark-profile.tsx`, `header.tsx`.
- components/teacher/: `header.tsx`, `sidebar.tsx`, `class-overview-card.tsx`, `learning-style-chart.tsx`, `engagement-trend-chart.tsx`, `student-list.tsx`, `student-insights.tsx`.
- components/parent/: `header.tsx`, `sidebar.tsx`.
- components/admin/: `header.tsx`, `sidebar.tsx`.
- components/pbl/: project-based learning pieces: `project-card.tsx`, `milestone-tracker.tsx`.

UI primitives (components/ui/)
- Core primitives & controls: `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `table.tsx`, `card.tsx`, `badge.tsx`, `avatar.tsx`, `tooltip.tsx`, `popover.tsx`, `dialog.tsx`, `drawer.tsx`, `accordion.tsx`, `tabs.tsx`, `pagination.tsx`, `carousel.tsx`, `chart.tsx`, `spinner.tsx`, `toast.tsx`, `toaster.tsx`, `use-toast.ts`.
- Other helpers: `form.tsx`, `field.tsx`, `command.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `context-menu.tsx`, `hover-card.tsx`, `resizable.tsx`, `scroll-area.tsx`, `skeleton.tsx`, `separator.tsx`, `sheet.tsx`, `popover.tsx`, `input-otp.tsx`.

Hooks
- `hooks/use-auth.ts`: Authentication helper (likely provides current user, sign-in/out helpers).
- `hooks/use-mobile.ts`: Detect mobile viewport helper.
- `hooks/use-toast.ts`: Toast wrapper (UI notifications).

Lib utilities and data (lib/)
- `lib/auth.ts`: Auth helper functions used across app.
- `lib/utils.ts`: Utility functions used across the app.
- `lib/ai-assistant.ts`: AI assistant integration (used by `ai-chat-interface`).
- `lib/student-data.ts`, `lib/teacher-data.ts`, `lib/parent-data.ts`, `lib/admin-data.ts`, `lib/project-data.ts`: Datasets or data-access helpers for seeding / demo content.
- `lib/vark-survey.ts`: VARK survey logic (learning-style detection).

Public assets
- `public/`: placeholder images and icons (placeholder.svg/jpg, placeholder-user.jpg, placeholder-logo.png/svg, icon assets, apple-icon.png).

Scripts
- `scripts/01-create-schema.sql`, `02-seed-data.sql`: SQL for schema and seed data (useful for provisioning demo DB).

Styles
- `styles/globals.css` and `app/globals.css`: Tailwind base + project styles.

Notes about implementation
- TypeScript: project uses strict TS settings; Next's build currently ignores TS errors in `next.config.mjs`.
- UI: heavy use of Radix UI primitives and Tailwind for styling; `lucide-react` for icons; `recharts` used for charts.
- AI: `lib/ai-assistant.ts` + `components/student/ai-chat-interface.tsx` integrate AI tutoring features.

How this summary was generated
- I scanned repository files and produced concise per-file or per-folder descriptions for sharing.

Next steps (choose one)
- Option A: I can expand this into a full exhaustive per-file one-line description (144 files) and attach it here.
- Option B: I can produce a JSON-friendly manifest mapping each file path -> short summary (useful to paste into ChatGPT).
- Option C: I can extract file contents and produce a zipped archive ready to upload.

Tell me which next step you want and I'll proceed.
