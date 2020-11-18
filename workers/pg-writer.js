const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');
const copyFrom = require('pg-copy-streams').from;
const {PG_CLIENT_POOL} = require('../utils/utils');
const {TABLES} = require('../templates/QUERIES')
const {parentPort} =  require('worker_threads');

/**/
parentPort.on('message', (message) => {
    PG_CLIENT_POOL.connect((err, client, done)=>{
        let _stream = client.query(copyFrom(TABLES[message.table].BULK_CREATE))
        let _file = path.resolve(os.tmpdir(), message.file);
        let _fileStream = fs.createReadStream(_file)
        let doneFn = (resultflag)=>{
            _fileStream.destroy();
            fs.unlinkSync(_file);
            client.release()
            parentPort.postMessage(resultflag)
        }
        _fileStream.on('error', ()=>{
            logger.debug(`filestream error`);
            doneFn(false)
        })
        _stream.on('error', (error)=>{
            logger.debug(`${error}`);
            doneFn(false)
        })
        _stream.on('finish', ()=>{
            logger.info(`finish bulk create from file ${message.file} ${message.count} rows`);
            doneFn(true)
        })
        _fileStream.pipe(_stream)
    })
});