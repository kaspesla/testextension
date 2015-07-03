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
  
  //console.log('_deviceConnected: ' + dev.id);
  if (dev.id.indexOf('/dev/tty.serialBrick') === 0 && dev.id.indexOf('-SerialPort') != -1)
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
  
  //device.open({ stopBits: 0, bitRate: 115200, ctsFlowControl: 0, parity:2, bufferSize:255 });
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
  console.log("message: " + str);
  
  var length = ((str.length / 2) + 2);

  var a = new ArrayBuffer(4);
  var c = new Uint16Array(a);
  var arr = new Uint8Array(a);
  c[1] = counter;
  c[0] = length;
  counter++;
  var mess = new Uint8Array((str.length / 2) + 4);
  
  for (var i = 0; i < 4; i ++) {
  mess[i] = arr[i];
  }
  
  for (var i = 0; i < str.length; i += 2) {
  mess[(i / 2) + 4] = window.parseInt(str.substr(i, 2), 16);
  }
  return mess;
  
  }
  
  
  var noOp = fromHex("8000000201");

  function getMotorBitsHexString(which)
  {
     if (which == "A")
        return "01";
    else if (which == "B")
        return "02";
    else if (which == "C")
        return "04";
    else if (which == "D")
        return "08";
    else if (which == "B+C")
        return "06";
    else if (which == "A+D")
        return "09";
  else if (which == "all")
        return "0F";

    return "00";
  }
  
  function hexcouplet(num)
  {
    var str = num.toString(16);
    str = str.toUpperCase();
    if (str.length == 1)
    {
      return "0" + str;
    }
    return str;
  }
  
  function getPowerBitsHexString(power)
  {
    // f-ed up nonsensical unsigned 8-bit bit packing. see cOutputPackParam in c_output-c in EV3 firmware
    var a = new ArrayBuffer(1);
    var sarr = new Int8Array(a);
    var uarr = new Uint8Array(a);
  
    sarr[0] = power;
    var powerbits = uarr[0];
    if (power < 32 && power > -32)
    {
        powerbits &= 0x0000003F;
        return hexcouplet(powerbits);
    }
    else
    {
      return "81" + hexcouplet(powerbits);
    }

    return "00";
  }
  
  var DIRECT_COMMAND_PREFIX + "800000";
  var SET_MOTOR_SPEED = "A400";
  var SET_MOTOR_STOP = "A300";
  var SET_MOTOR_START = "A600";
  
  ext.allMotorsOn = function(which, power)
  {
    console.log("motor " + which + " power: " + power);
    var motorBitField = getMotorBitsHexString(which);

    var powerBits = getPowerBitsHexString(power);

    var motorsOnCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_SPEED + motorBitField + powerBits + SET_MOTOR_START + motorBitField);
    device.send(motorsOnCommand.buffer);

  }

  ext.allMotorsOff = function(how)
  {
      console.log("allMotorsOff");
      
      var motorBitField = getMotorBitsHexString("all");

      var howHex = '00';
      if (how == 'break')
         howHex = '01';
      
      var motorsOffCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_STOP + motorBitField + howHex);
      
      device.send(motorsOffCommand.buffer);

  }

  
  // Block and block menu descriptions
  var descriptor = {
  blocks: [
           [' ', 'motor %m.whichMotorPort speed %n',                         'allMotorsOn', 'B+C', 100],
           [' ', 'all motors off %m.breakCoast',                        'allMotorsOff'],
           ['h', 'when button pressed',  'whenButtonPressed', 'button pressed'],

           ],
  menus: {
  whichMotorPort: ['A', 'B', 'C', 'D', 'A+D', 'B+C'],
  breakCoast: ['break', 'coast'],
    },
  };

  var serial_info = {type: 'serial'};
  ScratchExtensions.register('EV3 Control', descriptor, ext, serial_info);
  console.log('registered: ');
})({});

function processInput(inputData) {
    for (var i=0; i < inputData.length; i++) {
    }
    
}