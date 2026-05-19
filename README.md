# Surfer

A private browser with a Japanese ink river UI.

## Run in development
```bash
npm install
npm start
```

## Build a real .app

```bash
npm install
npm run dist
```

This creates a `dist/` folder containing:
- `Surfer-0.1.0-arm64.dmg` — for Apple Silicon Macs
- `Surfer-0.1.0-x64.dmg` — for Intel Macs

Open the DMG, drag Surfer to Applications, and launch it like any other app.
It will appear as "Surfer" in Spotlight, the Dock, and the menu bar.

## Buildings

| Building | What it does |
|---|---|
| Archive | Bookmarks & saved pages |
| Tidepool | Password manager (local only) |
| Observatory | Tracker blocking & privacy stats |
| Dojo | AI reads the current page and answers questions |
