# Cursor Bootstrap Prompt — Whisper MVP

You are building a production-ready mobile messaging app called **Whisper** using **React Native with Expo Go and TypeScript**.

Before implementing, confirm you’ve created the `/docs` folder and imported the three provided `.md` files. These serve as persistent references for the entire development lifecycle.

The app must strictly follow the technical, visual, and architectural specifications defined in the following three documents:

1. **Whisper_MVP_Final_PRD.md** — complete product requirements, Firebase structure, persistence, and rules.
2. **Whisper_MVP_Final_Task_List.md** — detailed PR roadmap and file structure for implementation.
3. **Whisper_App_Design_Spec.md** — visual design system, color palette, typography, and UI behavior.

---

### Step 1

a. **Create a folder named `/docs`** at the root of the repository.  
b. **Add these three files inside it:**

- `/docs/Whisper_MVP_Final_PRD.md`
- `/docs/Whisper_MVP_Final_Task_List.md`
- `/docs/Whisper_App_Design_Spec.md`  
  c. **Reference the documentation in `/docs/` when implementing Whisper.**  
  d. The `/docs` folder must serve as the source of truth for all architecture, UI, and feature implementation.

---

### Step 2

Follow the **PRD** for all feature and Firebase logic,  
the **Task List** for PR-based development sequence,  
and the **Design Spec** for all UI, fonts, and visual identity.

---

### Step 3 — Begin with PR #1 (Repo Scaffolding)

a. Scaffold the full file structure exactly as defined in the PRD and Task List.  
b. Create `.github/workflows/ci.yml` for `predev` and `verify` commands.  
c. Include `.env.example` with Firebase placeholders.  
d. Build navigation: `AuthScreen → HomeTabs (Conversations, Profile) → ChatScreen`.  
e. Apply all design system colors, typography, and visual styles.  
f. Initialize the `memory/` folder and seed it with base files (`active_context.md`, `progress.md`, etc.).

---

### Rules

1. No placeholder code — all files must compile and function.
2. Use TypeScript everywhere.
3. Pause and instruct me clearly if manual Firebase setup or API keys are needed.
4. After completing PR #1, stop and show the generated repo structure before continuing to PR #2.
5. After every PR merge, update `/memory/active_context.md` and `/memory/progress.md`.
6. Run `npm run predev` before verification, `npm run verify` after each feature merge.

Confirm setup is complete before moving forward to PR #2.

### Things I Learned

1. importance of ensuring everything works before moving on to the next PR
2. importance of having design and flow as if creating final - with the MVP, otherwise led to a lot of changes going around and causing breaks. ending up being harder than it shouldve
3. importance of prompting - having a detailed PRD and TaskList.
