'use strict';
'require baseclass';
'require fs';

var prev = {};
var last_time = Date.now();
var ipVisible = true;

try {
ipVisible = localStorage.getItem('ipVisible') !== 'false';
} catch (e) {
ipVisible = true;
}

if (!window.arwiNetstatState) {
window.arwiNetstatState = {
cpuLast: null,
cpuText: '-',
ramText: '-',
tempText: '-',
netStatus: '0',
netClass: 'OFFLINE'
};
}

(function loadDynamicCSS() {
function isDarkMode() {
try {
var bgColor = getComputedStyle(document.body).backgroundColor;
if (!bgColor) return false;

var rgb = bgColor.match(/\d+/g);
if (!rgb) return false;

var r = parseInt(rgb[0]) || 0;
var g = parseInt(rgb[1]) || 0;
var b = parseInt(rgb[2]) || 0;

return (r * 299 + g * 587 + b * 114) / 1000 < 100;
} catch (e) {
return false;
}
}

try {
var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = isDarkMode()
? '/luci-static/resources/netstat/netstat_dark.css'
: '/luci-static/resources/netstat/netstat.css';
document.head.appendChild(link);
} catch (e) {}
})();

function checkWidgetStatus() {
return fs.exec('/sbin/uci', ['get', 'netstats.@config[0].show_status'])
.then(function(res) {
var val = String(res.stdout || '').trim();
return val === '1';
})
.catch(function() {
return true;
});
}

function parseStats(raw) {
var lines = String(raw || '').trim().split('\n');
var stats = {};

for (var i = 0; i < lines.length; i++) {
var line = lines[i];
var parts = line.trim().split(':');

if (parts.length < 2)
continue;

var iface = parts[0].trim();
var values = parts[1].trim().split(/\s+/);

stats[iface] = {
rx: parseInt(values[0], 10) || 0,
tx: parseInt(values[8], 10) || 0
};
}

return stats;
}

function fetchJson(url) {
return fs.exec('/usr/bin/curl', ['-sL', '--connect-timeout', '2', '--max-time', '3', url])
.catch(function() {
return fs.exec('/bin/uclient-fetch', ['-qO-', url]);
});
}

function getLatency(host) {
return fs.exec('/bin/ping', ['-c', '1', '-W', '1', host])
.then(function(res) {
var out = res.stdout || '';
var match = out.match(/time[=<]([\d.]+)/);
return match ? Math.round(parseFloat(match[1])) + 'ms' : 'N/A';
})
.catch(function() {
return 'N/A';
});
}

function getPublicIP() {
return fetchJson('https://ip.guide')
.then(function(res) {
var data = {};
var json = {};

try {
json = JSON.parse(res.stdout || '{}');
data = json.ip_response || json;
} catch (e) {
data = {};
}

return getLatency('8.8.8.8').then(function(latency) {
var org = 'Unknown';

if (data.network && data.network.autonomous_system) {
org = data.network.autonomous_system.organization ||
data.network.autonomous_system.name ||
'Unknown';
}

return {
ip: data.ip || 'Unavailable',
latency: latency,
network: {
autonomous_system: {
name: org
}
}
};
});
})
.catch(function() {
return {
ip: 'Unavailable',
latency: 'N/A',
network: {
autonomous_system: {
name: 'Unknown'
}
}
};
});
}

function getPreferredInterfaces() {
return fs.exec('/sbin/uci', ['get', 'netstats.@config[0].prefer'])
.then(function(res) {
return String(res.stdout || '').trim().split(/\s+/).filter(function(x) {
return x;
});
})
.catch(function() {
return [];
});
}

function getMode() {
return fs.exec('/sbin/uci', ['get', 'netstats.@config[0].backend'])
.then(function(res) {
var backend = String(res.stdout || '').trim().toLowerCase();

if (backend !== 'vnstat')
return '';

return fs.exec('/sbin/uci', ['get', 'netstats.@config[0].mode'])
.then(function(modeRes) {
var val = String(modeRes.stdout || '').trim().toLowerCase();
return (val === 'daily' || val === 'monthly') ? val : 'daily';
})
.catch(function() {
return 'daily';
});
})
.catch(function() {
return '';
});
}

function getBackend() {
return fs.exec('/sbin/uci', ['get', 'netstats.@config[0].backend'])
.then(function(res) {
var val = String(res.stdout || '').trim().toLowerCase();
return val === 'vnstat' ? 'vnstat' : 'normal';
})
.catch(function() {
return 'normal';
});
}

