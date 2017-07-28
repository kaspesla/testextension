
new (function(ext) {
  // Cleanup function when the extension is unloaded
var errMessage = "";
     
  ext._getStatus = function()
  {
    // xxx do a ping
     if (gotLights)
     {
        return { status:2, msg:'Ready' };
     }
     else
     {
       return { status:1, msg:errMessage };
     }
  };

  
  ext._shutdown = function()
  {

 
  };
 
function findLightID(lightName)
{
     var group = false;
     for (var key in groups)
     {
     if (groups[key]["name"] == lightName)
     {
     group = true;
     return [group, key];
     }
     }
     for (var key in lights)
     {
     if (lights[key]["name"] == lightName)
     {
     return [group, key];
     }
     }
}
 function sendLightColorCommand(lightName, HSV, fade)
 {
     var result = findLightID(lightName);
     var group = result[0];
     var lightID = result[1];
     
         sendLightCommand(lightID, {"on":true, "sat":HSV["s"], "bri":HSV["v"],"hue":HSV["h"], "transitiontime": fade}, group);
 }

 function sendLightOnOffCommand(lightName, onOff, fade)
 {
     var result = findLightID(lightName);
     var group = result[0];
     var lightID = result[1];
     
     sendLightCommand(lightID, {"on":onOff, "transitiontime": fade, "bri" : ((onOff) ? 254 : 0) }, group);
 }
 
function rgb2hsv (rgb) {
    var rr, gg, bb,
        r = rgb[0] / 255,
        g = rgb[1] / 255,
        b = rgb[2] / 255,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c){
            return (v - c) / 6 / diff + 1 / 2;
        };

    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);

        if (r === v) {
            h = bb - gg;
        }else if (g === v) {
            h = (1 / 3) + rr - bb;
        }else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: Math.round(h * 65535),
        s: Math.round(s * 255),
        v: Math.round(v * 255)
    };
}
 
 function sendLightCommand(lightID, command, group)
 {
     var url = lightserver + ((group) ? "groups" : "lights") + "/" + lightID +"/" + ((group) ? "action" : "state");
     console.log("url: " + url + " command: " + JSON.stringify(command));
 $.ajax({
        type: "PUT",
        dataType: "json",
        data: JSON.stringify(command),
        url: url,
        success: function(data) {
        },
        error: function(jqxhr, textStatus, error) {
        }
        });
 }
     
//colorValues = { "red" : [255,0,0], "green" : [0,255,0], "blue" : [0,0,255] };
  
 function hexToRgb(hex) {
var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
return result ?
    [ parseInt(result[1], 16),
     parseInt(result[2], 16),
     parseInt(result[3], 16)]
 : null;
}

     var crayola =
      [
       {"name" : "Aqua", "hex" : "#00FFFF"},
       {"name" : "Black", "hex" : "#000000"},
       {"name" :  "Blue", "hex" : "#0000FF"},
       {"name" : "Fuchsia", "hex" : "#FF00FF"},
       {"name" : "Gray", "hex" : "#808080"},
       {"name" :  "Green", "hex" : "#008000"},
       {"name" :  "Lime", "hex" : "#00FF00"},
       {"name" : "Maroon", "hex" : "#800000"},
       {"name" :  "Navy", "hex" : "#000080"},
       {"name" :  "Olive", "hex" : "#808000"},
       {"name" :  "Orange", "hex" : "#FFA500"},
       {"name" : "Purple", "hex" : "#800080"},
       {"name" : "Red", "hex" : "#FF0000"},
       {"name" : "Teal", "hex" : "#008080"},
       {"name" : "White", "hex" : "#FFFFFF"},
       {"name" : "Yellow", "hex" : "#FFFF00"}
      ];
     
     var colorValues = {};
 var colors = [];
 for(var i in crayola)
     {
     k = crayola[i]
      colors.push(k["name"]);
     colorValues[k["name"]] = hexToRgb(k["hex"]);
     
     }
     console.log(colors);
     console.log(colorValues);
     
