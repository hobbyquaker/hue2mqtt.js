# hue2mqtt.js

[![mqtt-smarthome](https://img.shields.io/badge/mqtt-smarthome-blue.svg)](https://github.com/mqtt-smarthome/mqtt-smarthome)
[![NPM version](https://badge.fury.io/js/hue2mqtt.svg)](http://badge.fury.io/js/hue2mqtt)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/hue2mqtt.js.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/hue2mqtt.js)
[![Build Status](https://travis-ci.org/hobbyquaker/hue2mqtt.js.svg?branch=master)](https://travis-ci.org/hobbyquaker/hue2mqtt.js)
[![Coverage Status](https://coveralls.io/repos/github/hobbyquaker/hue2mqtt.js/badge.svg?branch=master)](https://coveralls.io/github/hobbyquaker/hue2mqtt.js?branch=master)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

> Gateway between a Philips Hue bridge and MQTT

Because [hue2mqtt](https://github.com/owagner/hue2mqtt) sadly isn't developed anymore and I don't like Java I decided to
reimplement this on Node.js. hue2mqtt.js should work as an 1:1 drop-in-replacement for hue2mqtt. Differences to the 
original hue2mqtt are:

* Option `--publish-distinct`. When activated hue2mqtt.js publishes every datapoint on it's own topic (like e.g 
`hue/status/lights/Livingroom/bri`) 
* `--publish-distinct` also publishes a rgb value that is useful to visualize a lamps color on e.g. a web ui.


## Getting started

### Install

Prerequisites: [Node.js](https://nodejs.org) >= 6.0

```sudo npm install -g hue2mqtt```


#### Docker

[dersimn](https://github.com/dersimn) created a 
[dockerized version of hue2mqtt.js](https://github.com/dersimn/docker-hue2mqtt.js).


### Usage 

```
Usage: hue2mqtt [options]

Options:
  -v, --verbosity         possible values: "error", "warn", "info", "debug"
                                                               [default: "info"]
  -n, --name              instance name. used as mqtt client id and as topic
                          prefix                                [default: "hue"]
  -m, --mqtt-url          mqtt broker url.          default: "mqtt://127.0.0.1"]
  -b, --bridge            hue bridge address. if ommited bridge will be searched
                          via http://meethue.com/api/nupnp
  -p, --polling-interval  light status polling interval in seconds [default: 10]
  -d, --publish-distinct  publish distinct light states
  -h, --help              Show help                                    [boolean]
  --disable-names         use light ID instead of name when publishing changes
                                                                       [boolean]
  --mqtt-retain           enable/disable retain flag for mqtt messages
                                                       [boolean] [default: true]
  --insecure              allow tls connections with invalid certificates
                                                                       [boolean]
  --version               Show version number                          [boolean]

```  

All config options can be set via environment variables also (uppercase, underscore).

I suggest to use [pm2](http://pm2.keymetrics.io/) to manage the hm2mqtt process (start on system boot, manage log files, 
...)

#### MQTT URL

You can add Username/Password for the connection to the MQTT broker to the MQTT URL param like e.g. 
`mqtt://user:pass@broker`. For a secure connection via TLS use `mqtts://` as URL scheme.


## Topics and Payloads

hue2mqtt.js follows the [mqtt-smarthome](https://github.com/mqtt-smarthome/mqtt-smarthome) topic structure with a 
top-level prefix and a function like _status_ and _set_. Lamp, group and scene names are read from the Hue bridge.

Status reports are sent to the topic

    hue/status/lights/<lampname>
    
The payload is a JSON encoded object with the following fields:

* val - either 0 if the lamp is off, or the current brightness (1..254)
* hue_state - A JSON object which has the complete lamp state as returned from the Hue API:
   * on: boolean, whether the lamp is on
   * bri: current brightness 1..254
   * hue: hue from 0..65535
   * sat: saturation from 0..254
   * xy: an array of floats containing the coordinates (0..1) in CIE colorspace
   * ct: Mired color temperature (153..500)
   * colormode: current color mode, textual (ct, hs, or xy)
   * reachable: boolean, whether the light is reachable

Setting state is possible in one of three ways:    

* Method 1: Publishing a simple integer value to `hue/set/lights/<lampname>`
    
will for value=0 turn off the lamp and for values > 0 turn the lamp on and set the
brightness to the given value.

* Method 2: Publishing a JSON encoded object to `hue/set/lights/<lampname>`

will set multiple parameters of the given lamp. The field names are the same as
the ones used in the hue_state state object. Additionally, a field
`transitiontime` can be specified which defines the transitiontime to the new
state in multiple of 100ms.

* Method 3: Publishing a simple value to `hue/set/lights/<lampname>/<datapoint>`
	
will distinctly set a single datapoint (equal to the field names in the composite
JSON state object) to the simple value.

The fields "bri", "hue", "sat" and "ct" have variants with a "_inc" suffix
which accept a relative value. For example, setting "bri_inc" to "5" will increase
the brightness by 5, setting "bri_inc" to "-5" will decrease the brightness by 5.
The values will clip properly within their allowed range.

The same is possible with groups: `hue/set/groups/<groupname>`

The special group name 0 is also recognized and refers to the default group which contains
all lights connected to a bridge.


## Authentication

Like all applications connecting to a Hue bridge, hue2mqtt needs to be authenticated using push link at least once. 
The bridge will then assign a whitelist username which is automatically used on subsequent connections.

When authentication is required, a one-shot not retained message is published to topic `hue/status/authrequired`.


## License

MIT © [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
