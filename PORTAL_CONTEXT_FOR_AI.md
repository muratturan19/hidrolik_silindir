# ⚠️ PORTAL INTEGRATION CONTEXT - READ CAREFULLY

This project (`hidrolik-silindir`) is **NOT** just a standalone application. It operates in a **Hybrid Mode** where it can run:
1.  **Standalone:** On its own domain or localhost.
2.  **Portal Mode:** Embedded inside the "Delta Portal" ecosystem via iframe/proxy.

## ⛔ CRITICAL FILES (DO NOT DELETE OR BREAK)

The following files contain logic for this hybrid operation. **If you refactor the code, strictly preserve these functionalities:**

### 1. `frontend/src/config.ts`
Holds the `IS_PORTAL` logic.
```typescript
const APP_MODE = import.meta.env.VITE_APP_MODE || 'STANDALONE';
export const APP_CONFIG = {
  IS_PORTAL: APP_MODE === 'PORTAL',
  // ...
};
```

### 2. `frontend/src/App.tsx` (Header Section)
Contains conditional rendering for "Back to Portal" buttons.
```tsx
{APP_CONFIG.IS_PORTAL && (
  // Portal navigation buttons
)}
```

### 3. `frontend/Dockerfile`
Accepts the build argument.
```dockerfile
ARG VITE_APP_MODE=STANDALONE
ENV VITE_APP_MODE=$VITE_APP_MODE
```

## ✅ INSTRUCTIONS FOR UPDATE TASKS

When updating the **Excel calculation logic** or **Backend**:
1.  You are free to modify calculation logic, variable names, and data structures.
2.  **Backend:** Ensure `requirements.txt` is updated if you add libraries (e.g. `pandas`, `openpyxl`).
3.  **Frontend:** If you change the UI layout, ensure the **Header** still imports and uses the `config.ts` logic to show Portal buttons when needed.

**Codebase Source of Truth:** GitHub (`muratturan19/hidrolik_silindir`)
