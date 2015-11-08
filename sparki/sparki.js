// Sparki ScratchX Plugin
// Copyright 2015 Ken Aspeslagh @massivevector
// Only tested on Mac.
// sudo ln -s tty.ArcBotics-DevB tty.serialSparki1
// Sparki must be programmed with SJ-BT Control sketch

function timeStamp()
{
    return (new Date).toISOString().replace(/z|t/gi,' ').trim();
}

// scratchX is loading our javascript file again each time a saved SBX file is opened.
// JavaScript is weird and this causes our object to be reloaded and re-registered.
// Prevent this using global variable theSparkiDevice and SparkiConnected that will only initialize to null the first time they are declared.
// This fixes a Windows bug where it would not reconnect.
var DEBUG_NO_Sparki = false;
var theSparkiDevice = theSparkiDevice || null;
var SparkiScratchAlreadyLoaded = SparkiScratchAlreadyLoaded || false;
var SparkiConnected = SparkiConnected || false;
var potentialSparkiDevices = potentialSparkiDevices || [];

(function(ext) {
  // Cleanup function when the extension is unloaded

  ext._getStatus = function()
  {
      if (!SparkiConnected)
        return { status:1, msg:'Disconnected' };
      else
        return { status:2, msg:'Connected' };
  };
  
  ext._deviceRemoved = function(dev)
  {
    console.log(timeStamp() +' Device removed');
    // Not currently implemented with serial devices
  };

  
  var connecting = false;
  var notifyConnection = false;
  var potentialDevices = []; // copy of the list
  var warnedAboutBattery = false;
  var deviceTimeout = 0;
 
  ext._deviceConnected = function(dev)
  {
      console.log(timeStamp() + ' _deviceConnected: ' + dev.id);
      if (SparkiConnected)
      {
        console.log("Already SparkiConnected. Ignoring");
      }
      // brick's serial port must be named like tty.serialBrick7-SerialPort
      // this is how 10.10 is naming it automatically, the brick name being serialBrick7
      // the Scratch plugin is only letting us know about serial ports with names that
      // "begin with tty.usbmodem, tty.serial, or tty.usbserial" - according to khanning
      
      if ((dev.id.indexOf('/dev/tty.serialSparki') === 0) || dev.id.indexOf('COM') === 0)
      {

        if (potentialSparkiDevices.filter(function(e) { return e.id == dev.id; }).length == 0) {
              potentialSparkiDevices.push(dev); }
 
          if (!deviceTimeout)
            deviceTimeout = setTimeout(tryAllDevices, 1000);
      }
  };
 
 function tryAllDevices()
 {
    potentialDevices = potentialSparkiDevices.slice(0);
    // start recursive loop
    tryNextDevice();
 }
  
  var poller = null;
  var pingTimeout = null;
  var connectionTimeout = null;
  
  var waitingForPing = false;
  var waitingForInitialConnection = false;

 function clearSensorStatuses()
 {
     var numSensorBlocks = 9;
     waitingQueries = [];
     for (x = 0; x < numSensorBlocks; x++)
     {
        waitingCallbacks[x] = [];
        global_sensor_result[x] = 0;
        global_sensor_queried[x] = 0;
     }
 }
 
var counter = 0;

function tryToConnect()
{
    clearSensorStatuses();
    counter = 0; 
    
    theSparkiDevice.open({ stopBits: 0 });
    console.log(timeStamp() + ': Attempting connection with ' + theSparkiDevice.id);
    theSparkiDevice.set_receive_handler(receive_handler);
 
    connecting = true;
    testTheConnection(startupPingCallback);
    waitingForInitialConnection = true;
    connectionTimeout = setTimeout(connectionTimeOutCallback, 3000);
}

function startupPingCallback(result)
{
   console.log(timeStamp() + ": got ping at connect: " + result);
 
   if (result != "hello")
   {
     console.log("got wrong answer");
     connecting = false;
     return;
   }
    waitingForInitialConnection = false;

    SparkiConnected = true;
    connecting = false;
 
   // playStartUpTones();
 
   // setupWatchdog();
 
     if (deferredCommand)
     {
        var tempCommand = deferredCommand;
        deferredCommand = null;
        window.setTimeout(function() {
                  sendCommand(tempCommand);
                   }, 2500);
     }
 
}

function setupWatchdog()
{
    if (poller)
        clearInterval(poller);

   poller = setInterval(pingWatchdog, 10000);
}

function pingWatchdog()
{
    console.log(timeStamp() + ": pingWatchdog");
    testTheConnection(pingCallback);
    waitingForPing = true;
    pingTimeout = setTimeout(pingTimeOutCallback, 3000);
}

function pingTimeOutCallback()
{
   if (waitingForPing == true)
   {
     console.log(timeStamp() + ": Ping timed out");
      if (poller)
        clearInterval(poller);
      
      SparkiConnected = false;
   }
 }

function connectionTimeOutCallback()
{
   if (waitingForInitialConnection == true)
   {
     console.log(timeStamp() + ": Initial connection timed out");
     connecting = false;
 
     if (potentialDevices.length == 0)
     {
        console.log(timeStamp() + ": Tried all devices with no luck.");
 
     //  alert("Failed to connect to a brick.\n\nMake sure your brick is:\n 1) powered on with Bluetooth On\n 2) named starting with serial (if on a Mac)\n 3) paired with this computer\n 4) the iPhone/iPad/iPod check box is NOT checked\n 5) Do not start a connection to or from the brick in any other way. Let the Scratch plug-in handle it!\n\nand then try reloading the webpage.");
       /*  if (r == true) {
         reconnect();
         } else {
         // do nothing
        }
        */
        theSparkiDevice = null;
    }
    else
    {
        tryNextDevice();
    }
   }
 }

function pingCallback(result)
{
   console.log(timeStamp() + ": pinged device: " + result);
   if (pingTimeout)
    clearTimeout(pingTimeout);
   waitingForPing = false;
}


function testTheConnection(theCallback)
{
   window.setTimeout(function() {
                          pingDevice(theCallback);
                       }, 500);
 }

function playStartUpTones()
{
    var tonedelay = 1000;
    window.setTimeout(function() {
                          playFreqM2M(262, 100);
                       }, tonedelay);

     window.setTimeout(function() {
                          playFreqM2M(392, 100);
                       }, tonedelay+150);
     
     window.setTimeout(function() {
                          playFreqM2M(523, 100);
                       }, tonedelay+300);
 }
 
  function tryNextDevice()
  {
    potentialDevices.sort((function(a, b){return b.id.localeCompare(a.id)}));

    console.log("devices: " + potentialDevices);
    var device = potentialDevices.shift();
    if (!device)
        return;
 
    theSparkiDevice = device;
 
    if (!DEBUG_NO_Sparki)
    {
        tryToConnect();
    }
  }
  
  ext._shutdown = function()
  {
    console.log(timeStamp() +' SHUTDOWN: ' + theSparkiDevice.id);
/*
    if (theSparkiDevice)
        theSparkiDevice.close();
    if (poller)
        clearInterval(poller);
    SparkiConnected = false;
    theSparkiDevice = null;
 */
 
  };
 
 function ab2str(buf)
 {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
 }
 
 function str2ab(str)
 {
     var buf = new ArrayBuffer(str.length); // 2 bytes for each char
     var bufView = new Uint8Array(buf);
     for (var i=0, strLen=str.length; i<strLen; i++)
     {
        bufView[i] = str.charCodeAt(i);
     }
     return buf;
 }
 
  var STRING_RESULT = "STRING_RESULT";
 
 
  var waitingCallbacks = [[],[],[],[],[],[],[],[], []];
  var waitingQueries = [];
  var global_sensor_result =  [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var global_sensor_queried = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  var recv_buffer = "";
 
  function receive_handler(data)
  {
    var inputData = ab2str(data);
    console.log(timeStamp() + " received: " + inputData);
    recv_buffer += inputData;
    var arr = recv_buffer.split(/[\n\r]+/);
    if (arr.length > 1) {
        recieved_line(arr[0]);
        recv_buffer = "";
    }
 }
 
 function recieved_line(inputData)
 {
   console.log(timeStamp() + " recieved_line: " + inputData);
   if (!(SparkiConnected || connecting))
      return;
  
    var query_info = waitingQueries.shift();
    if (!query_info)
        return;
 
    var this_is_from_port = query_info[0];
    var mode = query_info[1];
    var modeType = query_info[2];
     
    var theResult = "";

    if (mode == STRING_RESULT)
    {
        theResult = inputData;
    }
 
    global_sensor_result[this_is_from_port] = theResult;
    global_sensor_queried[this_is_from_port]--;
    while(callback = waitingCallbacks[this_is_from_port].shift())
    {
        console.log("result: " + theResult);
        callback(theResult);
    }
  }

 function getIRButtonNameForCode(inButtonCode)
 {
     for (var i = 0; i < IRbuttonCodes.length; i++)
     {
         if (inButtonCode == IRbuttonCodes[i])
        {
            return IRbuttonNames[i];
         }
     }
    return "";
 }
 
  var deferredCommand = null;
 
  function sendCommand(command)
  {
    if ((SparkiConnected || connecting) && theSparkiDevice)
    {
        theSparkiDevice.send(str2ab(command + "\n"));
    }
    else
    {
       deferredCommand = command;
       if (theSparkiDevice && !connecting)
       {
         tryToConnect(); // try to connect
       }
       else if (!connecting)
       {
         tryAllDevices(); // try device list again
       }
 
    }
  }
 

  var frequencies = { "C4" : 262, "D4" : 294, "E4" : 330, "F4" : 349, "G4" : 392, "A4" : 440, "B4" : 494, "C5" : 523, "D5" : 587, "E5" : 659, "F5" : 698, "G5" : 784, "A5" : 880, "B5" : 988, "C6" : 1047, "D6" : 1175, "E6" : 1319, "F6" : 1397, "G6" : 1568, "A6" : 1760, "B6" : 1976, "C#4" : 277, "D#4" : 311, "F#4" : 370, "G#4" : 415, "A#4" : 466, "C#5" : 554, "D#5" : 622, "F#5" : 740, "G#5" : 831, "A#5" : 932, "C#6" : 1109, "D#6" : 1245, "F#6" : 1480, "G#6" : 1661, "A#6" : 1865 };
  
 var colors = [ "none", "black", "blue", "green", "yellow", "red", "white"];
 
 var IRbuttonNames = ['Top Left', 'Bottom Left', 'Top Right', 'Bottom Right', 'Top Bar'];
 var IRbuttonCodes = [1,            2,              3,          4,              9];
 
  ext.playTone = function(tone, duration, callback)
  {
      var freq = frequencies[tone];
      console.log("playTone " + tone + " duration: " + duration + " freq: " + freq);
      var volume = 100;
      var volString = getPackedOutputHexString(volume, 1);
      var freqString = getPackedOutputHexString(freq, 2);
      var durString = getPackedOutputHexString(duration, 2);
      
      var toneCommand = createMessage(DIRECT_COMMAND_PREFIX + PLAYTONE + volString + freqString + durString);

      sendCommand(toneCommand);
  
       window.setTimeout(function() {
                    driveTimer = 0;
                    callback();
                    }, duration);
  }
 
 
 ext.playFreq = function(freq, duration, callback)
 {
     console.log("playFreq duration: " + duration + " freq: " + freq);
     var volume = 100;
     var volString = getPackedOutputHexString(volume, 1);
     var freqString = getPackedOutputHexString(freq, 2);
     var durString = getPackedOutputHexString(duration, 2);
     
     var toneCommand = createMessage(DIRECT_COMMAND_PREFIX + PLAYTONE + volString + freqString + durString);
     
     sendCommand(toneCommand);
     
     window.setTimeout(function() {
                       driveTimer = 0;
                       callback();
                       }, duration);
 }
 
function playFreqM2M(freq, duration)
 {
     console.log("playFreqM2M duration: " + duration + " freq: " + freq);
     var volume = 100;
     var volString = getPackedOutputHexString(volume, 1);
     var freqString = getPackedOutputHexString(freq, 2);
     var durString = getPackedOutputHexString(duration, 2);
     
     var toneCommand = createMessage(DIRECT_COMMAND_PREFIX + PLAYTONE + volString + freqString + durString);
     
     sendCommand(toneCommand);
  
 }
 
 function clearDriveTimer()
 {
    if (driveTimer)
        clearInterval(driveTimer);
    driveTimer = 0;
    if (driveCallback)
        driveCallback();
    driveCallback = 0;
}
 
  ext.allMotorsOff = function(how)
  {
      clearDriveTimer();
      motorsStop(how);
  }
 
 var driveTimer = 0;
 driveCallback = 0;
 
function howStopHex(how)
{
    if (how == 'break')
        return '01';
    else
        return '00';
}
                                                                            
  function motorsStop(how)
  {
      console.log("motorsStop");

      var motorBitField = getMotorBitsHexString("all");

      var howHex = howStopHex(how);
      
      var motorsOffCommand = createMessage(DIRECT_COMMAND_PREFIX + SET_MOTOR_STOP + motorBitField + howHex);
      
      sendCommand(motorsOffCommand);
  }
  
  function sendNOP()
  {
     var nopCommand = createMessage(DIRECT_COMMAND_PREFIX + NOOP);
  }

  ext.steeringControl = function(ports, what, duration, callback)
  {
    clearDriveTimer();
    var defaultSpeed = 50;
    if (what == 'forward')
    {
        motor(ports, defaultSpeed);
    }
    else if (what == 'reverse')
    {
        motor(ports, -1 * defaultSpeed);
    }
     else if (what == 'right')
     {
       motor2(ports, defaultSpeed);
     }
     else if (what == 'left')
     {
       motor2(ports, -1 * defaultSpeed);
     }
    driveCallback = callback;
    driveTimer = window.setTimeout(function()
    {
        if (duration > 0) // allow zero duration to run motors asynchronously
        {
          motorsStop('coast');
        }
        callback();
    } , duration*1000);
  }
 
  function readTouchSensor(portInt)
  {
     if (global_sensor_queried[portInt] == 0)
     {
       global_sensor_queried[portInt]++;
       readFromSensor(portInt, TOUCH_SENSOR, mode0);
     }
  }
 
 function readIRRemoteSensor(portInt)
 {
    if (global_sensor_queried[portInt] == 0)
    {
        global_sensor_queried[portInt]++;
        readFromSensor2(portInt, IR_SENSOR, IR_REMOTE);
    }
 }
 
  ext.whenButtonPressed = function(port)
  {
    if (!theSparkiDevice || !SparkiConnected)
        return false;
    var portInt = parseInt(port) - 1;
    readTouchSensor(portInt);
    return global_sensor_result[portInt];
  }

 ext.whenRemoteButtonPressed = function(IRbutton, port)
 {
     if (!theSparkiDevice || !SparkiConnected)
        return false;
 
     var portInt = parseInt(port) - 1;
     readIRRemoteSensor(portInt);
 
     return (global_sensor_result[portInt] == IRbutton);
 }
 
  ext.readTouchSensorPort = function(port, callback)
  {
    var portInt = parseInt(port) - 1;

    waitingCallbacks[portInt].push(callback);
    readTouchSensor(portInt);
  }
 
  ext.readColorSensorPort = function(port, mode, callback)
  {
    var modeCode = AMBIENT_INTENSITY;
    if (mode == 'reflected') { modeCode = REFLECTED_INTENSITY; }
    if (mode == 'color') { modeCode = COLOR_VALUE; }
    if (mode == 'RGBcolor') { modeCode = COLOR_RAW_RGB; }
 
    var portInt = parseInt(port) - 1;
    waitingCallbacks[portInt].push(callback);

    readFromColorSensor(portInt, modeCode);
  }
 
 function readFromColorSensor(portInt, modeCode)
 {
     if (global_sensor_queried[portInt] == 0)
     {
        global_sensor_queried[portInt]++;
        readFromSensor2(portInt, COLOR_SENSOR, modeCode);
     }
 }
 
 var lineCheckingInterval = 0;

 ext.waitUntilDarkLinePort = function(port, callback)
 {
    if (lineCheckingInterval)
        clearInterval(lineCheckingInterval);
    lineCheckingInterval = 0;
    var modeCode = REFLECTED_INTENSITY;
    var portInt = parseInt(port) - 1;
    global_sensor_result[portInt] = -1;
 
    lineCheckingInterval = window.setInterval(function()
    {
        readFromColorSensor(portInt, modeCode);
         if (global_sensor_result[portInt] < 25 && global_sensor_result[portInt] >= 0)    // darkness or just not reflection (air)
         {
                clearInterval(lineCheckingInterval);
                lineCheckingInterval = 0;
                callback();
         }
    }, 5);
 }
 
  ext.readGyroPort = function(mode, port, callback)
  {
    var modeCode = GYRO_ANGLE;
    if (mode == 'rate') { modeCode = GYRO_RATE; }
 
    var portInt = parseInt(port) - 1;
 
    waitingCallbacks[portInt].push(callback);
    if (global_sensor_queried[portInt] == 0)
    {
      global_sensor_queried[portInt]++;
      readFromSensor2(portInt, GYRO_SENSOR, modeCode);
    }
  }
 
  ext.readDistanceSensorPort = function(port, callback)
  {
    var portInt = parseInt(port) - 1;

    waitingCallbacks[portInt].push(callback);
    if (global_sensor_queried[portInt] == 0)
    {
      global_sensor_queried[portInt]++;
      readFromSensor2(portInt, IR_SENSOR, IR_PROX);
    }
  }
  
  ext.readRemoteButtonPort = function(port, callback)
  {
    var portInt = parseInt(port) - 1;

    waitingCallbacks[portInt].push(callback);
 
    readIRRemoteSensor(portInt);
  }
 
  function readFromSensor(port, type, mode)
  {

      waitingQueries.push([port, type, mode]);

      var readCommand = createMessage(DIRECT_COMMAND_REPLY_PREFIX +
                                           READ_SENSOR +
                                           hexcouplet(port) +
                                           type +
                                            mode + "60");

      sendCommand(readCommand);
  }

 function readFromSensor2(port, type, mode)
 {
    waitingQueries.push([port, type, mode]);
 
    var readCommand = createMessage(DIRECT_COMMAND_REPLY_SENSOR_PREFIX +
                                 INPUT_DEVICE_READY_SI + "00" + // layer
                                 hexcouplet(port) + "00" + // type
                                 mode +
                                 "0160"); // result stuff
 
    sendCommand(readCommand);
 }

 function pingDevice(callback)
 {
    var portInt = 8;
    waitingQueries.push([portInt, STRING_RESULT, 0]);
    waitingCallbacks[portInt].push(callback);
     if (global_sensor_queried[portInt] == 0)
     {
        global_sensor_queried[portInt]++;
        sendCommand("p");
     }
 }
 
 ext.reconnectToDevice = function()
 {
    tryAllDevices();
 }

 ext.allMotorsOn = function(driveStyle)
 {
    if (driveStyle == "forward")
        sendCommand("F");
    else if (driveStyle == "reverse")
        sendCommand("B");
    else if (driveStyle == "right")
        sendCommand("R");
    else if (driveStyle == "left")
        sendCommand("L");
 }
 
 ext.allMotorsOff = function()
 {
    sendCommand("S");
 }

 
  // Block and block menu descriptions
  var descriptor = {
  blocks: [
           ['w', 'drive %m.turnStyle %n seconds',         'steeringControl', 'forward', 3],
           [' ', 'start driving %m.turnStyle',              'allMotorsOn',      'forward'],
           [' ', 'turn %m.turnDirection %n degrees',              'turn', 'right',     90],
           [' ', 'stop driving',                       'allMotorsOff',     'break'],
          /* ['h', 'when IR remote %m.buttons pressed port', 'whenRemoteButtonPressed','Top Left'],
           ['w', 'play note %m.note duration %n ms',                    'playTone',         'C5', 500],
           ['w', 'play frequency %n duration %n ms',                    'playFreq',         '262', 500],
           ['R', 'light sensor',   'readColorSensorPort'],
           ['w', 'wait until light sensor %m.whichInputPort detects black line',   'waitUntilDarkLinePort',   '1'],
           ['R', 'measure distance',                  'readDistanceSensorPort'],
           ['R', 'remote button',                     'readRemoteButtonPort'],
        */
           // ['R', 'gyro  %m.gyroMode %m.whichInputPort',                 'readGyroPort',  'angle', '1'],

       //    ['R', 'battery level',   'readBatteryLevel'],
       //  [' ', 'reconnect', 'reconnectToDevice'],
           ],
  menus: {
  turnStyle:        ['forward', 'reverse', 'right', 'left'],
 turnDirection:        ['right', 'left'],
  gyroMode: ['angle', 'rate'],
  note:["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5","C6","D6","E6","F6","G6","A6","B6","C#4","D#4","F#4","G#4","A#4","C#5","D#5","F#5","G#5","A#5","C#6","D#6","F#6","G#6","A#6"],
  buttons: IRbuttonNames,
    },
  };

  var serial_info = {type: 'serial'};
  ScratchExtensions.register('Sparki Control', descriptor, ext, serial_info);
  console.log('registered: ');
})({});

