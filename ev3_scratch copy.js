 (function(ext) {
  // Cleanup function when the extension is unloaded
  ext._shutdown = function() {};
  
  // Status reporting code
  // Use this to report missing hardware, plugin or unsupported browser
  ext._getStatus = function() {
  return {status: 2, msg: 'Ready'};
  };
  ext.my_first_block = function() {
  // Code that gets executed when the block is run
  };
  
  ext._getStatus = function() {
  if (!connected)
  return { status:1, msg:'Disconnected' };
  else
  return { status:2, msg:'Connected' };
  };
  
  ext._deviceRemoved = function(dev) {
  console.log('Device removed');
  // Not currently implemented with serial devices
  };
  
  
  var connected = false;
  var notifyConnection = false;
  var device = null;
  
  var potentialDevices = [];
  ext._deviceConnected = function(dev) {
  
  console.log('_deviceConnected: ' + dev.id);
  if (dev.id.indexOf('/dev/tty.serialBrick') === 0)
  {
      potentialDevices.push(dev);
      if (!device)
          tryNextDevice();
  }
  };
  
  var poller = null;
  var watchdog = null;
  function tryNextDevice() {
  device = potentialDevices.shift();
  if (!device) return;
  
  device.open({ stopBits: 0, bitRate: 115200, ctsFlowControl: 0, parity:2, bufferSize:255 });
  console.log('Attempting connection with ' + device.id);
  device.set_receive_handler(function(data) {
                             var inputData = new Uint8Array(data);
                       //      processInput(inputData);
                             });
  
  poller = setInterval(function() {
                       //  queryFirmware();
                       }, 1000);
  
  connected =true;
  /*
  watchdog = setTimeout(function() {
                        clearInterval(poller);
                        poller = null;
                        device.set_receive_handler(null);
                        device.close();
                        device = null;
                        tryNextDevice();
                        }, 5000);
   */
  }
  
  ext._shutdown = function() {
  // TODO: Bring all pins down 
  if (device) device.close();
  if (poller) clearInterval(poller);
  device = null;
  };
  
  function fromHex(str)
  {
  var arr = new Uint8Array(str.length / 2);
  for (var i = 0; i < str.length; i += 2) {
  arr[i / 2] = window.parseInt(str.substr(i, 2), 16);
  }
  return arr;
  }

  var counter = 0;
  function createMessage(str)
  {
  var length = ((str.length() / 2) + 2);

  var a = new ArrayBuffer(4);
  var c = new Uint16Array(a);
  var arr = new Uint8Array(a);
  c[1] = counter;
  c[0] = length;
  
  var mess = new Uint8Array((str.length / 2) + 4);
  
  for (var i = 0; i < 4; i ++) {
  mess[i] = arr[i]);
  }
  
  for (var i = 0; i < str.length; i += 2) {
  mess[(i / 2) + 4] = window.parseInt(str.substr(i, 2), 16);
  }
  return mess;
  
  }
  
  
  var noOp = fromHex("070002008000000201");

  ext.allMotorsOn = function()
  {
  console.log("allMotorsOn");
    var motorsOnCommand = createMessage("0C000100800000A4000614A60001");
  
    device.send(motorsOnCommand.buffer);

  }

  ext.allMotorsOff = function()
  {
  console.log("allMotorsOff");

  var motorsOffCommand = fromHex("09000200800000A3000100");
  
  device.send(motorsOffCommand.buffer);

  }

  
  // Block and block menu descriptions
  var descriptor = {
  blocks: [
           [' ', 'turn motor on',                         'allMotorsOn'],
           [' ', 'turn motor off',                        'allMotorsOff'],

           ]
  };

  var serial_info = {type: 'serial'};
  ScratchExtensions.register('EV3 Control', descriptor, ext, serial_info);
  console.log('registered: ');
})({});

function processInput(inputData) {
    for (var i=0; i < inputData.length; i++) {
    }
    
}