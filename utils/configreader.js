const fs = require('fs');
const path = require('path');
let config = JSON.parse(fs.readFileSync(path.resolve('./config.json'), "utf-8"));

module.exports = {
    PG: config.pg,
    LOGGER: config.logger,
    SPHINX: config.sphinx,
    INDEXES_NAMES: config.indexes
}