function getBestWAN(stats, preferred) {
var i, iface;

preferred = preferred || [];

for (i = 0; i < preferred.length; i++) {
iface = preferred[i];
if (stats[iface])
return iface;
}

for (iface in stats) {
if (/^(wwan|usb|ppp|lte|qmi|modem|rmnet)/.test(iface))
return iface;
}

var fallback = ['pppoe-wan', 'lte0', 'usb0', 'wan', 'eth1', 'eth0', 'tun0', 'wg0'];

for (i = 0; i < fallback.length; i++) {
iface = fallback[i];
if (stats[iface])
return iface;
}

for (iface in stats) {
if (iface !== 'lo' && iface !== 'br-lan' && iface !== 'docker0')
return iface;
}

return 'wan';
}

function formatRate(bits) {
var units = ['Bps', 'Kbps', 'Mbps', 'Gbps'];
var i = 0;

while (bits >= 1000 && i < units.length - 1) {
bits = bits / 1000;
i++;
}

return {
number: bits.toFixed(i > 0 ? 1 : 0),
unit: units[i] + '/s'
};
}

function formatSize(bytes) {
var units = ['B', 'KB', 'MB', 'GB'];
var i = 0;

while (bytes >= 1024 && i < units.length - 1) {
bytes = bytes / 1024;
i++;
}

return {
number: bytes.toFixed(i > 0 ? 1 : 0),
unit: units[i]
};
}

function createStatCard(label, valueNum, valueUnit, color, iface) {
return E('div', { 'class': 'stats-card', 'style': 'box-shadow: none;' }, [
E('div', { 'class': 'stat-label' }, label),
E('div', { 'class': 'stat-value' }, [
E('span', { 'class': 'stat-number' }, valueNum),
E('br'),
E('span', { 'class': 'stat-unit' }, valueUnit)
]),
E('span', {
'class': 'iface-badge',
'style': 'margin-top: 6px; display: inline-block; padding: 2px 6px; font-size: 10px; border-radius: 4px; background-color: ' + color + '; color: white;'
}, iface)
]);
}

function createTrafficCard(label, speedNum, speedUnit, totalNum, totalUnit, color) {
return E('div', { 'class': 'stats-card', 'style': 'box-shadow: none;' }, [
E('div', { 'class': 'stat-label' }, label),
E('div', { 'class': 'stat-value' }, [
E('span', { 'class': 'stat-number' }, speedNum),
E('br'),
E('span', { 'class': 'stat-unit' }, speedUnit)
]),
E('span', {
'class': 'iface-badge',
'style': 'margin-top: 6px; display: inline-block; padding: 2px 6px; font-size: 10px; border-radius: 4px; background-color: ' + color + '; color: white;'
}, totalNum + totalUnit)
]);
}

function createCpuRamCard(cpuText, ramText) {
return E('div', { 'class': 'stats-card', 'style': 'box-shadow: none;' }, [
E('div', { 'class': 'stat-label' }, _('CPU / RAM')),
E('div', { 'class': 'stat-value' }, [
E('span', { 'class': 'stat-number' }, String(cpuText).replace('%', '') + '%'),
E('br'),
E('span', { 'class': 'stat-unit' }, 'RAM ' + ramText)
]),
E('span', {
'class': 'iface-badge',
'style': 'margin-top: 6px; display: inline-block; padding: 2px 6px; font-size: 10px; border-radius: 4px; background-color: #673AB7; color: white;'
}, 'SYSTEM')
]);
}

function createIPCard(ip, org, latency) {
var ipVal = E('div', { 'class': 'ip-value', 'id': 'ip-value' }, ipVisible ? ip : '**********');

var eyeIcon = E('img', {
'src': ipVisible
? '/luci-static/resources/netstat/eye-outline.svg'
: '/luci-static/resources/netstat/eye-off-outline.svg',
'width': 18,
'height': 18,
'style': 'vertical-align: middle;'
});

var eye = E('span', {
'class': 'eye-icon',
'title': _('Show/Hide IP'),
'style': 'cursor: pointer; vertical-align: middle; margin-left: 6px;'
}, [eyeIcon]);

eye.addEventListener('click', function() {
ipVisible = !ipVisible;

try {
localStorage.setItem('ipVisible', ipVisible);
} catch (e) {}

ipVal.textContent = ipVisible ? ip : '**********';
eyeIcon.src = ipVisible
? '/luci-static/resources/netstat/eye-outline.svg'
: '/luci-static/resources/netstat/eye-off-outline.svg';
});

return E('div', { 'class': 'ip-card full-width', 'style': 'box-shadow: none;' }, [
E('div', {
'class': 'ip-org',
'style': 'margin-bottom: 4px; color:' + (latency !== 'N/A' ? '#4CAF50' : '#F44336') + '; font-weight: 600;'
}, latency || 'N/A'),
E('div', { 'class': 'ip-line' }, [ipVal, eye]),
E('div', { 'class': 'ip-org' }, org || 'Unknown'),
E('div', { 'class': 'bubble yellow' })
]);
}

