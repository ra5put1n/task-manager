// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const { BrowserWindow, app } = require('electron')
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const path = require('path')

let mainWindow

async function createWindow() {
    // Dynamically import the electron-is-dev module
    const isDev = await import('electron-is-dev').then((module) => module.default)

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    })
    // eslint-disable-next-line no-undef
    const startURL = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './dist/react/index.html')}`

    mainWindow.loadURL(startURL)

    mainWindow.on('closed', () => (mainWindow = null))
}

app.whenReady().then(() => {
    createWindow()
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    // eslint-disable-next-line no-undef
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})
