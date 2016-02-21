var OpenZWave = require('openzwave-shared'),
    os = require('os')
    nano = require('nanomsg');

const repl = require('repl');
var addr = "ipc:///tmp/zwave-exchange";
var pub = nano.socket('pub');

var zwave = new OpenZWave({
  ConsoleOutput: true,
  Logging: false,
  SaveConfiguration: false,
  DriverMaxAttempts: 3,
  PollInterval: 500,
  SuppressValueRefresh: true,
});
var nodes = [];

zwave.on('connected', function(homeid) {
  console.log('=================== CONNECTED! ====================');
  pub.send(JSON.stringify({type: "connected"}));
});

zwave.on('driver ready', function(homeid) {
  console.log('=================== DRIVER READY! ====================');
  console.log('scanning homeid=0x%s...', homeid.toString(16));
  pub.send(JSON.stringify({type: "driverready", home_id: homeid}));
});

zwave.on('driver failed', function() {
  console.log('failed to start driver');
  pub.send(JSON.stringify({type: "driverfailed"}));
  pub.close();
  zwave.disconnect();
  process.exit();
});

zwave.on('node added', function(nodeid) {
  console.log('=================== NODE ADDED! ====================');
  nodes[nodeid] = {
    manufacturer: '',
    manufacturerid: '',
    product: '',
    producttype: '',
    productid: '',
    type: '',
    name: '',
    loc: '',
    classes: {},
    ready: false,
  };
  pub.send(JSON.stringify({type: "nodeadded", node: nodes[nodeid]}));
});

zwave.on('value added', function(nodeid, comclass, value) {
  if (!nodes[nodeid]['classes'][comclass])
    nodes[nodeid]['classes'][comclass] = {};
  nodes[nodeid]['classes'][comclass][value.index] = value;
  notification = {
    type: "valueadded",
    node: nodes[nodeid],
    com_class: comclass,
    value: value,
  }
  pub.send(JSON.stringify(notification));
});

zwave.on('value changed', function(nodeid, comclass, value) {
  oldvalue = nodes[nodeid]['classes'][comclass][value.index];
  if (!nodes[nodeid]['ready']) {
    console.log('node%d: changed: %d:%s:%s->%s', nodeid, comclass,
        value['label'],
        oldvalue['value'],
        value['value']);
  }
  nodes[nodeid]['classes'][comclass][value.index] = value;
  notification = {
    type: "valuechanged",
    node: nodes[nodeid],
    com_class: comclass,
    old_value: oldvalue,
    value: value,
    //node: nodes[nodeid],
  }
  pub.send(JSON.stringify(notification));
});

zwave.on('value removed', function(nodeid, comclass, index) {
  if (nodes[nodeid]['classes'][comclass] &&
      nodes[nodeid]['classes'][comclass][index])
    delete nodes[nodeid]['classes'][comclass][index];
  notification = {
    type: "valueremoved",
    node: nodes[nodeId],
    com_class: comclass,
    index: index,
  }
  pub.send(JSON.stringify(notification));
});

zwave.on('node ready', function(nodeid, nodeinfo) {
  nodes[nodeid]['manufacturer'] = nodeinfo.manufacturer;
  nodes[nodeid]['manufacturerid'] = nodeinfo.manufacturerid;
  nodes[nodeid]['product'] = nodeinfo.product;
  nodes[nodeid]['producttype'] = nodeinfo.producttype;
  nodes[nodeid]['productid'] = nodeinfo.productid;
  nodes[nodeid]['type'] = nodeinfo.type;
  nodes[nodeid]['name'] = nodeinfo.name;
  nodes[nodeid]['loc'] = nodeinfo.loc;
  nodes[nodeid]['ready'] = true;
  console.log('node%d: %s, %s', nodeid,
      nodeinfo.manufacturer ? nodeinfo.manufacturer
      : 'id=' + nodeinfo.manufacturerid,
      nodeinfo.product ? nodeinfo.product
      : 'product=' + nodeinfo.productid +
      ', type=' + nodeinfo.producttype);
  console.log('node%d: name="%s", type="%s", location="%s"', nodeid,
      nodeinfo.name,
      nodeinfo.type,
      nodeinfo.loc);
  for (comclass in nodes[nodeid]['classes']) {
    switch (comclass) {
      case 0x25: // COMMAND_CLASS_SWITCH_BINARY
      case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
        zwave.enablePoll(nodeid, comclass);
        break;
    }
    var values = nodes[nodeid]['classes'][comclass];
    console.log('node%d: class %d', nodeid, comclass);
    for (idx in values)
      console.log('node%d:   %s=%s', nodeid, values[idx]['label'], values[idx]['value']);
  }
  pub.send(JSON.stringify({type: "nodeready", node: nodes[nodeid]}));
});

zwave.on('notification', function(nodeid, notif, help) {
  console.log('node%d: notification(%d): %s', nodeid, notif, help);
  notification = {
    type: "notification",
    node: nodes[nodeid],
    notification_id: notif,
    help: help,
  }
  pub.send(JSON.stringify(notification));
});

zwave.on('scan complete', function() {
  console.log('scan complete, hit ^C to finish.');
  var r = repl.start(">")
  r.context.zwave = zwave;
  r.context.nodes = nodes;
  r.context.pub = pub;
  pub.send(JSON.stringify({type: "scancomplete"}));
});

zwavedriverpaths = {
  "darwin" : '/dev/cu.usbmodem1411',
  "linux"  : '/dev/ttyUSB0',
  "windows": '\\\\.\\COM3'
}
console.log("connecting to " + zwavedriverpaths[os.platform()]);
pub.bind(addr)
zwave.connect(zwavedriverpaths[os.platform()]);

process.on('SIGINT', function() {
  console.log('disconnecting...');
  zwave.disconnect();
  pub.close()
  process.exit();
});

