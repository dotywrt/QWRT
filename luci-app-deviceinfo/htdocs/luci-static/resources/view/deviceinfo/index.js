'use strict';
'require view';
'require rpc';
'require fs';

var callSystemBoard = rpc.declare({
    object: 'system',
    method: 'board',
    expect: {}
});

return view.extend({

    load: function() {
        return Promise.all([
            callSystemBoard(),

            fs.exec('/bin/sh', [
                '-c',
                'lsusb 2>/dev/null'
            ]),

            fs.exec('/bin/sh', [
                '-c',
                'lspci 2>/dev/null'
            ]),

            fs.exec('/bin/sh', [
                '-c',
                'cat /proc/device-tree/hat/product 2>/dev/null'
            ])
        ]);
    },

    render: function(data) {

        var board = data[0];
        var usb = data[1];
        var pci = data[2];
        var hat = data[3];

        var usbOutput = 'No USB device detected';
        var pciOutput = 'No PCI device detected';
        var hatOutput = 'No HAT detected';

        if (usb && usb.stdout && usb.stdout.trim() !== '')
            usbOutput = usb.stdout;

        if (pci && pci.stdout && pci.stdout.trim() !== '')
            pciOutput = pci.stdout;

        if (hat && hat.stdout && hat.stdout.trim() !== '')
            hatOutput = hat.stdout.trim();

        return E('div', { class: 'cbi-map' }, [

            E('h2', {}, _('Device Info')),

            E('div', {
                class: 'cbi-section'
            }, [

                E('table', {
                    class: 'table'
                }, [

                    E('tr', {}, [
                        E('td', {
                            width: '35%',
                            style: 'font-weight:bold'
                        }, _('Hostname')),
                        E('td', {}, board.hostname || '-')
                    ]),

                    E('tr', {}, [
                        E('td', {
                            style: 'font-weight:bold'
                        }, _('Model')),
                        E('td', {}, board.model || '-')
                    ]),

                    E('tr', {}, [
                        E('td', {
                            style: 'font-weight:bold'
                        }, _('Architecture')),
                        E('td', {}, board.system || '-')
                    ]),

                    E('tr', {}, [
                        E('td', {
                            style: 'font-weight:bold'
                        }, _('Kernel')),
                        E('td', {}, board.kernel || '-')
                    ]),

                    E('tr', {}, [
                        E('td', {
                            style: 'font-weight:bold'
                        }, _('Firmware Version')),
                        E('td', {}, board.release.description || '-')
                    ]),

                    E('tr', {}, [
                        E('td', {
                            style: 'font-weight:bold'
                        }, _('Raspberry Pi HAT')),
                        E('td', {}, hatOutput)
                    ])

                ])
            ]),

            E('br'),

            E('div', {
                class: 'cbi-section'
            }, [

                E('h3', {}, _('LSUSB')),

                E('pre', {
                    style: 'padding:10px;background:#111;color:#0f0;overflow:auto'
                }, usbOutput)

            ]),

            E('br'),

            E('div', {
                class: 'cbi-section'
            }, [

                E('h3', {}, _('LSPCI')),

                E('pre', {
                    style: 'padding:10px;background:#111;color:#0f0;overflow:auto'
                }, pciOutput)

            ])
        ]);
    }
});
