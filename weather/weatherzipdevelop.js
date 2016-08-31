function timeStamp() {
    return (new Date).toISOString().replace(/z|t/gi, ' ').trim();
}

function console_log(str) {
    console.log(timeStamp() + ": " + str);
}

var cityid = "4929004";
var citystring = "Amesbury, MA";
var locationRequestType = "id";

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
    "Suva, Fiji" : "2198148"
  //  "Lobujya, Nepal" : "1283119"
};

var cities = [];
for (var k in cityids) cities.push(k);


new(function(ext) {
    // Cleanup function when the extension is unloaded

    ext._getStatus = function() {
        // xxx do a ping
        return {
            status: 2,
            msg: 'Ready'
        };
    };


    ext._shutdown = function() {


    };

    var cachedWeather = 0;
    var currentWeather = 0;
    var cacheInterval = 0;

    function kelvinToCelsius(value) {
        return value - 273.15;
    };


    function kelvinToFahrenheit(value) {
        return (kelvinToCelsius(value) * 1.8) + 32;
    }

    function sendRequest(command, callback) {
        if (cachedWeather) {
            if (callback)
                callback();
        } else {

            $.ajax({
                type: "GET",
                dataType: "jsonp",
                url: "http://api.openweathermap.org/" + "data/2.5/weather?" + locationRequestType + "=" + cityid + "&APPID=bd9989ac922908fed9b1ec1521595d99",
                success: function(data) {
                    cachedWeather = data;
                    currentWeather = JSON.parse(JSON.stringify(data));
                    console_log("Got weather:" + JSON.stringify(data)); {
                        if (callback)
                            callback();
                    }
                },
                error: function(jqxhr, textStatus, error) {
                    console_log("error: " + error + " " + textStatus);
                    if (callback)
                        callback();
                }
            });
            if (cacheInterval) {
                clearTimeout(cacheInterval);
            }
            cacheInterval = window.setTimeout(function() {
                cacheInterval = 0;
                cachedWeather = 0;
                console_log("clearing cache");
            }, (60000 * 5)); // 5 minutes
        }

    }

    function changeLocation(dir, callback) {
        var x = 0;
        for (x in cities) {
            if (cities[x] == citystring) {
                break;
            }
        }
        x = parseInt(x);
        x = x + dir;
        var n = cities.length;
        if (x < 0) {
            x = n - 1;
        }
        x %= n;

        var newcit = cities[x];

        setTheLocation(newcit, callback);
    }


    function setTheLocation(location, callback) {
        citystring = location;
        var loc = cityids[location];
        console_log("Set location for " + location + " to " + loc);
        cityid = loc;
        cachedWeather = 0; // clear cache
        locationRequestType = "id";

        sendRequest("", callback);
    }

    function setLocationZipcode(zip, callback) {
        console_log("Set zipcode to " + zip);
        cityid = zip;
        cachedWeather = 0; // clear cache
        locationRequestType = "zip";

        sendRequest("", callback);
    }

    ext.updateWeather = function(callback) {
        sendRequest("", callback);
    }

    ext.getTemp = function() {
        if (!currentWeather) {
            return "";
        }
        var degreesF = kelvinToFahrenheit(currentWeather.main.temp);
        degreesF = Math.round(10 * degreesF) / 10;
        return degreesF;
    };

    ext.getTempC = function() {
        if (!currentWeather) {
            return "";
        }
        var degreesC = kelvinToCelsius(currentWeather.main.temp);
        degreesC = Math.round(10 * degreesC) / 10;
        return degreesC;
    };

    ext.getWeather = function() {
        if (!currentWeather) {
            return "";
        }
        return currentWeather.weather[0].main;
    };

    ext.getWeatherDetails = function() {
        if (!currentWeather) {
            return "";
        }
        return currentWeather.weather[0].description;
    };

    ext.getWindDirection = function() {
        if (!currentWeather) {
            return "";
        }
        return currentWeather.wind.deg;
    };

    ext.setLocation = function(location, callback) {
        setTheLocation(location, callback);
    }

    ext.setZipcodeLocation = function(zip, callback) {
        setLocationZipcode(zip, callback);
    }

    ext.currentLocation = function() {
        return currentWeather.name;
    }


    ext.nextLocation = function(callback) {
        changeLocation(1, callback);
    }

    ext.prevLocation = function(callback) {
        changeLocation(-1, callback);
    }

    // Block and block menu descriptions
    var descriptor2 = {
        blocks: [
            ['w', 'update weather', 'updateWeather'],
            ['r', 'current temperature in Fahrenheit', 'getTemp'],
            ['r', 'current temperature in Celsius', 'getTempC'],
            ['r', 'current weather type', 'getWeather'],
            ['r', 'current weather details', 'getWeatherDetails'],
            ['r', 'current wind direction', 'getWindDirection'],
            ['-'],
            ['w', 'set location to %m.locations', 'setLocation', "Amesbury, MA"],
            ['w', 'set zipcode to %s', 'setZipcodeLocation', "01860"],
            ['r', 'current location', 'currentLocation'],
            ['w', 'next location', 'nextLocation'],
            ['w', 'previous location', 'prevLocation'],

        ],
        menus: {
            "locations": cities

        },
    };
    sendRequest("", function() {
        ScratchExtensions.register('Weather', descriptor2, ext);
        console.log('registered: ');
    });
})({});
