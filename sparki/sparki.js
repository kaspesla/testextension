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
      if (!SparkiConnected && !DEBUG_NO_Sparki)
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
 
    playStartUpTones();
 
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
    sendCommand("q");
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
  var DONE_RESULT = "DONE_RESULT";
  var DISTANCE_RESULT = "DISTANCE_RESULT";
 
 
  var waitingCallbacks = [[],[],[],[],[],[],[],[], []];
  var waitingQueries = [];
  var global_sensor_result =  [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var global_sensor_queried = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  var synchronous_command_queue = [];
 
  var recv_buffer = "";
 
  function receive_handler(data)
  {
    var inputData = ab2str(data);
   // console.log(timeStamp() + " received: " + inputData);
    recv_buffer += inputData;
    var arr = recv_buffer.split(/[\n\r]+/);
    if (arr.length > 1) {
        received_line(arr[0]);
        recv_buffer = "";
    }
 }
 
 function received_line(inputData)
 {
   console.log(timeStamp() + " received_line: " + inputData);
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
    if (mode == DONE_RESULT)
    {
        theResult = "";
    }
    if (mode == DISTANCE_RESULT)
    {
        var arr = inputData.split(",");

        theResult = arr[1];
    }

    sendCommand("a");

     if (this_is_from_port == 0)
     {
        callback = waitingCallbacks[0].shift();
        callback();
 
        var nextCommand = synchronous_command_queue.shift();
        if (nextCommand)
        {
            waitingQueries.push([0, nextCommand[2], 0]);
            waitingCallbacks[0].push(nextCommand[1]);
            sendCommand(nextCommand[0]);
        }
     }
     else
     {
        global_sensor_result[this_is_from_port] = theResult;
        global_sensor_queried[this_is_from_port]--;
        while(callback = waitingCallbacks[this_is_from_port].shift())
        {
            console.log("result: " + theResult);
            if (theResult != "")
                callback(theResult);
            else
                callback();
        }
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
    if (DEBUG_NO_Sparki)
    {
        console.log(timeStamp() + " sending: " + command);
        return;
    }
    if ((SparkiConnected || connecting) && theSparkiDevice)
    {
        console.log(timeStamp() + " sending: " + command);
        theSparkiDevice.send(str2ab(command + ";\n"));
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
      sendCommand("Q " + freq + ";" + duration);
     
     window.setTimeout(function() {
                       driveTimer = 0;
                       callback();
                       }, duration);
 }
 
 
 ext.playFreq = function(freq, duration, callback)
 {
     console.log("playFreq duration: " + duration + " freq: " + freq);
     sendCommand("Q " + freq + ";" + duration);
     
     window.setTimeout(function() {
                       driveTimer = 0;
                       callback();
                       }, duration);
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
 
 var driveTimer = 0;
 driveCallback = 0;
 

  ext.steeringControl = function(driveStyle, cms, callback)
  {
    //cms *= 2.5;
    clearDriveTimer();
    if (driveStyle == "forward" || driveStyle == "reverse")
    {
        cms = parseFloat(cms);
        if (cms  <= 0)
        {
            callback();
            return;
        }
    }
    var command = "";

     if (driveStyle == "forward")
        command = "f " + cms;
     else if (driveStyle == "reverse")
        command = "b " + cms;

    sendSynchronousCommand(command, callback);
}
 
 ext.turnControl = function(driveStyle, degrees, callback)
  {
    clearDriveTimer();
    var command = "";
 
    degrees *= 0.94; // tweak accuracy
    degrees = parseInt(degrees);
    if (driveStyle == "right")
        command  = "r " + degrees;
    else if (driveStyle == "left")
        command = "l " + degrees;
 
    sendSynchronousCommand(command, callback);
}

ext.readDistanceSensorPort = function(callback)
 {
     var portInt = 8;
     waitingCallbacks[portInt].push(callback);
     if (global_sensor_queried[portInt] == 0)
     {
        global_sensor_queried[portInt]++;
        waitingQueries.push([portInt, DISTANCE_RESULT, 0]);
        sendCommand("3");
     }
  }
 
  ext.openGrippers = function(callback)
  {
    grippers("o", callback);
  }
 
 ext.closeGrippers = function(callback)
{
    grippers("c", callback);
 }
 
 
 function grippers(command, callback)
 {
    clearDriveTimer();
    sendSynchronousCommand(command, callback);
 }
 
 function sendSynchronousCommand(command, callback)
 {
    if (synchronous_command_queue.length == 0)
    {
        waitingQueries.push([0, DONE_RESULT, 0]);
        waitingCallbacks[0].push(callback);
        sendCommand(command);
    }
    else
     {
        synchronous_command_queue.push([command, callback, DONE_RESULT]);
     }
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
 
 function convertToRange(value, srcRange, dstRange)
 {
     // value is outside source range return
     if (value < srcRange[0] || value > srcRange[1])
     {
        return NaN;
     }
     
     var srcMax = srcRange[1] - srcRange[0],
     dstMax = dstRange[1] - dstRange[0],
     adjValue = value - srcRange[0];

     return (adjValue * (dstMax / srcMax)) + dstRange[0];
 };

 
 ext.ledColor = function(color)
 {
   var buf = new ArrayBuffer(4);
   var bufView = new Uint8Array(buf);
   var longView = new Uint32Array(buf);
 
    longView[0] = color;
 
    // these rgb range mappings are needed to create a similar color correctly on sparki's LED. turns down the R value
 
    sendCommand("Z " + parseInt(convertToRange(parseInt(bufView[2]), [0,255], [0,25])) + ";"
                    + parseInt(convertToRange(parseInt(bufView[1]), [0,255], [0,50])) + ";"
                    +  parseInt(convertToRange(parseInt(bufView[0]), [0,255], [0,50])));
 }

 
  // Block and block menu descriptions
  var descriptor = {
  blocks: [
           ['w', 'drive %m.driveDir %n cm',         'steeringControl', 'forward', 3],
           ['w', 'turn %m.turnDirection %n degrees',              'turnControl', 'right',     90],
           [' ', 'start driving %m.driveType',              'allMotorsOn',      'forward'],
           [' ', 'stop driving',                       'allMotorsOff',     'break'],

           [' ', "set LED color %c", 'ledColor', 0xff00ff],

           ['w', 'open grippers',              'openGrippers'],
           ['w', 'close grippers',              'closeGrippers'],

           ['R', 'measure distance',                  'readDistanceSensorPort'],

           ['w', 'play note %m.note duration %n ms',                    'playTone',         'C5', 500],
           ['w', 'play frequency %n duration %n ms',                    'playFreq',         '262', 500],
           
/* ['h', 'when IR remote %m.buttons pressed port', 'whenRemoteButtonPressed','Top Left'],
    ['R', 'light sensor',   'readColorSensorPort'],
           ['w', 'wait until light sensor %m.whichInputPort detects black line',   'waitUntilDarkLinePort',   '1'],
           ['R', 'remote button',                     'readRemoteButtonPort'],
        */
           // ['R', 'gyro  %m.gyroMode %m.whichInputPort',                 'readGyroPort',  'angle', '1'],

       //    ['R', 'battery level',   'readBatteryLevel'],
       //  [' ', 'reconnect', 'reconnectToDevice'],
           ],
  menus: {
  driveType:        ['forward', 'reverse', 'right', 'left'],
 driveDir:        ['forward', 'reverse'],
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

