# Browser tests for FreshMart RSMS

These scripts open the website in a real Chrome browser and check it, the way a person would.

    npm init -y && npm i playwright && npx playwright install chromium
    # in the main folder, start a local server:  python3 -m http.server 8123
    BASE_URL=http://localhost:8123/index.html node tests/test_tc.js        # TC01 - TC12
    BASE_URL=http://localhost:8123/index.html node tests/test_features.js  # new features (TC13 onwards)

The camera test uses a simulated camera and barcode reader, so it does not need a real device.
You can also point BASE_URL at the GitHub Pages address.
