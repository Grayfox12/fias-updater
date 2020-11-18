/** @module
 * logger.config.json
 *      errorLog - файл под ошибки
 *      warnLog - файл под предупреждения
 *      infoLog - файл под информационные сообщения
 *      debugLog - файл под сообщения отладки
 *      log - общий файл для логов ( В случае наличия в конфигруации обоих полей log и debugLog, логи писаться будут в оба файла)
 *      level
 *          silent
 *          debug
 *          info
 *          warn
 *          error
 *          fatal
 */
const pino = require('pino');
const tools = require('pino/lib/tools');
const {LOGGER} = require('./configreader');
const fs = require('fs');
const process = require('process');

const metadata = Symbol.for('pino.metadata');
const {
    streamSym,
    setLevelSym,
    getLevelSym,
    levelValSym
} = pino.symbols;
const levels = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    silent: 0,
};

function prettyStream (args = {}) {
    const prettyPrint = args.opts || args.prettyPrint;
    const { prettifier, dest = process.stdout } = args;
    return tools.getPrettyStream(prettyPrint, prettifier, dest);
}

function fixLevel (pino) {
    pino.level = pino[streamSym].minLevel;
    var setLevel = pino[setLevelSym];
    pino[setLevelSym] = function (val) {
        var prev = this[levelValSym];
        if (typeof val === 'function') {
            val = this[levelValSym];
        }
        setLevel.call(this, val);
        if (prev !== this[levelValSym]) {
            this[streamSym] = this[streamSym].clone(this[levelValSym]);
        }
    };
    Object.defineProperty(pino, 'level', {
        get: pino[getLevelSym],
        set: pino[setLevelSym]
    });
    return pino
}

function multistream (streamsArray) {
    let counter = 0;
    streamsArray = streamsArray || [];
    const res = {
        write,
        add,
        streams: [],
        streamsTree:{},
        clone,
        [metadata]: true
    };
    if (Array.isArray(streamsArray)) {
        streamsArray.forEach(add, res)
    } else if (streamsArray) {
        add.call(res, streamsArray)
    }
    streamsArray = null;
    return res;

    function write (data) {
        const level = this.lastLevel;
        const { streamsTree } = this;
        let categories = Object.values(streamsTree);
        for (let i = 0; i < categories.length; i++){
            let dests = categories[i][level];
            if(dests.hasOwnProperty('write') && dests.write == null);
            else if(dests.forEach){
                dests.forEach(dest=>{
                    let stream = dest.stream;
                    if (stream[metadata]) {
                        const { lastTime, lastMsg, lastObj, lastLogger } = this;
                        stream.lastLevel = level;
                        stream.lastTime = lastTime;
                        stream.lastMsg = lastMsg;
                        stream.lastObj = lastObj;
                        stream.lastLogger = lastLogger;
                    }
                    if(stream.write)stream.write(data);
                })
            }
        }
    }

    function add (dest) {
        const { streamsTree } = this;
        if (typeof dest.write === 'function') {
            return add.call(this, { stream: dest })
        } else if (typeof dest.levelVal === 'number') {
            return add.call(this, Object.assign({}, dest, { level: dest.levelVal, levelVal: undefined }))
        } else if (typeof dest.level === 'string') {
            return add.call(this, Object.assign({}, dest, { level: levels[dest.level] }))
        } else if (typeof dest.level !== 'number') {
            // we default level to 'info'
            dest = Object.assign({}, dest, { level: 30 })
        } else {
            dest = Object.assign({}, dest)
        }
        dest.id = counter++;
        levelHierarchy(streamsTree,dest);
        return res
    }

    function clone (level) {
        let streams = new Array(this.streams.length);

        for (let i = 0; i < streams.length; i++) {
            streams[i] = {
                level: level,
                stream: this.streams[i].stream
            }
        }

        return {
            write,
            add,
            streams,
            streamsTree:{},
            clone,
            [metadata]: true
        }
    }
}