var noWait = 0.25;
     
function waitAndCall(callback, time)
{
     window.setTimeout(function() {
                       callback();
                       }, time * 1000);
}
ext.lightColor = function(light, color, callback)
{
     sendLightColorCommand(light, rgb2hsv(colorValues[color]), 0);
     waitAndCall(callback, noWait);
}

ext.lightColorRGB = function(light,r,g,b, callback)
{
     sendLightColorCommand(light, rgb2hsv([r,g,b]), 0);
     waitAndCall(callback, noWait);
}

ext.lightColorRGBFade = function(light,r,g,b, fade, callback)
{
     fad = parseFloat(fade) * 8;
     sendLightColorCommand(light, rgb2hsv([r,g,b]), fad);
     waitAndCall(callback, fade);
}

     
 ext.lightColorFade = function(light, color, fade, callback)
 {
     fad = parseFloat(fade) * 8;
     sendLightColorCommand(light, rgb2hsv(colorValues[color]), fad);
     waitAndCall(callback, fade);
 }

 ext.lightOn = function(light, callback)
 {
     sendLightOnOffCommand(light, true, 0);
     waitAndCall(callback, noWait);
 }

 ext.lightOff = function(light, callback)
 {
     sendLightOnOffCommand(light, false, 0);
     waitAndCall(callback, noWait);
}

ext.lightOnFade = function(light, fade, callback)
 {
     fad = parseFloat(fade) * 8;
    sendLightOnOffCommand(light, true, fad);
     waitAndCall(callback, fade);
}


var configCallback;
ext.setServer = function(server, port, callback)
{
     configCallback = callback;
     getHueUser(server, port)
}
     
 ext.lightOffFade = function(light, fade, callback)
 {
     fad = parseFloat(fade) * 8;
   sendLightOnOffCommand(light, false, fad);
     waitAndCall(callback, fade);
}
     
function getHueUser(server, port)
{
     tryToMakeUser(server, port);
     
     //bypass pairing for testing
     //setUpCookie(server, port, "76EVqjrSCgtHIZNpZACeY-4sLIHj7pwjdvEnWdX5");
}
     
function setUpCookie(server, port, username)
 {
     alert("You're good to go. You won't have to reconnect next time.");
     
     var url = "http://" + server + ":" + port + "/api/" + username + "/";
     
     createCookie("lightserver", url);
     console.log("username: " + url);
     configCallback();
     
     document.location.reload();
 }

function tryToMakeUser(server, port)
{
     
     var url = "http://" + server + ":" + port + "/api";
     var command = { "devicetype" : "scratchx#extension" };
     $.ajax({
            type: "POST",
            dataType: "json",
            data: JSON.stringify(command),
            url: url,
             timeout: 3000, // sets timeout to 3 seconds
            success: function(data)
            {
            console.log(JSON.stringify(data));

            try
            {
            var success = data[0]["success"];
            if (success)
            {
                var username = success["username"];
            
                setUpCookie(server, port, username);
            }
            else
            {
              var error = data[0]["error"];
             if (error)
            {
            var description = error["description"];
               if (description == "link button not pressed")
               {
                    if (confirm("Please walk over and press the pairing button on top of the Hue base and then come back and press OK."))
                    {
                    window.setTimeout(function() {
                             tryToMakeUser(server, port);
                              }, 200);
            
                    return;
                    }
                    else
                    {
                         configCallback();
                    }
                }
                else
                {
                    alert("Sorry, an unexpected error occured: " + description);
                    configCallback();
                }
            }
            else
            {
                alert("Sorry, an unexpected thing occured: " + JSON.stringify(data));
                configCallback();
            }
            }
            }
            catch (err)
            {
                 alert("Sorry, a very unexpected thing occured:" + err);
                configCallback();
            }
            }
            ,
            error: function(jqxhr, textStatus, error) {
            console.log("Error from api config: " + textStatus + " " + error );
            alert("Sorry, it could not connect to your Hue base. Do you have the IP and port correct?");

            configCallback();
            }});
     
     
 }


