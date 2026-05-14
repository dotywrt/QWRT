'use strict';
'require baseclass';
'require fs';
'require rpc';
'require uci';

var callGetUnixtime = rpc.declare({
  object: 'luci',
  method: 'getUnixtime',
  expect: { result: 0 }
});

var callLuciVersion = rpc.declare({
  object: 'luci',
  method: 'getVersion'
});

var callSystemBoard = rpc.declare({
  object: 'system',
  method: 'board'
});

var callSystemInfo = rpc.declare({
  object: 'system',
  method: 'info'
});

var callCPUBench = rpc.declare({
  object: 'luci',
  method: 'getCPUBench'
});

var callCPUInfo = rpc.declare({
  object: 'luci',
  method: 'getCPUInfo'
});

var callCPUUsage = rpc.declare({
  object: 'luci',
  method: 'getCPUUsage'
});

var callTempInfo = rpc.declare({
  object: 'luci',
  method: 'getTempInfo'
});

var callThermal = rpc.declare({
  object: 'file',
  method: 'read',
  params: ['path']
});

return baseclass.extend({
  title: _('System'),

  load: function() {
    return Promise.all([
      L.resolveDefault(callSystemBoard(), {}),
      L.resolveDefault(callSystemInfo(), {}),
      L.resolveDefault(callCPUBench(), {}),
      L.resolveDefault(callCPUInfo(), {}),
      L.resolveDefault(callCPUUsage(), {}),
      L.resolveDefault(callTempInfo(), {}),
      L.resolveDefault(callLuciVersion(), {
        revision: _('unknown version'),
        branch: 'LuCI'
      }),
      L.resolveDefault(callGetUnixtime(), 0),
      L.resolveDefault(callThermal('/sys/class/thermal/thermal_zone0/temp'), {}),
      uci.load('system')
    ]);
  },

  render: function(data) {

    var boardinfo   = data[0],
        systeminfo  = data[1],
        cpubench    = data[2],
        cpuinfo     = data[3],
        cpuusage    = data[4],
        tempinfo    = data[5],
        luciversion = data[6],
        unixtime    = data[7],
        thermal     = data[8];

    luciversion = luciversion.branch + ' ' + luciversion.revision;

    var datestr = null;

    if (unixtime) {
      var date = new Date(unixtime * 1000),
          zn = uci.get('system', '@system[0]', 'zonename')?.replaceAll(' ', '_') || 'UTC',
          ts = uci.get('system', '@system[0]', 'clock_timestyle') || 0,
          hc = uci.get('system', '@system[0]', 'clock_hourcycle') || 0;

      datestr = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: (ts == 0) ? 'long' : 'full',
        hourCycle: (hc == 0) ? undefined : hc,
        timeZone: zn
      }).format(date);
    }

    var temp = 'N/A';

    if (thermal && thermal.data) {
      temp = (parseInt(thermal.data) / 1000).toFixed(1) + '°C';
    }
    else if (tempinfo && tempinfo.tempinfo) {
      temp = tempinfo.tempinfo;
    }

    var kernel_raw = boardinfo.kernel || 'Unknown';
    var kernel = 'K' + kernel_raw;
    var firmware = 'N/A';
    if (L.isObject(boardinfo.release) && boardinfo.release.description) {
      firmware = boardinfo.release.description;
      firmware = firmware.replace(/ \/ LuCI.*$/g, '');
    }

    var firmware_line = kernel + ' / ' + firmware;

    var fields = [
      _('Hostname'), boardinfo.hostname,
      _('Model'), boardinfo.model + cpubench.cpubench,
      _('Firmware'), firmware_line,
      _('Temperature'), temp,
      _('Time'), datestr,
      _('Uptime'), systeminfo.uptime ? '%t'.format(systeminfo.uptime) : null,
      _('Relase'), 'xxxxxx',
      _('Builder'), 'Dotycat.com'
    ];

    var table = E('table', { 'class': 'table' });

    for (var i = 0; i < fields.length; i += 2) {
      table.appendChild(E('tr', { 'class': 'tr' }, [
        E('td', { 'class': 'td left', 'width': '33%' }, [fields[i]]),
        E('td', { 'class': 'td left' }, [(fields[i + 1] != null) ? fields[i + 1] : '?'])
      ]));
    }

    return table;
  }
});
