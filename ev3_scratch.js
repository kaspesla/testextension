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
  potentialDevices.push(dev);
  if (!device)
  tryNextDevice();
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
                             processInput(inputData);
                             });
  
  poller = setInterval(function() {
                       queryFirmware();
                       }, 1000);
  
  watchdog = setTimeout(function() {
                        clearInterval(poller);
                        poller = null;
                        device.set_receive_handler(null);
                        device.close();
                        device = null;
                        tryNextDevice();
                        }, 5000);
  }
  
  ext._shutdown = function() {
  // TODO: Bring all pins down 
  if (device) device.close();
  if (poller) clearInterval(poller);
  device = null;
  };
  
  
  // Block and block menu descriptions
  var descriptor = {
  blocks: [
           [' ', 'turn motor on',                         'allMotorsOn'],
           [' ', 'turn motor off',                        'allMotorsOff'],

           ]
  };

  var serial_info = {type: 'serial'};
  ScratchExtensions.register('Example', descriptor, ext, serial_info);
  
  // Register the extension
  ScratchExtensions.register('EV3 Control', descriptor, ext, serial_info]);
  })({});