function calcCpu(procStat, state) {
var lines = String(procStat || '').trim().split('\n');
if (!lines[0])
return;

var cpuLine = lines[0].replace(/\s+/g, ' ').split(' ');
var total = 0;

for (var i = 1; i < cpuLine.length; i++)
total += parseInt(cpuLine[i], 10) || 0;

var idle = (parseInt(cpuLine[4], 10) || 0) + (parseInt(cpuLine[5], 10) || 0);
var active = total - idle;

if (state.cpuLast && state.cpuLast.total > 0) {
var diffTotal = total - state.cpuLast.total;
var diffActive = active - state.cpuLast.active;
var percent = 0;

if (diffTotal > 0)
percent = (diffActive / diffTotal) * 100;

state.cpuText = Math.round(percent) + '%';
}

if (!state.cpuLast || total > state.cpuLast.total)
state.cpuLast = { total: total, active: active };
}

function calcRam(memInfo, state) {
var raw = String(memInfo || '');
var memTotal = raw.match(/^MemTotal:\s+(\d+)/m);
var memAvailable = raw.match(/^MemAvailable:\s+(\d+)/m);

if (memTotal && memAvailable) {
var total = parseInt(memTotal[1], 10);
var available = parseInt(memAvailable[1], 10);
var used = total - available;
var ramPercent = (used / total) * 100;

state.ramText = Math.round(ramPercent) + '%';
}
}

function calcTemp(tempRaw, state) {
var tempC = parseInt(tempRaw, 10) / 1000;

if (!isNaN(tempC))
state.tempText = Math.round(tempC) + '°C';
}

function parseVnstat(res, mode) {
var vnstatRx = 0;
var vnstatTx = 0;

try {
var json = JSON.parse(res.stdout || '{}');
var ifaceObj = json.interfaces && json.interfaces[0] ? json.interfaces[0] : null;
var traffic = ifaceObj && ifaceObj.traffic ? ifaceObj.traffic : null;
var key = mode === 'monthly' ? 'months' : 'days';
var trafficArr = traffic && traffic[key] ? traffic[key] : null;

if (trafficArr && trafficArr.length > 0) {
var today = new Date();
var matchEntry = null;

for (var i = 0; i < trafficArr.length; i++) {
var e = trafficArr[i];

if (!e.date)
continue;

if (mode === 'monthly') {
if (e.date.year === today.getFullYear() && e.date.month === today.getMonth() + 1) {
matchEntry = e;
break;
}
} else {
if (e.date.year === today.getFullYear() && e.date.month === today.getMonth() + 1 && e.date.day === today.getDate()) {
matchEntry = e;
break;
}
}
}

if (!matchEntry)
matchEntry = trafficArr[trafficArr.length - 1];

if (matchEntry) {
vnstatRx = (matchEntry.rx || 0) * 1024;
vnstatTx = (matchEntry.tx || 0) * 1024;
}
} else if (traffic && traffic.total) {
vnstatRx = (traffic.total.rx || 0) * 1024;
vnstatTx = (traffic.total.tx || 0) * 1024;
}
} catch (e) {}

return {
rx: vnstatRx,
tx: vnstatTx
};
}

