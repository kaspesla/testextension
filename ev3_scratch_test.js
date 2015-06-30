 (function(ext) {
  // Cleanup function when the extension is unloaded
  ext._shutdown = function() {};
  
  // Status reporting code
  // Use this to report missing hardware, plugin or unsupported browser
  ext._getStatus = function() {
  return {status: 2, msg: 'Ready'};
  };
  allMotorsOn = function() {
  // Code that gets executed when the block is run
  };

  allMotorsOff = function() {
  // Code that gets executed when the block is run
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
  ScratchExtensions.register('EV3 Control', descriptor, ext, serial_info);
  })({});


