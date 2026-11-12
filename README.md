# BJ Catalogue — installable app

Open **https://aowu-hub.github.io/bj-catalogue/** on a phone and install it:

| Phone | How |
|---|---|
| Android (Chrome) | tap **Install** on the pill at the bottom, or ⋮ → **Install app / Add to Home screen** |
| iPhone / iPad (Safari) | **Share ⬆︎** → **Add to Home Screen** → Add |

The app shows the live BJ catalogue full screen, so it is always up to date. It needs internet to search.

This repo is PUBLIC: it holds only the app shell (page, icons, manifest, service worker). The catalogue code
and data stay in the private repo. Main copy of these files: Drive `Catalogue Lookup Index/GitHub/app-shell/`.
On every change bump `APP_VERSION` in `sw.js` (vYYYY.MM.DD-HHMM, never reused).
