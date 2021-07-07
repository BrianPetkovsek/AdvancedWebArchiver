const { app, BrowserWindow } = require('electron')

let options = {}
try { options = JSON.parse(process.argv.pop()) } catch (error) {}
Array.from(options.args || [])
.filter(line => !line.includes('remote-debugging-port'))
.forEach(line =>{
	console.log(line)
	app.commandLine.appendSwitch.apply(null, line.replace(/^--/, '').split('='))}
)

app.once('ready', () => {
	const window = new BrowserWindow({ show: false })
	window.loadURL('data:text/plain;base64,')
	window.once('ready-to-show', () => {
		if (!options.headless) {
			window.show();
			window.focus();
		}
		process.stdout.write('ready')
	})

	setInterval(() => {
		try {
			window.webContents.executeJavaScript(`(() => {e = document.getElementById('windowSize'); if (e){}else{e = document.createElement('div');document.head.appendChild(e );e.setAttribute("id", "windowSize");e.setAttribute("style", "display: none");}e.setAttribute("size", "`+ window.getSize() +`");})();`)
		}catch(error){}
	}, 500);

	window.on('close', function(e) { 
        e.preventDefault();
        window.destroy();
    });

	const gotTheLock = app.requestSingleInstanceLock();
	if (!gotTheLock) {
		if (window) {
			app.quit();
		}
	} else {
		app.on('second-instance', (event, commandLine, workingDirectory) => {
			if (window) {
				window.show();
				window.focus();
			}
		})
	}
})

app.on('window-all-closed', () => {
    app.quit();
});


//only allows one electron window open (does not count electron-navigation tabs)
var iSWindowOpen = false;
app.on('browser-window-created', function(event, window) {
	if (iSWindowOpen){
		window.loadURL('javascript:window.close();');
		console.log("Close new window");
	}else{
		iSWindowOpen = true;
		console.log("Open one window");
	}
});