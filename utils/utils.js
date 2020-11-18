const { Pool  } = require('pg');
const {PG} = require('./configreader');
const PG_CONFIG = PG;

const PG_CLIENT_POOL = new Pool ({
    user: PG_CONFIG.user,
    host: PG_CONFIG.host,
    database: PG_CONFIG.name,
    password: PG_CONFIG.passwd,
    port: PG_CONFIG.port,
    max: 20,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
})
function trigram(word){
    let _word = '__' + word + '__';
    let _array = [];
    for(let i = 0; i<_word.length-2;i++){
        _array.push(_word.substring(i,i+3))
    }
    return _array.join(' ')
}

module.exports = {PG_CLIENT_POOL,PG_CONFIG,trigram}