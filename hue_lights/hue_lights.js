
new (function(ext) {
  // Cleanup function when the extension is unloaded

  ext._getStatus = function()
  {
    // xxx do a ping
     return { status:2, msg:'Ready' };
  };

  
  ext._shutdown = function()
  {

 
  };
 
 function sendLightColorCommand(lightID, HSV, fade)
 {
     
     sendLightCommand(lightID, {"on":true, "sat":HSV["s"], "bri":HSV["v"],"hue":HSV["h"], "transitiontime": fade});
 }

 function sendLightOnOffCommand(lightID, onOff, fade)
 {
     sendLightCommand(lightID, {"on":onOff, "transitiontime": fade, "bri" : ((onOff) ? 254 : 0) });
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
 
 function sendLightCommand(lightID, command)
 {
     console.log("lightID: " + lightID + " " + JSON.stringify(command));
 $.ajax({
        type: "PUT",
        dataType: "json",
        data: JSON.stringify(command),
        url: "http://75.67.188.88:14567/api/5vS7oWcynKVNNhNruHKMGiuX8cNgxDBcNmtOf5bU/lights/" + lightID +"/state",
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
       {"name" : "Purple", "hex" : "#800080"},
       {"name" : "Red", "hex" : "#FF0000"},
       {"name" :  "Silver", "hex" : "#C0C0C0"},
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
     
ext.lightColor = function(light, color)
{
     sendLightColorCommand(light, rgb2hsv(colorValues[color]), 0);
}

 ext.lightColorFade = function(light, color, fade)
 {
     fad = parseFloat(fade) * 8;
     sendLightColorCommand(light, rgb2hsv(colorValues[color]), fad);
 }

 ext.lightOn = function(light)
 {
     sendLightOnOffCommand(light, true, 0);
 }

 ext.lightOff = function(light)
 {
     sendLightOnOffCommand(light, false, 0);
 }

ext.lightOnFade = function(light, fade)
 {
     fad = parseFloat(fade) * 8;
    sendLightOnOffCommand(light, true, fad);
 }

 ext.lightOffFade = function(light, fade)
 {
     fad = parseFloat(fade) * 8;
   sendLightOnOffCommand(light, false, fad);
 }
  // Block and block menu descriptions
  var descriptor2 = {
  blocks: [
           [' ', 'light %m.lights on',                                   'lightOn',     "1"],
           [' ', 'light %m.lights off',                                   'lightOff',     "1"],
           [' ', 'light %m.lights on fade: %n seconds',                                   'lightOnFade',     "1", "1.0"],
           [' ', 'light %m.lights off fade: %n seconds',                                   'lightOffFade',     "1", "1.0"],
           [' ', 'Light %m.lights color %m.colors',                                   'lightColor',     "1",  "Red"],
           [' ', 'Light %m.lights color %m.colors fade: %n seconds',                                   'lightColorFade',     "1",  "Red", "1.0"],
         ],
  menus: {
  lights:["1","2","3", "4"],
  colors:colors,
    },
  };

  ScratchExtensions.register('Light Control', descriptor2, ext);
  console.log('registered: ');
})({});

