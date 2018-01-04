require('should');

const cp = require('child_process');
const request = require('request');
const path = require('path');
const streamSplitter = require('stream-splitter');
const Mqtt = require('mqtt');
mqtt = Mqtt.connect('mqtt://127.0.0.1');

const simCmd = path.join(__dirname, '/node_modules/.bin/hue-simulator');
const simArgs = ['--hostname=127.0.0.1'];
let sim;
let simPipeOut;
let simPipeErr;
const simSubscriptions = {};
const simBuffer = [];

const hueCmd = path.join(__dirname, '/index.js');
const hueArgs = ['-u mqtt://127.0.0.1:1883', '--bridge', '127.0.0.1', '-v', 'debug', '--publish-distinct'];
let hue;
let huePipeOut;
let huePipeErr;
const hueSubscriptions = {};
const hueBuffer = [];

let subIndex = 0;

function subscribe(type, rx, cb) {
    subIndex += 1;
    if (type === 'sim') {
        simSubscriptions[subIndex] = {rx, cb};
    } else if (type === 'hue') {
        hueSubscriptions[subIndex] = {rx, cb};
    }
    matchSubscriptions(type);
    return subIndex;
}

function unsubscribe(type, subIndex) {
    if (type === 'sim') {
        delete simSubscriptions[subIndex];
    } else if (type === 'hue') {
        delete hueSubscriptions[subIndex];
    }
}

function matchSubscriptions(type, data) {
    let subs;
    let buf;
    if (type === 'sim') {
        subs = simSubscriptions;
        buf = simBuffer;
    } else if (type === 'hue') {
        subs = hueSubscriptions;
        buf = hueBuffer;
    }
    if (data) {
        buf.push(data);
    }
    buf.forEach((line, index) => {
        Object.keys(subs).forEach(key => {
            const sub = subs[key];
            if (line.match(sub.rx)) {
                sub.cb(line);
                delete subs[key];
                buf.splice(index, 1);
            }
        });
    });
}

function startHue() {
    hue = cp.spawn(hueCmd, hueArgs);
    huePipeOut = hue.stdout.pipe(streamSplitter('\n'));
    huePipeErr = hue.stderr.pipe(streamSplitter('\n'));
    huePipeOut.on('token', data => {
        console.log('hue', data.toString())
        matchSubscriptions('hue', data.toString());
    });
    huePipeErr.on('token', data => {
        console.log('hue', data.toString())
        matchSubscriptions('hue', data.toString());
    });
}

function startSim() {
    sim = cp.spawn(simCmd, simArgs);
    simPipeOut = sim.stdout.pipe(streamSplitter('\n'));
    simPipeErr = sim.stderr.pipe(streamSplitter('\n'));
    simPipeOut.on('token', data => {
        console.log('sim', data.toString());
        matchSubscriptions('sim', data.toString());
    });
    simPipeErr.on('token', data => {
        console.log('sim', data.toString());
        matchSubscriptions('sim', data.toString());
    });
}

function end(code) {
    if (hue.kill) {
        hue.kill();
    }
    if (sim.kill) {
        sim.kill();
    }
    if (typeof code !== 'undefined') {
        process.exit(code);
    }
}

process.on('SIGINT', () => {
    end(1);
});

process.on('exit', () => {
    end();
});

describe('start daemons', () => {
    it('hue-simulator should start without error', function (done)  {
        this.timeout(20000);
        subscribe('sim', /hue simulator listening/, data => {
            done();
        });
        startSim();

    });
    it('hue2mqtt should start without error', function (done) {
        this.timeout(20000);
        subscribe('hue', /hue2mqtt [0-9.]+ starting/, data => {
            done();
        });
        startHue();
    });
});

describe('hue2mqtt - mqtt connection', () => {
    it('hue2mqtt should connect to the mqtt broker', function (done) {
        this.timeout(12000);
        subscribe('hue', /mqtt connected/, data => {
            done();
        });
    });
});

