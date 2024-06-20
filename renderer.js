const { ipcRenderer } = require('electron');

function ansiToHtml(text) {
  return text
    .replace(/\x1b\[1;34m/g, '<span style="color:blue;">')
    .replace(/\x1b\[1;31m/g, '<span style="color:red;">')
    .replace(/\x1b\[1;33m/g, '<span style="color:rgb(207,201,138);">')
    .replace(/\x1b\[0m/g, '</span>');
}

function connect() {
  var homeDiv = document.getElementById("home");
  var clients = document.getElementById("clients");
  homeDiv.style.display = "none";
  clients.style.display = "block";
}

function home() {
  var homeDiv = document.getElementById("home");
  var clients = document.getElementById("clients");
  homeDiv.style.display = "block";
  clients.style.display = "none";
}

function runButton() {
  const tokenElement = document.getElementById('token').value;
  var proxiesElement = document.getElementById('proxies');
  if (tokenElement) {
    document.getElementById('token').disabled = true;
    if(proxiesElement.value == 'client'){
      ipcRenderer.send('run-client', tokenElement);
    }else{
      ipcRenderer.send('run-server', tokenElement);
    }
    proxiesElement.disabled = true;
    document.getElementById('console').innerHTML = '<button onclick="stopButton()" class="btn btn-lg btn-danger rounded-pill mx-1">停止</button>';
    document.getElementById('runlog').innerHTML = '';
  }
}

function stopButton() {
  var proxiesElement = document.getElementById('proxies');
  if(proxiesElement.value == 'client'){
    ipcRenderer.send('stop-client');
  }else{
    ipcRenderer.send('stop-server');
  }
  proxiesElement.disabled = false;
  document.getElementById('token').disabled = false;
  document.getElementById('console').innerHTML = '<button onclick="runButton()" class="btn btn-lg btn-primary rounded-pill mx-1">启动</button>';
}

ipcRenderer.on('exe-output', (event, data) => {
  const outputElement = document.getElementById('runlog');
  outputElement.innerHTML += ansiToHtml(data) + '';
  outputElement.scrollTop = outputElement.scrollHeight;
});

function goonlineweb(){
  ipcRenderer.send('goonlineweb')
}