function eraseCookie(name) {
     console.log("remove cookie: " + name);
	createCookie(name,"",-1);
}
     
ext.unpair = function()
{
     if (confirm("Are you sure you want to unpair?"))
     {
         eraseCookie("lightserver");
         document.location.reload();
     }
}
    
function registerExtension()
{
     
  // Block and block menu descriptions
     var name1 = menuNames[0];
  var descriptor_configed = {
  blocks: [
           ['w', '%m.lights on',                                   'lightOn',     name1],
           ['w', '%m.lights off',                                   'lightOff',     name1],
           ['w', '%m.lights on fade: %n seconds',                                   'lightOnFade',     name1, "1.0"],
           ['w', '%m.lights off fade: %n seconds',                                   'lightOffFade',     name1, "1.0"],
           ['w', '%m.lights color %m.colors',                                   'lightColor',     name1,  "Red"],
           ['w', '%m.lights color %m.colors fade: %n seconds',                                   'lightColorFade',     name1,  "Red", "1.0"],
           ['w', '%m.lights r: %n g: %n b: %n',                                   'lightColorRGB',     name1,  "255", "0", "255"],
           ['w', '%m.lights r: %n g: %n b: %n fade: %n seconds',                                   'lightColorRGBFade',     name1,  "255", "0", "255", "1.0"],
           ["-"],
           ["-"],
           [' ', 'unpair base station','unpair']
           
         ],
  menus: {
  lights:menuNames,
  colors:colors,
    },
  };
     var descriptor_unconfiged = {
     blocks: [ ['w', 'Setup Philips Hue IP %n port %n',                                   'setServer',     "75.67.188.88", "14567"]
              ],
     menus: { },
     };
     
     if (lightserver)
        ScratchExtensions.register('Light Control', descriptor_configed, ext);
     else
        ScratchExtensions.register('Light Control', descriptor_unconfiged, ext);
     
     console.log('registered: ' + lightserver);
}
 function pingGroups()
 {
     var url = lightserver + "groups";
     $.ajax({
            type: "GET",
            dataType: "json",
            url: url,
            success: function(data)
            {
                console.log(data);
            try{
                for (var key in data)
                {
                    if (data[key]["lights"].length > 0)
                    {
                        groups[key] = data[key];
                        menuNames.push(data[key]["name"]);
                    }
                }
            } catch (err)
            {
            console.log(err);

            }
            console.log(menuNames);
            if (menuNames.length> 0)
            {
                gotLights = true;
            }
            else
            {
                errMessage = 'No lights found.';
            }
            registerExtension();
            },
            error: function(jqxhr, textStatus, error) {
            errMessage = 'Error connecting.';

            registerExtension();
            }
        });
 }


 function pingLights()
 {
     var url = lightserver + "lights";
     $.ajax({
            type: "GET",
            dataType: "json",
            url: url,
            success: function(data)
            {
                console.log(data);
            try{
                for (var key in data) {
                if (data[key]["uniqueid"])
            {
                lights[key] = data[key];

                menuNames.push(data[key]["name"]);
            
            }
            }
            } catch (err)
            {
            console.log(err);
            }
                pingGroups();
            },
            error: function(jqxhr, textStatus, error) {
            errMessage = 'Error connecting.';
            registerExtension();
            }
    });
 }
 
function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}
     
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
 
 var url_string = document.location;

var lightserver = readCookie("lightserver");

var lights = {};
 var groups = {};
var menuNames = [];
 var gotLights = false;
 if (lightserver)
 {
     pingLights();
 }
 else
     {
     errMessage = "No server.";
     registerExtension();
     }
})({});

