const pkg = require('./package.json');

module.exports = require('yargs')
    .env('HUE2MQTT')
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('verbosity', 'possible values: "error", "warn", "info", "debug"')
    .describe('name', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('mqtt-url', 'mqtt broker url.')
    .describe('bridge', 'hue bridge address. if ommited bridge will be searched via http://meethue.com/api/nupnp')
    .describe('polling-interval', 'light status polling interval in seconds')
    .describe('publish-distinct', 'publish distinct light states')
    .describe('help', 'show help')
    .describe('disable-names', 'use light ID instead of name when publishing changes')
    .describe('mqtt-retain', 'enable/disable retain flag for mqtt messages')
    .describe('insecure', 'allow tls connections with invalid certificates')
    .boolean('insecure')
    .alias({
        h: 'help',
        m: 'mqtt-url',
        n: 'name',
        v: 'verbosity',
        b: 'bridge',
        i: 'polling-interval',
        d: 'publish-distinct'
    })
    .boolean('disable-names')
    .boolean('mqtt-retain')
    .default({
        'mqtt-url': 'mqtt://127.0.0.1',
        name: 'hue',
        verbosity: 'info',
        'polling-interval': 10,
        'mqtt-retain': true
    })
    .version()
    .help('help')
    .argv;