return baseclass.extend({
title: _('NetStat'),

load: function() {
return checkWidgetStatus().then(function(shouldShow) {
if (!shouldShow)
return Promise.resolve({ hideWidget: true });

return Promise.all([
fs.read('/proc/net/dev').then(parseStats).catch(function() { return {}; }),
getPublicIP(),
getPreferredInterfaces(),
getMode(),
getBackend(),
fs.read('/proc/stat').catch(function() { return null; }),
fs.read('/sys/class/thermal/thermal_zone0/temp').catch(function() { return null; }),
fs.read('/proc/meminfo').catch(function() { return null; }),
fs.exec('/bin/ping', ['-c', '1', '-W', '1', '8.8.8.8']).catch(function() { return null; })
]).then(function(r) {
var netStats = r[0];
var ipData = r[1];
var preferred = r[2];
var mode = r[3];
var backend = r[4];
var procStat = r[5];
var tempRaw = r[6];
var memInfo = r[7];
var pingRes = r[8];
var iface = getBestWAN(netStats, preferred);

if (backend === 'vnstat') {
return fs.exec('/usr/bin/vnstat', ['-i', iface, '--json'])
.then(function(vres) {
var vt = parseVnstat(vres, mode);

return {
netStats: netStats,
ipData: ipData,
preferred: preferred,
vnstatRx: vt.rx,
vnstatTx: vt.tx,
mode: mode,
backend: backend,
procStat: procStat,
tempRaw: tempRaw,
memInfo: memInfo,
pingRes: pingRes,
hideWidget: false
};
})
.catch(function() {
return {
netStats: netStats,
ipData: ipData,
preferred: preferred,
vnstatRx: 0,
vnstatTx: 0,
mode: mode,
backend: backend,
procStat: procStat,
tempRaw: tempRaw,
memInfo: memInfo,
pingRes: pingRes,
hideWidget: false
};
});
}

return {
netStats: netStats,
ipData: ipData,
preferred: preferred,
vnstatRx: 0,
vnstatTx: 0,
mode: mode,
backend: backend,
procStat: procStat,
tempRaw: tempRaw,
memInfo: memInfo,
pingRes: pingRes,
hideWidget: false
};
});
});
},

render: function(data) {
if (data.hideWidget)
return E('div', { 'style': 'display: none;' });

var state = window.arwiNetstatState;

var now = Date.now();
var dt = Math.max(0.1, (now - last_time) / 1000);
last_time = now;

var stats = {};
var k;

for (k in data.netStats) {
if (k !== 'lo' && k !== 'br-lan' && k !== 'docker0')
stats[k] = data.netStats[k];
}

var iface = getBestWAN(stats, data.preferred);
var curr = stats[iface] || { rx: 0, tx: 0 };
var prevStat = prev[iface] || curr;

var rxSpeed = Math.max(0, (curr.rx - prevStat.rx) / dt);
var txSpeed = Math.max(0, (curr.tx - prevStat.tx) / dt);

prev[iface] = curr;

var rxRate = formatRate(rxSpeed * 8);
var txRate = formatRate(txSpeed * 8);

var rxTotal = formatSize(data.backend === 'vnstat' ? data.vnstatRx : curr.rx);
var txTotal = formatSize(data.backend === 'vnstat' ? data.vnstatTx : curr.tx);

if (data.procStat)
calcCpu(data.procStat, state);

if (data.memInfo)
calcRam(data.memInfo, state);

if (data.tempRaw)
calcTemp(data.tempRaw, state);

if (data.pingRes && data.pingRes.code === 0 && data.ipData && data.ipData.latency && data.ipData.latency !== 'N/A') {
state.netStatus = data.ipData.latency || '0ms';
state.netClass = 'ONLINE';
} else {
state.netStatus = 'N/A';
state.netClass = 'OFFLINE';
}

var ip = 'Unavailable';
var org = 'Unknown';

if (data.ipData) {
ip = data.ipData.ip || 'Unavailable';

if (data.ipData.network && data.ipData.network.autonomous_system)
org = data.ipData.network.autonomous_system.name || 'Unknown';
}

var grid = E('div', { 'class': 'stats-grid' });

grid.appendChild(createTrafficCard(
_('DOWNLOAD'),
rxRate.number,
rxRate.unit,
rxTotal.number,
rxTotal.unit,
'#4CAF50'
));

grid.appendChild(createTrafficCard(
_('UPLOAD'),
txRate.number,
txRate.unit,
txTotal.number,
txTotal.unit,
'#2196F3'
));

grid.appendChild(createCpuRamCard(state.cpuText, state.ramText));

grid.appendChild(createStatCard(
_('TEMP'),
String(state.tempText).replace('°C', ''),
'°C',
'#FF5722',
'temp'
));

grid.appendChild(createIPCard(
ip,
org,
state.netStatus
));

return E('div', {}, [grid]);
}
});
