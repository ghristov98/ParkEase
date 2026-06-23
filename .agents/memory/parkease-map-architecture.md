---
name: ParkEase map architecture
description: SVG markers, animated bottom sheet, zone pulse, custom map controls — key patterns and gotchas in map.tsx
---

## SVG Markers
- All markers use `react-native-svg` (already installed, v15.12.1) — import `Svg, Rect, Polygon as SvgPolygon, Text as SvgText, Circle` from 'react-native-svg'
- `Polygon` from NativeMap (map zones) and `Polygon as SvgPolygon` from react-native-svg must be aliased separately
- `Text` from react-native and `Text as SvgText` from react-native-svg also need aliasing
- Parking lot markers: SVG outlined square (green=#22C55E free, orange=#F97316 paid) with "P" text + downward triangle pointer
- Penalty markers: red SVG triangle with white ⚠ text inside SvgText
- Vehicle markers: SVG circle with car silhouette drawn via Polygon/Circle primitives (Car lucide icon also works)

## Marker Drop Animation (AnimatedDropMarker)
- Wrap any Marker child content in `<AnimatedDropMarker>` to get bounce-drop-from-above on mount
- Uses `Animated.Value(-55)` spring to 0 with `tension:55, friction:6, useNativeDriver:true`
- React.memo'd; self-contained with a single `useEffect` — no external state needed

## Bottom Sheet (unified SheetItem)
- `sheetItem: { type: 'lot'|'zone', data: any } | null` replaces the old `selectedLot` state
- `selectedLot` is derived: `sheetItem?.type === 'lot' ? sheetItem.data : null`
- Sheet uses `sheetAnim` (Animated.Value 0=open,1=closed) + `sheetPanY` for drag
- `sheetTranslateY = Animated.add(sheetAnim.interpolate({[0,1]→[0,420]}), sheetPanY)` — computed once in `useRef` to avoid re-creation on render
- PanResponder is created once in `useRef`; uses `closeSheetRef.current` (a ref updated every render) to always call the latest `closeSheet` without re-creating the PanResponder
- Swipe-down threshold: dy > 80 or vy > 0.8 dismisses; otherwise springs back

## Zone Polygon Interaction
- `selectedZoneId` state tracks which zone is highlighted
- Zone pulse: `setInterval` toggling `zonePulse` boolean every 650ms → drives fill color interpolation in JSX (NOT Animated values, because Polygon doesn't accept animated props)
- Call `checkZone(coord.lat, coord.lng)` at tap time to get SMS code + hourly rate
- Zone data passed to sheet: `{ zone: ZonePolygon, zoneInfo: ZoneResult, coord }`

## Custom Map Controls
- MapView must have `showsCompass={false} zoomControlEnabled={false} toolbarEnabled={false}` to hide defaults
- MapView needs `ref={mapRef}` to call `mapRef.current?.animateToRegion(newRegion, 300)` for zoom
- Zoom controls and location button positioned at `bottom: 100 + insets.bottom + 72` and `+100` above that
- `handleCenterOnUser` calls `Location.getCurrentPositionAsync` fresh (not cached)

## Pre-existing bug fixed
- `admin/parking.tsx` was passing `icon="➕"` (emoji string) to Button instead of `icon={Plus}` (LucideIcon)
- This crashed Android bundling with "View config getter for component `➕` must be a function"
- Fixed by importing Plus from lucide-react-native and passing it as the icon prop

## Favourites
- Stored in AsyncStorage under key `parkease_favourites` as JSON array of lot IDs
- State is `Set<string>` initialized from AsyncStorage on mount
- Heart icon filled red when favourite; border/bg changes too

**Why:** Markers need SVG not PNG for crispness at all zoom levels. PanResponder needs a stable ref-based close callback because it's created once in useRef.
