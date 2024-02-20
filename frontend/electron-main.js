// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const { app, BrowserWindow } = require('electron')
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const path = require('path')
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const express = require('express')
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const cors = require('cors')
const localServerApp = express()
const PORT = 3000
const startLocalServer = (done) => {
    localServerApp.use(express.json({ limit: '100mb' }))
    localServerApp.use(cors())
    // eslint-disable-next-line no-undef
    const buildPath = path.normalize(path.join(__dirname, 'dist/react/'))
    localServerApp.use(express.static(buildPath))
    localServerApp.listen(PORT, async () => {
        done()
    })
}

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    // and load the index.html of the app.
    //   mainWindow.loadFile('index.html')
    mainWindow.loadURL('http://localhost:' + PORT)

    // Open the DevTools.
    mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    startLocalServer(createWindow)

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    // eslint-disable-next-line no-undef
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
