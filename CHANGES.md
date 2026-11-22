# FreshMart RSMS - what changed in version 2

## Changed files (your originals)
- index.html: new login layout, header buttons (quick search, theme), Day-End Closing page, links to the new files
- styles.css: blue colours changed to FreshMart green
- app.js: green colours, and the POS search text is now escaped when shown

## New files
- enhancements.js: all new features (hooks into app.js, so the original code stays readable)
- enhancements.css: new look, dark theme, layout fixes
- qrcode.js: QR code library (MIT licence, by Kazuhiko Arase)
- sw.js, manifest.webmanifest, icons/: installable app that opens without internet
- tests/: browser tests used for the report (see tests/README.md)

## Bugs fixed in the original
- POS: the bill panel was pushed off the screen on normal laptop widths
- Stock Alerts and Expiry tables: the Current Stock and Days Remaining badges were invisible
- UPI payment: the QR code was only a picture, now it is a real scannable QR with the bill amount
- Notifications covered the payment window, now they move to the top while a window is open

## Version 3 (fixes)
- Product pictures: every product now has a built-in picture that matches its name (no web photos that can mismatch). Saved data is fixed automatically.
- Printing the bill: "Print Receipt" now prints / saves the full bill as PDF (it used to print only "TAX INVOICE").
- Dashboard: new look with greeting, quick actions for the signed-in role, "Needs attention" list, top products with bars, payment-mode split.

## Version 4 (visual redesign)
- New theme.css (loaded last): pine green + saffron palette on warm paper, Fraunces headings with Manrope body text, new logo mark, restyled sidebar, header, dashboard, POS, tables, modals, login page and a warm dark mode.
- No JavaScript logic changed. sw.js cache bumped to rsms-v4 and now caches theme.css.
- Version 5: welcome.js adds an animated welcome screen after sign-in (skippable); dashboard header and KPI row restyled in theme.css. sw.js cache is now rsms-v5.
- Version 6: polish.js (dashboard count-up, quick cash buttons in the payment window), thermal-paper receipt look, nicer empty states, focus/scrollbar styling, 404.html. sw.js cache is now rsms-v6.
