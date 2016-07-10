
function timeStamp()
{
    return (new Date).toISOString().replace(/z|t/gi,' ').trim();
}

function console_log(str)
{
    console.log(timeStamp() + ": "  + str);
}

var cityid = "4929004";
var citystring = "Amesbury, MA";

var cityids =
{
    "Amesbury, MA" : "4929004",
    "New York, NY" : "5128581",
    "London, UK" : "2643743",
    "Paris, France" : "2988507",
    "Honolulu, Hawaii" : "5856195",
    "Antarctica" : "6255152",
    "Orlando, Florida" : "4167147",
    "Beijing, China" : "1816670",
    "Doha, Qatar" : "290030",
    "Buenos Aires, Argentina" : "3435910",
    "Fiji" : "2198148",
    "Mount Everest" : "4517586"
};

var cities = [];
for(var k in cityids) cities.push(k);


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
     
     var cachedWeather = 0;
     var cacheInterval = 0;
     
     function kelvinToCelsius(value)
     {
        return value - 273.15;
     };

     
    function kelvinToFahrenheit(value)
     {
        return (kelvinToCelsius(value) * 1.8) + 32;
     }
     
     function tempF(data, callback)
     {
         var degreesF = kelvinToFahrenheit(data.main.temp);
         degreesF = Math.round(10*degreesF)/10;
         callback(degreesF);
     }
     
     function weatherF(data, callback)
     {
         callback(data.weather[0].main);
     }
     
     function weatherFDetails(data, callback)
     {
     callback(data.weather[0].description);
     }
     function sendRequest(command, filterF, callback)
     {
        if (cachedWeather)
        {
            filterF(cachedWeather, callback);
        }
        else
        {
     
            $.ajax({
                type: "GET",
                dataType: "jsonp",
                url: "http://api.openweathermap.org/" + "data/2.5/weather?id=" + cityid + "&APPID=bd9989ac922908fed9b1ec1521595d99",
                success: function(data) {
                   cachedWeather = data;
                   console_log("Got weather:"  + JSON.stringify(data));
                    if (data)
                    {
                        filterF(data, callback);
                    }
                    else
                    {
                        callback("");
                    }
                },
                error: function(jqxhr, textStatus, error) {
                   console_log("error: " + error + " " + textStatus);
                    callback("");
                }
                });
            cacheInterval = window.setTimeout(function() {
                                              cachedWeather = 0;
                                              console_log("clearing cache");
                                       }, (60000 * 5)); // 5 minutes
        }

     }
     
     function changeLocation(dir)
     {
        var x = 0;
        for(x in cities)
        {
            if (cities[x] == citystring)
            {
                break;
            }
        }
        x = parseInt(x);
        x = x + dir;
        var n = cities.length;
        if (x < 0)
        {
            x = n - 1;
        }
        x %= n;
     
        var newcit = cities[x];
     
        setTheLocation(newcit);
     }
     
     function setTheLocation(location)
     {
         citystring = location;
         var loc = cityids[location];
         console_log("Set location for " + location + " to " + loc);
         cityid = loc;
         cachedWeather = 0;  // clear cache
     }
     
     
      ext.getTemp= function(callback)
     {
         sendRequest("", tempF,callback);
     };

     ext.getWeather= function(callback)
     { 
        sendRequest("", weatherF,callback);
     };
     ext.getWeatherDetails= function(callback)
     {
     sendRequest("", weatherFDetails,callback);
     };
     
     ext.setLocation = function(location)
     {
        setTheLocation(location);
     }
     
     ext.currentLocation = function()
     {
        return citystring;
     }
     
     
     ext.nextLocation = function()
     {
        changeLocation(1);
     }

     ext.prevLocation = function()
     {
        changeLocation(-1);
     }

  // Block and block menu descriptions
  var descriptor2 = {
  blocks: [
           ['R', 'current temperature',                    'getTemp' ],
           ['R', 'current weather type',                    'getWeather' ],
           ['R', 'current weather details',                    'getWeatherDetails' ],
           [' ' , 'set location to %m.locations', 'setLocation', "Amesbury, MA"],
           ['r', 'current location', 'currentLocation'],
           [' ' , 'next location', 'nextLocation'],
           [' ' , 'previous location', 'prevLocation'],
           
          ],
  menus: {
     "locations" : cities

    },
  };
  
  ScratchExtensions.register('Weather', descriptor2, ext);
  console.log('registered: ');
})({});

