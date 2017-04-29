const config = require('yargs')
    .usage('Usage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('n', 'instance name. used as mqtt client id and as topic prefix')
    .describe('u', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('b', 'hue bridge address. if ommited bridge will be searched via http://meethue.com/api/nupnp')
    .describe('p', 'light status polling interval in seconds')
    .describe('d', 'publish distinct light states')
    .describe('h', 'show help')
    .alias({
        b: 'bridge',
        h: 'help',
        n: 'name',
        u: 'url',
        v: 'verbosity',
        p: 'polling-interval',
        d: 'publish-distinct'
    })
    .default({
        u: 'mqtt://127.0.0.1',
        n: 'hue',
        v: 'info',
        p: 10
    })
    .version()
    .help('help')
    .argv;

module.exports = config;
