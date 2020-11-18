const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const {Worker} = require('worker_threads')

const manager = function(source,withhouses,withrooms){
    let _queue = [];
    let qurrentTask = null;
    let lastchunk = false;

    logger.debug(`read directory for files`);
    fs.readdirSync(path.resolve(source)).forEach(file => {
        let _filesplit = file.split('.');
        if(_filesplit.length === 2 && _filesplit[1].toLowerCase() == 'xml'){
            let [gb1,_table,_date,gb2] = _filesplit[0].split('_');
            if(_date.length === 8 && _table.length > 3){
                let _task = {
                    path:path.resolve(source,file),
                    filename: file,
                    table: _table,
                    ver: _date
                };
                if(!(
                    (!withhouses && _table == 'HOUSE') ||
                    (!withrooms && _table == 'ROOM')
                )) _queue.push(_task);
            }
        }
    });
    logger.debug(`end read dir, has ${_queue.map(item=>item.table).join(';')}`);
    qurrentTask = _queue.shift();
    logger.debug(`set task ${qurrentTask.table} and create two workers`);
    const xmlworker = new Worker(path.join(__dirname, 'readfile.js'));
    const pgworker = new Worker(path.join(__dirname, 'pg-writer.js'));
    logger.debug(`send task to worker`);
    xmlworker.postMessage({action:0,task:qurrentTask})
    xmlworker.on('message',(message)=>{
        if(message.lastchank) {
            logger.debug(`set flag`);
            lastchunk = true;
        }
        if(message.file){
            logger.debug(`send to pgworker`);
            pgworker.postMessage({file: message.file,table:message.table,count: message.count})
        }
        else { // ветка на случай если пауза произошла после последнего обжекта но не был прочитан конец файла
            logger.debug(`no file send to pgworker write`)
            lastchunk = false;
            if(_queue.length) {
                qurrentTask = _queue.shift()
                logger.debug(`set task ${qurrentTask.table}`);
                logger.debug(`send task to worker`);
                xmlworker.postMessage({action:0,task:qurrentTask})
            }
            else {
                qurrentTask = null;
                logger.debug(`has no tasks`)
                logger.debug(`Terminate worker xmlreader`)
                xmlworker.terminate()
            }
        }
    })
    pgworker.on('message',(result)=>{
        if(!result){
            logger.error(`Terminated unsuccessful workers`)
            xmlworker.terminate()
            pgworker.terminate()
        }
        if(!lastchunk){
            logger.debug(`send resume  action to xmlworker`);
            xmlworker.postMessage({action:1})
        }
        else if (lastchunk) {
            logger.debug(`check queue`);
            lastchunk = false;
            if(_queue.length) {
                qurrentTask = _queue.shift()
                logger.debug(`set task ${qurrentTask.table}`)
                logger.debug(`send task to xmlworker`);
                xmlworker.postMessage({action:0,task:qurrentTask})
            }
            else {
                qurrentTask = null;
                logger.debug(`has no tasks`)
                if(xmlworker) {
                    logger.debug(`Terminate worker xmlworker`);
                    xmlworker.terminate();
                }
                logger.debug(`Terminate worker pgworker`);
                pgworker.terminate();
            }
        }
    })
}

module.exports = manager