---
name: Ghost React packages from npm sandbox installs
description: Running npm/npx install at workspace root (via code_execution sandbox) creates ghost packages in root node_modules that Metro bundler picks up, causing duplicate React and invalid hook call errors.
---

## Rule
Never install packages at the workspace root via `npm install` or `npx`. The code_execution sandbox may run install commands at the root level, which creates ghost packages that pnpm does not manage or clean up.

**Why:** When a package like `lucide-react-native` is installed at the root via npm instead of `pnpm --filter @workspace/mobile add`, it installs into root `node_modules/` with its own peer-resolved React version (e.g. 19.2.7). Metro bundler then resolves two React copies — one from the mobile app's `node_modules/react@19.1.0` and one from root `node_modules/react@19.2.7` — causing "Invalid hook call" and "useMemoCache of null" errors on Android.

**How to apply:**
1. When you see "Invalid hook call" or "useMemoCache of null" on Android pointing to a hook in a workspace lib, check `node_modules/react/package.json` at the root. If the version differs from the mobile app's React, ghost packages are the culprit.
2. Fix: `rm -rf node_modules/lucide-react-native node_modules/react node_modules/react-dom node_modules/react-native` then `pnpm install`.
3. Also remove the bad entry from root `package.json` if it was added there.
4. Add `react: "19.1.0"` and `react-native: "0.81.5"` to `pnpm-workspace.yaml` overrides as a guard.
5. Future installs: always use `pnpm --filter @workspace/mobile add <package>` for mobile dependencies.
