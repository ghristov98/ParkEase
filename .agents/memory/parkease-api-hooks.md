---
name: ParkEase API hook patterns
description: How to correctly call generated React Query hooks in the mobile app
---

The Orval-generated `@workspace/api-client-react` only exports `use*` mutation hooks for POST/PUT/DELETE.
For GET endpoints, use `useQuery` from `@tanstack/react-query` with the generated query options:

```tsx
import { getGetParkingLotsQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
const { data } = useQuery(getGetParkingLotsQueryOptions(params));
```

Key naming quirks:
- Unread count: `getGetUnreadNotificationCountQueryOptions` (NOT `getGetUnreadCountQueryOptions`)
- Single item: `getGetVehicleByIdQueryOptions(id)`, `getGetParkingLotByIdQueryOptions(id)`
- Mutation params use `id` (NOT `vehicleId`): `{ id: string; data: ... }`
- Notification mark-read: `useMarkNotificationRead`, param `{ id }` (NOT `notificationId`)
- Notification mark-all: `useMarkAllNotificationsRead`

**Why:** Orval config in this project generates query options instead of standalone hooks for GET operations.
**How to apply:** Any time a screen needs a GET query, import the `getGetXxx` function and wrap with `useQuery`.