function levelHierarchy(_obj,stream) {
    let _type = "other";
    let _level = stream.level;
    if(stream.type) _type = stream.type;
    if(_obj[_type]) {
        let _levelStreams = [];
        if(_obj[_type][_level] && _obj[_type][_level].length && _obj[_type][_level][0].level === _level )_levelStreams = _obj[_type][_level];
        _levelStreams.unshift(stream);
        Object.values(levels).filter(key=>{return key >= _level}).forEach(key => {
            if((_obj[_type][key].length&&_obj[_type][key][0].level < _level)||!_obj[_type][key].length)_obj[_type][key] = _levelStreams;

        })
    }
    else{
        let _nullStream = {write:null};
        let _levelStreams = [stream];
        _obj[_type] = {};
        Object.values(levels).forEach(key => {
            if(key < _level) _obj[_type][key] = _nullStream;
            else _obj[_type][key] = _levelStreams;
        });
    }
}

function createWStream(path) {
    let _array = path.split("\/");
    if(_array.length>1){
        let _path = (_array.slice(0,_array.length-1)).join("\/");
        if(!fs.existsSync(_path)){
            fs.mkdirSync(_path, { recursive: true })
        }
        return fs.createWriteStream(path,{flags:'a'});
    }
    else if(_array.length === 1) return fs.createWriteStream(path,{flags:'a'});
    else throw "Can not create writeble stream";
}

function loggerFactory() {
    try{
        let config = LOGGER;
        let _format = "yyyy-mm-dd HH:MM";
        if (config.format) _format= config.format;
        let _streams = [];
        if(config.hasOwnProperty('debugLog') && config.debugLog !== "")
            _streams.push({level: 'debug', type: 'file',
                stream:  prettyStream(
                    {
                        prettyPrint:{
                            translateTime: _format,
                            colorize:false
                        },
                        dest:createWStream(config.debugLog)
                    })});
        if(config.hasOwnProperty('infoLog') && config.infoLog !== "")
            _streams.push({level: 'info', type: 'file',
                stream:  prettyStream(
                    {
                        prettyPrint:{
                            translateTime: _format,
                            colorize:false
                        },
                        dest:createWStream(config.infoLog)
                    })});
        if(config.hasOwnProperty('warnLog') && config.warnLog !== "")
            _streams.push({level: 'warn', type: 'file',
                stream:  prettyStream(
                    {
                        prettyPrint:{
                            translateTime: _format,
                            colorize:false
                        },
                        dest:createWStream(config.warnLog)
                    })});
        if(config.hasOwnProperty('errorLog') && config.errorLog !== "")
            _streams.push({level: 'error', type: 'file',
                stream:  prettyStream(
                    {
                        prettyPrint:{
                            translateTime: _format,
                            colorize:false
                        },
                        dest:createWStream(config.errorLog)
                    })});
        if(config.hasOwnProperty('log') && config.log !== ""){
            _streams.push({level:'debug',type:"file",
                stream:  prettyStream(
                    {
                        prettyPrint:{
                            translateTime: _format,
                            colorize:false
                        },
                        dest:createWStream(config.log)
                    })});
        }
        _streams.push({level: 'error',type:'console',stream:  prettyStream({prettyPrint:{translateTime: _format},dest:process.stderr})});
        _streams.push({level:'debug',type:'console',stream: prettyStream({prettyPrint:{translateTime: _format},dest:process.stdout})});

        let pinologger = pino({level:config.level?config.level:'debug'}, multistream(_streams));
        process
            .on('unhandledRejection', (reason, p) => {
                pinologger.fatal(reason,'Unhandled Rejection at Promise', p);
            })
            .on('uncaughtException', err => {
                pinologger.fatal(err,"Uncaught Exception thrown");
            });
        return pinologger;
    }catch (e) {
        console.error("[%s]-[%s]: %s",new Date().toISOString(),'error',"Can't load logger, start use default console");
        console.error("[%s]-[%s]: %s",new Date().toISOString(),'start-stacktrace',"=========================");
        console.error("[%s]-[%s]: %s \n",new Date().toISOString(),'log',e.message);
        console.error("[%s]-[%s]: %s \n",new Date().toISOString(),'log',e.stack);
        console.error("[%s]-[%s]: %s",new Date().toISOString(),'end-stacktrace',"=========================");
        //функция fatal в консоли нет, пусть за нее отвечает error
        console.fatal = console.error;
        process
            .on('unhandledRejection', (reason, p) => {
                console.fatal(reason,'Unhandled Rejection at Promise', p);
            })
            .on('uncaughtException', err => {
                console.fatal(err,"Uncaught Exception thrown");
            });
        return console;
    }
}

const logger = loggerFactory();
module.exports = logger