describe('hue2mqtt - hue-simulator connection', () => {
    it('hue2mqtt should output "please press the link button"', function (done) {
        this.timeout(12000);
        subscribe('hue', /please press the link button/, data => {
            done();
        });
    });

    it('hue2mqtt should obtain a username after the link button was pressed', function (done) {
        this.timeout(42000);
        request({
            url: 'http://127.0.0.1:80/linkbutton',
            method: 'GET'
        });
        subscribe('hue', /got username/, data => {
            done();
        });
    });
    it('hue2mqtt should should be connected to hue-simulator', function (done) {
        this.timeout(42000);
        subscribe('hue', /bridge connected/, data => {
            done();
        });
    });
});
describe('hue2mqtt - hue-simulator api', () => {
    it('hue2mqtt should receive 2 lights from hue-simulator', function (done) {
        this.timeout(10000);
        subscribe('hue', /got 2 lights/, data => {
            done();
        });
    });
    it('hue2mqtt should receive 2 groups from hue-simulator', function (done) {
        this.timeout(10000);
        subscribe('hue', /got 2 groups/, data => {
            done();
        });
    });
});

describe('mqtt - hue2mqtt - hue-simulator', () => {
    it('hue-simulator should receive a put after publishing on hue/set/lights/+', function (done) {
        subscribe('sim', /PUT \/api\/letmegeneratethatforyou\/lights\/1\/state/, data => {
            done();
        });
        mqtt.publish('hue/set/lights/Hue Lamp 1', JSON.stringify({on: false, bri: 254}));
    });
    it('hue-simulator should receive a put after publishing on hue/set/groups/+', function (done) {
        subscribe('sim', /PUT \/api\/letmegeneratethatforyou\/groups\/1\/action/, data => {
            done();
        });
        mqtt.publish('hue/set/groups/Group 1', JSON.stringify({on: true}));
    });
    it('hue2mqtt should react on mqtt message and publish changed state on mqtt', function (done) {
        mqtt.subscribe('hue/status/lights/Hue Lamp 2/on');
        mqtt.on('message', (topic, payload, options) => {
            if (options.retain === false && payload.toString() === '{"val":false}') {
                mqtt.removeAllListeners('message');
                mqtt.unsubscribe('hue/status/lights/Hue Lamp 2/on');
                done();
            }
        });
        mqtt.publish('hue/set/groups/Group 1', JSON.stringify({on: false}));
    });
    it('hue2mqtt should react on mqtt message and publish changed state on mqtt', function (done) {
        mqtt.subscribe('hue/status/lights/Hue Lamp 2/on');
        mqtt.on('message', (topic, payload, options) => {
            if (!options.retain && payload.toString() === '{"val":true}') {
                mqtt.removeAllListeners('message');
                mqtt.unsubscribe('hue/status/lights/Hue Lamp 2/on');
                done();
            }
        });
        mqtt.publish('hue/set/lights/Hue Lamp 2', '254');
    });
    it('hue2mqtt should react on mqtt message and publish changed state on mqtt', function (done) {
        mqtt.subscribe('hue/status/lights/Hue Lamp 2/bri');
        mqtt.on('message', (topic, payload, options) => {
            if (!options.retain && payload.toString() === '{"val":127}') {
                mqtt.removeAllListeners('message');
                mqtt.unsubscribe('hue/status/lights/Hue Lamp 2/bri');
                done();
            }
        });
        mqtt.publish('hue/set/lights/Hue Lamp 2', '127');
    });
    it('hue2mqtt should react on mqtt message and publish changed state on mqtt', function (done) {
        mqtt.subscribe('hue/status/lights/Hue Lamp 2');
        mqtt.on('message', (topic, payload, options) => {
            if (!options.retain && payload.toString() === '{"val":0,"hue_state":{"on":false,"bri":127,"hue":33536,"sat":144,"xy":[0.346,0.3568],"ct":201,"alert":"none","effect":"none","colormode":"hs","reachable":true}}') {
                mqtt.removeAllListeners('message');
                mqtt.unsubscribe('hue/status/lights/Hue Lamp 2');
                done();
            }
        });
        mqtt.publish('hue/set/lights/Hue Lamp 2', 'false');
    });
});

describe('hue2mqtt - hue-simulator - disconnect', () => {
    it('hue2mqtt should log "bridge-disconnected', function (done) {
        this.timeout(12000);
        subscribe('hue', /bridge disconnected/, data => {
            done();
        });
        sim.kill();
    });
});

/* TODO fixme
describe('hue2mqtt - hue-simulator - reconnect', () => {
    it('hue2mqtt should reconnect when the hue-simulator is running again', function (done) {
        this.timeout(60000);
        subscribe('hue', /bridge connected/, data => {
            done();
        });
        setTimeout(startSim, 3000);
    });
});
*/
