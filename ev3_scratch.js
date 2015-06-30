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
  
  device.open({ stopBits: 0, bitRate: 9600, ctsFlowControl: 0 });
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
  
  ext.allMotorsOn = function()
  {
    this.motorsOnCommand = new Buffer("0C000000800000A4000114A60001","hex");
  
    device.send(this.motorsOnCommand);
  }

  ext.allMotorsOff = function()
  {
  this.motorsOnCommand = new Buffer("09000100800000A3000100","hex");
  
  device.send(this.motorsOnCommand);
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