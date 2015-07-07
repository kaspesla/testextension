// EV3 ScratchX Plugin
// Copyright 2015 Ken Aspeslagh @massivevector
// Only tested on Mac. Brick must be named starting with "serial" if the plugin is to recognize it.
// Rename the brick before pairing it with the Mac or else the name gets cached and the serial port will have the old name
// Mine bricks are named serialBrick1 (etc)
// Turn off the iPod/iPhone/iPad checkbox on the EV3 Bluetooth settings or else it will not work at all

(function(ext) {
  // Cleanup function when the extension is unloaded
  ext._shutdown = function() {};
  
  // Status reporting code
  // Use this to report missing hardware, plugin or unsupported browser
  ext._getStatus = function()
  {
    return {status: 2, msg: 'Ready'};
  };
  
  ext._getStatus = function()
  {
      if (!connected)
        return { status:1, msg:'Disconnected' };
      else
        return { status:2, msg:'Connected' };
  };
  
  ext._deviceRemoved = function(dev)
  {
    console.log('Device removed');
    // Not currently implemented with serial devices
  };

  
  var connected = false;
  var notifyConnection = false;
  var device = null;
  
  var potentialDevices = [];
  ext._deviceConnected = function(dev) {
  
  //console.log('_deviceConnected: ' + dev.id);

  // brick's serial port must be named like tty.serialBrick7-SerialPort
  // this is how 10.10 is naming it automatically, the brick name being serialBrick7
  // the Scratch plugin is only letting us know about serial ports with names that
  // "begin with tty.usbmodem, tty.serial, or tty.usbserial" - according to khanning
  
  if (dev.id.indexOf('/dev/tty.serialBrick') === 0 && dev.id.indexOf('-SerialPort') != -1)
  {
      potentialDevices.push(dev);
      if (!device)
          tryNextDevice();
  }
  };
  
  var poller = null;
  var watchdog = null;
  var DEBUG_NO_EV3 = false;
  
  function tryNextDevice()
  {
    device = potentialDevices.shift();
    if (!device)
        return;
  
  if (!DEBUG_NO_EV3)
  {
    device.open({ stopBits: 0, bitRate: 115200, ctsFlowControl: 0, parity:2, bufferSize:255 });
    console.log('Attempting connection with ' + device.id);
    device.set_receive_handler(receive_handler);

    poller = setInterval(function() {
                       //  queryFirmware();
                       }, 1000);

    // need some way to see if connection is working, a watchdog ping or something
    connected =true;
  }
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
  
  ext._shutdown = function()
  {
    if (device && connected)
        device.close();
    if (poller)
        clearInterval(poller);
    connected = false;
    device = null;
  };
  
  // create hex string from bytes
  function createHexString(arr)
  {
      var result = "";
      for (i in arr)
      {
          var str = arr[i].toString(16);
          str = str.toUpperCase();
          str = str.length == 0 ? "00" :
          str.length == 1 ? "0" + str :
          str.length == 2 ? str :
          str.substring(str.length-2, str.length);
          result += str;
        }
        return result;
  }
  
  var waitingCallbacks = [[],[],[],[]];
  var waitingQueries = [];
  var global_touch_pressed = [false, false, false, false];
  var global_sensor_queried = [0, 0, 0, 0];

  function receive_handler(data)
  {
    var inputData = new Uint8Array(data);
    console.log("received: " + createHexString(inputData));
  
   // only support touch sensor for now
 //   if (waitingForResponseFor == TOUCH_SENSOR)
    {
        var result = inputData[5];
        var resBool = (result == 100);
        {
           var this_is_from_port = waitingQueries.shift();
          global_touch_pressed[this_is_from_port] = resBool;
          global_sensor_queried[this_is_from_port]--;
           while(callback = waitingCallbacks[this_is_from_port].shift())
           {
                callback(resBool);
           }
        }
    }
  }

  var counter = 0;
  
  // add counter and byte length encoding prefix. return Uint8Array of final message
  function createMessage(str)
  {
//console.log("message: " + str);
  
      var length = ((str.length / 2) + 2);

      var a = new ArrayBuffer(4);
      var c = new Uint16Array(a);
      var arr = new Uint8Array(a);
      c[1] = counter;
      c[0] = length;
      counter++;
      var mess = new Uint8Array((str.length / 2) + 4);
      
      for (var i = 0; i < 4; i ++)
      {
        mess[i] = arr[i];
      }
  
      for (var i = 0; i < str.length; i += 2)
      {
        mess[(i / 2) + 4] = window.parseInt(str.substr(i, 2), 16);
      }
  
     console.log("sending: " + createHexString(mess));

      return mess;
  }
  
  // motor port bit field from menu choice string
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
  
  // create 8 bit hex couplet
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
  
  // int bytes using weird serialization method
  function getPackedOutputHexString(num, lc)
  {
    // f-ed up nonsensical unsigned bit packing. see cOutputPackParam in c_output-c in EV3 firmware
    var a = new ArrayBuffer(2);
    var sarr = new Int8Array(a);
    var uarr = new Uint8Array(a);
  
    sarr[0] = num & 0x000000FF;
    sarr[1] = (num >> 8) & 0x000000FF;

    if (lc == 0) //power < 32 && power > -32)
    {
        var powerbits = uarr[0];
        powerbits &= 0x0000003F;
        return hexcouplet(powerbits);
    }
    else if (lc == 1) //(power < 127 && power > -127)
    {
      return "81" + hexcouplet(uarr[0]);
    }
    else if (lc == 2) //(power < 32767 && power > 32767)
    {
        return "82" + hexcouplet(uarr[0]) + hexcouplet(uarr[1]);
    }

    return "00";
  }
  
  var DIRECT_COMMAND_PREFIX = "800000";
  var DIRECT_COMMAND_REPLY_PREFIX = "000100";
  // direct command opcode/prefixes
  var SET_MOTOR_SPEED = "A400";
  var SET_MOTOR_STOP = "A300";
  var SET_MOTOR_START = "A600";
  var NOOP = "0201";
  var PLAYTONE = "9401";
  var READ_SENSOR = "9A00";
  var TOUCH_SENSOR = "10";
  
  
  function sendCommand(commandArray)
  {
    if (connected && device)
        device.send(commandArray.buffer);
  }
  
  ext.allMotorsOn = function(which, power)
  {
    console.log("motor " + which + " power: " + power);
  
    motor(which, power);
  }
  
  function motor(which, power)
  {
    var motorBitField = getMotorBitsHexString(which);

    var powerBits = getPackedOutputHexString(power, 1);

    var motorsOnCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_SPEED + motorBitField + powerBits + SET_MOTOR_START + motorBitField);
  
    sendCommand(motorsOnCommand);
  }

  
  var frequencies = { "C4" : 262, "D4" : 294, "E4" : 330, "F4" : 349, "G4" : 392, "A4" : 440, "B4" : 494, "C5" : 523, "D5" : 587, "E5" : 659, "F5" : 698, "G5" : 784, "A5" : 880, "B5" : 988, "C6" : 1047, "D6" : 1175, "E6" : 1319, "F6" : 1397, "G6" : 1568, "A6" : 1760, "B6" : 1976, "C#4" : 277, "D#4" : 311, "F#4" : 370, "G#4" : 415, "A#4" : 466, "C#5" : 554, "D#5" : 622, "F#5" : 740, "G#5" : 831, "A#5" : 932, "C#6" : 1109, "D#6" : 1245, "F#6" : 1480, "G#6" : 1661, "A#6" : 1865 };
  
  
  ext.playTone = function(tone, duration, callback)
  {
      var freq = frequencies[tone];
      console.log("playTone " + tone + " duration: " + duration + " freq: " + freq);
      var volume = 2;
      var volString = getPackedOutputHexString(volume, 1);
      var freqString = getPackedOutputHexString(freq, 2);
      var durString = getPackedOutputHexString(duration, 2);
      
      var toneCommand = createMessage(DIRECT_COMMAND_PREFIX + PLAYTONE + volString + freqString + durString);

      sendCommand(toneCommand);
  
       window.setTimeout(function() {
                    callback();
                    }, duration);
  }
  
  ext.allMotorsOff = function(how)
  {
      console.log("allMotorsOff");
 
      motorsStop(how);
  }
 
  function motorsStop(how)
  {
      var motorBitField = getMotorBitsHexString("all");

      var howHex = '00';
      if (how == 'break')
         howHex = '01';
      
      var motorsOffCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_STOP + motorBitField + howHex);
      
      sendCommand(motorsOffCommand);
  }

  ext.steeringControl = function(ports, what, duration, callback)
  {
    var defaultPower = 50;
    if (what == 'forward')
    {
        motor(ports, defaultPower);
    }
    else if (what == 'reverse')
    {
        motors(ports, -1 * defaultPower);
    }
    else
    {
        var p =  ports.split("+");
        if (what == 'right')
        {
            motors(p[0], -1 * defaultPower);
            motors(p[1],  defaultPower);
        }
        else if (what == 'left')
         {
         motors(p[1], -1 * defaultPower);
         motors(p[0],  defaultPower);
         }
    }
    window.setTimeout(function()
    {
        motorsStop('break');
        callback();
    } , duration*1000);
  }
 
  ext.whenButtonPressed = function(port)
  {
    if (!device || !connected)
        return false;
    var portInt = parseInt(port) - 1;
    if (global_sensor_queried[portInt] == 0)
    {
        global_sensor_queried[portInt]++;
        readFromSensor(portInt, TOUCH_SENSOR, 0);
    }
    return global_touch_pressed[portInt];
  }
  
  ext.readSensorPort = function(port, callback)
  {
    var portInt = parseInt(port) - 1;

    waitingCallbacks[portInt].push(callback);
    if (global_sensor_queried[portInt] == 0)
    {
      global_sensor_queried[portInt]++;
      readFromSensor(portInt, TOUCH_SENSOR, 0);
    }
  }
  
  function readFromSensor(port, type, mode)
  {
    // we'll need to push the callback if we want to throttle queries to the EV3 and call each one when the result comes back
      //if (waitingCallback != 0)
      {
            waitingQueries.push(port);
  
          var readCommand = createMessage(DIRECT_COMMAND_REPLY_PREFIX +
                                               READ_SENSOR +
                                               hexcouplet(port) +
                                               type +
                                                "0060");
      
  
          sendCommand(readCommand);
      }
  }
  
  // Block and block menu descriptions
  var descriptor = {
  blocks: [
           [' ', 'motor %m.whichMotorPort speed %n',                    'allMotorsOn',      'B+C', 100],
           ['w', 'drive %m.dualMotors %m.turnStyle %n seconds',         'steeringControl',  'B+C', 'forward', 3],
           [' ', 'all motors off  %m.breakCoast',                       'allMotorsOff',     'break'],
           ['h', 'when %m.whichInputPort button pressed',               'whenButtonPressed','1'],
           ['R', 'button %m.whichInputPort pressed',                    'readSensorPort',   '1'],
           ['w', 'play tone  %m.note duration %n ms',                   'playTone',         'C5', 500],
           ],
  menus: {
  whichMotorPort:   ['A', 'B', 'C', 'D', 'A+D', 'B+C'],
  dualMotors:       ['A+D', 'B+C'],
  turnStyle:        ['forward', 'reverse', 'right', 'left'],
  breakCoast:       ['break', 'coast'],
  note:["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5","C6","D6","E6","F6","G6","A6","B6","C#4","D#4","F#4","G#4","A#4","C#5","D#5","F#5","G#5","A#5","C#6","D#6","F#6","G#6","A#6"],
    whichInputPort: ['1', '2', '3', '4'],
    },
  };

  var serial_info = {type: 'serial'};
  ScratchExtensions.register('EV3 Control', descriptor, ext, serial_info);
  console.log('registered: ');
})({});

