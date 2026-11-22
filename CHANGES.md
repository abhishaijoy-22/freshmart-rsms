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
