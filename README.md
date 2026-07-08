# Employee Work Hours Dashboard (Google Sheets Integration)

This is a beautiful, responsive, and bilingual (Hebrew/English) Work Hours Dashboard designed to run as a Google Apps Script Web App integrated directly with your Google Sheets spreadsheet.

## Files included:
- `Code.gs`: The Google Apps Script backend code (handles Google Sheet read/write and initializes default sheets).
- `Index.html`: The HTML5 frontend containing the layout, premium styles (CSS), bilingual translation dictionaries, and JavaScript code.

---

## 1. How to Preview & Test Locally
To test the design and mock functionality offline immediately:
1. Open the folder `Employee Work Hours Dashboard`.
2. Double-click the `Index.html` file to open it in any web browser.
3. The app will detect it is running locally and fall back to interactive Mock Data. You can add reports, switch tabs, toggle languages, and save settings!

---

## 2. How to Deploy to Google Sheets (Web App)
When you are ready to link it to your active Google Drive Sheet:
1. Open your **Google Sheet** (or create a new one).
2. In the top menu, go to **Extensions** -> **Apps Script** (תוספים -> Apps Script).
3. Delete any default code in the editor.
4. Create a new script file named `Code.gs` and copy the contents of the local [Code.gs](file:///Code.gs) into it.
5. Create a new HTML file named `Index.html` (click the `+` sign -> HTML) and copy the contents of the local [Index.html](file:///Index.html) into it.
6. Click **Deploy** -> **New Deployment** (פריסה -> פריסה חדשה) at the top right:
   - Select type: **Web App** (אפליקציית אינטרנט).
   - Execute as: **Me** (המשתמש שמפעיל את האפליקציה).
   - Who has access: **Anyone** (או כל אחד - to allow you to load it, or limit it to yourself/your domain if preferred).
7. Click **Deploy** and authorize permissions when prompted. Copy the provided Web App URL to access your dashboard!
