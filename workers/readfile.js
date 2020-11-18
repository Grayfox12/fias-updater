const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');
const XmlStream = require('xml-stream');
const {TABLES} = require('../templates/QUERIES')
const { parentPort } =  require("worker_threads");

let count,part,transferFile,writeStream,readStream,xmlReader,currentTask ,lastchunk;
logger.info(`readfile worker ${parentPort}`);
parentPort.on('message', (message) => {
    switch (message.action) {
        case 0:
            count = 0;
            part = 0;
            currentTask = message.task;
            transferFile = `transfer_${currentTask.table.toLowerCase()}_${part}.csv`;
            readStream = fs.createReadStream(currentTask.path);
            writeStream = fs.createWriteStream(path.resolve(os.tmpdir(),transferFile));
            writeStream.on('finish', () => {
                logger.debug(`Finish write data to stream`);
                writeStream.destroy();
                if(!lastchunk) parentPort.postMessage({file: transferFile, table: currentTask.table, count: count});
                else {
                    lastchunk = false;
                    parentPort.postMessage({file: transferFile, table: currentTask.table,lastchank:true, count: count});
                }
            });
            xmlReader = new XmlStream(readStream);
            xmlReader.preserve(TABLES[currentTask.table].XMLTAG, true);
            xmlReader.on(`endElement: ${TABLES[currentTask.table].XMLTAG}`, (item) => {
                count++;
                let row = TABLES[currentTask.table].COLUMNS.map(key=>item['$'][key.toUpperCase()]||'NULL')
                let _string = row.join('$').replace(/\\/g,'\\\\');
                if (count > 100000) {
                    writeStream.end(_string);
                    xmlReader.pause();
                    logger.debug(`Pause reading file on current task`);
                }
                else writeStream.write(_string + '\n');
            });
            xmlReader.on('end', () => {
                if(count>0){
                    writeStream.end();
                    logger.debug(`end of file reading send ${transferFile}`);
                    lastchunk = true;
                }
                else {
                    logger.debug(`end of file reading without sending`);
                    parentPort.postMessage({file: null, lastchank: true});
                }
            });
            break;
        case 1:
            logger.debug(`Resume reading`);
            count = 0;
            part++;
            transferFile = `transfer_${currentTask.table.toLowerCase()}_${part}.csv`;
            writeStream = fs.createWriteStream(path.resolve(os.tmpdir(),transferFile));
            writeStream.on('finish', () => {
                logger.debug(`Finish write data to stream`);
                writeStream.destroy();
                if(!lastchunk) parentPort.postMessage({file: transferFile, table: currentTask.table, count: count});
                else {
                    lastchunk = false;
                    parentPort.postMessage({file: transferFile, table: currentTask.table,lastchank:true, count: count});
                }
            });
            xmlReader.resume();
            break;
    }
})

