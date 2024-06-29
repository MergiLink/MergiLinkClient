const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { spawn, exec } = require('child_process');
const dgram = require('dgram');
const path = require('path');
const udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

let clientProcess;
let serverProcess;
let sendMulticastMessageInterval;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, './app/images/256x256.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  //win.webContents.openDevTools();
  Menu.setApplicationMenu(null);
  win.loadFile('index.html');
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
    if (clientProcess) {
        spawn('taskkill', ['/IM', 'core.exe', '/F']);
        clientProcess.kill();
        clientProcess = null;
    }
    if (serverProcess) {
        spawn('taskkill', ['/IM', 'core.exe', '/F']);
        serverProcess.kill();
        serverProcess = null;
    }
    if (sendMulticastMessageInterval) {
        clearInterval(sendMulticastMessageInterval);
        sendMulticastMessageInterval = null;
    }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

udpSocket.on('error', (err) => {
  udpSocket.close();
});

function sendMulticastMessage() {
  const message = Buffer.from('[MOTD]§eMergiLink默连局域网通道 - 双击进入[/MOTD][AD]59735[/AD]');
  const multicastAddress = '224.0.2.60';
  const port = 4445;

  udpSocket.send(message, 0, message.length, port, multicastAddress, (err) => {
  });
}

ipcMain.on('run-client', (event, token) => {
  const clientUrl = `https://link.qwqo.cn/api/user.php?rp=getcconfig&token=${token}`;
  const clientFilePath = 'client.toml';
  const exePath = 'core.exe';

  const downloadScript = `
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Ssl3 -bor [Net.SecurityProtocolType]::Tls -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls12
    $url = "${clientUrl}"
    $outputPath = "${clientFilePath}"
    Invoke-WebRequest -Uri $url -OutFile $outputPath
  `;

  const runScript = `
    Start-Process -FilePath "${exePath}" -ArgumentList "-c", "${clientFilePath}" -NoNewWindow -PassThru | Out-Null
  `;
  event.sender.send('exe-output', '开始拉取配置文件 <br>');
  // Download configuration file
  const downloadProcess = spawn('powershell.exe', ['-NoProfile', '-Command', downloadScript]);

  downloadProcess.stdout.on('data', (data) => {
    const message = data.toString();
  });

  downloadProcess.stderr.on('data', (data) => event.sender.send('exe-output', `stderr: ${data.toString()}`));

  downloadProcess.on('close', (code) => {
    event.sender.send('exe-output', `拉取配置文件结束，状态码: ${code} <br>`);
    if (code === 0) {
      event.sender.send('exe-output', '您现在运行的软件版本为：1.0.2<br>您现在运行的Frp内核为：0.58.1_a35ee10 <br>');
      // Run core.exe after successful download
      clientProcess = spawn('powershell.exe', ['-NoProfile', '-Command', runScript]);

      clientProcess.stdout.on('data', (data) => event.sender.send('exe-output', data.toString()));
      clientProcess.stderr.on('data', (data) => event.sender.send('exe-output', `stderr: ${data.toString()}`));
      clientProcess.on('close', (code) => event.sender.send('exe-output', `软件已退出 状态码：${code} <br>`));
    }
  });

  sendMulticastMessageInterval = setInterval(sendMulticastMessage, 5000);
});

ipcMain.on('stop-client', (event) => {
  if (clientProcess) {
    spawn('taskkill', ['/IM', 'core.exe', '/F']);
    clientProcess.kill();
    event.sender.send('exe-output', '联机进程已退出 <br>');
    clientProcess = null;
  }
  if (sendMulticastMessageInterval) {
    clearInterval(sendMulticastMessageInterval);
    event.sender.send('exe-output', '局域网广播进程终止 <br>');
    sendMulticastMessageInterval = null;
  }
});

ipcMain.on('run-server', (event, token) => {
  const serverUrl = `https://link.qwqo.cn/api/user.php?rp=getsconfig&token=${token}`;
  const serverFilePath = 'server.toml'
  const exePath = 'core.exe';

  const downloadScript = `
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Ssl3 -bor [Net.SecurityProtocolType]::Tls -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls12
    $url = "${serverUrl}"
    $outputPath = "${serverFilePath}"
    Invoke-WebRequest -Uri $url -OutFile $outputPath
  `;

  const runScript = `
    Start-Process -FilePath "${exePath}" -ArgumentList "-c", "${serverFilePath}" -NoNewWindow -PassThru | Out-Null
  `;
  event.sender.send('exe-output', '开始拉取配置文件 <br>');
  const downloadProcess = spawn('powershell.exe', ['-NoProfile', '-Command', downloadScript]);

  downloadProcess.stdout.on('data', (data) => {
    const message = data.toString();
});

  downloadProcess.stderr.on('data', (data) => event.sender.send('exe-output', `stderr: ${data.toString()}`));

  downloadProcess.on('close', (code) => {
    event.sender.send('exe-output', `拉取配置文件结束状态码: ${code} <br>`);
    if (code === 0) {
      event.sender.send('exe-output', '您现在运行的软件版本为：1.0.2<br>您现在运行的Frp内核为：0.58.1_a35ee10 <br>');
      serverProcess = spawn('powershell.exe', ['-NoProfile', '-Command', runScript]);
      serverProcess.stdout.on('data', (data) => event.sender.send('exe-output', data.toString()));
      serverProcess.stderr.on('data', (data) => event.sender.send('exe-output', `stderr: ${data.toString()}`));
      serverProcess.on('close', (code) => event.sender.send('exe-output', `软件已退出 状态码：${code} <br>`));
    }
  });
});

ipcMain.on('stop-server', (event) => {
  if (serverProcess) {
    spawn('taskkill', ['/IM', 'core.exe', '/F']);
    serverProcess.kill();
    event.sender.send('exe-output', '软件进程终止 <br>');
    serverProcess = null;
  }
});

ipcMain.on('goonlineweb', (event) => {  
    exec('start https://link.qwqo.cn/')
  })  

udpSocket.bind(() => {
  udpSocket.setMulticastTTL(128); // 设置多播TTL
  udpSocket.addMembership('224.0.2.60'); // 加入多播组
});
