// Desktop shell for Windows (Microsoft Store / .exe) and macOS (.dmg).
// Hardened following Electron's security checklist: https://www.electronjs.org/docs/latest/tutorial/security
const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");

const INDEX = path.join(__dirname, "..", "dist", "index.html");

// Only https links may leave the app, and only to the system browser.
function openExternalSafely(url) {
  try {
    if (new URL(url).protocol === "https:") shell.openExternal(url);
  } catch { /* invalid URL: ignore */ }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: "#14121f",
    title: "Mozaik",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false, // the page has no access to Node.js
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
    },
  });
  win.loadFile(INDEX);

  // Never navigate the app window away from the bundled game.
  win.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    openExternalSafely(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafely(url);
    return { action: "deny" };
  });
}

app.enableSandbox();

app.whenReady().then(() => {
  // The game needs no camera, microphone, location, notifications…: refuse everything.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();
});

// Block any attempt to attach a <webview> or create unexpected contents.
app.on("web-contents-created", (_e, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
