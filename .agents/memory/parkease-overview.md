---
name: ParkEase project overview
description: Stack, credentials, and key architectural decisions for ParkEase
---

App: ParkEase — parking and vehicle management. Expo mobile + Express API.

Artifacts:
- Mobile: `artifacts/mobile` (Expo, preview at `/`)
- API: `artifacts/api-server` (Express, preview at `/api`)

Superadmin: superadmin@parkease.com / G7#Pq9!Xr2@Lm8$Vz5

Colors: primary #0E4BF1, accent #00C5A8, free #22C55E, paid #F97316, bg #F5F7FF

react-native-maps: pinned to 1.18.0. DO NOT add to app.json plugins.
Import via shim: `import { MapView, Marker } from "@/components/NativeMap"`
- NativeMap.native.tsx → real MapView
- NativeMap.tsx → web stub

API client base URL set in AuthContext.tsx module scope via setBaseUrl/setAuthTokenGetter.
Token storage: AsyncStorage keys parkease_access_token, parkease_refresh_token, parkease_user.

Card component: style prop is `ViewStyle` (not StyleProp), so don't pass arrays — use spread: `{ ...styles.x, top: y }`
AuthContext User type: photoUrl is `string | null | undefined` (optional) to match generated API type.
