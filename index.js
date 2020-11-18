const logger = require('./utils/logger');
const commander = require('commander');
const manager = require('./workers/manager')
const fs = require('fs');
const os = require('os');
const readline = require('readline');
const path = require('path');
const { spawn } = require('child_process');
const copyFrom = require('pg-copy-streams').from;

const {PG_CLIENT_POOL,PG_CONFIG,trigram} = require('./utils/utils');
const {CREATE_STRUCTURE} = require('./templates/QUERIES');
const {IDX_ADDROBJ,CONF_FABRIC} = require('./templates/config.templates');
const {SPHINX,INDEXES_NAMES} = require('./utils/configreader');



const program = new commander.Command();

program
    .command('database')
    .description('Create database for fias')
    .requiredOption('-s, --source <path>','folder where program can find xml with fias objects')
    .option('--with-houses', 'add houses table')
    .option('--with-rooms', 'add rooms table')
    .action((opt)=>{
        logger.debug(`Create structure for fias`);
        PG_CLIENT_POOL
            .query({rowMode: 'array', text: CREATE_STRUCTURE(true,true,!!(opt.withHouses),!!(opt.withRooms),true,true)})
            .then(res=>{
                logger.debug(`Creating structure for fias is success`);
                logger.debug(`Run loader manager`);
                manager(opt.source,opt.withHouses,opt.withRooms);
            })
            .catch(error=>logger.error(`Creating structure for fias is failure with ${error}`))
    });

program
    .command('indexer')
    .description('indexing fias database and create index')
    .requiredOption('-o, --output <path>','folder where program generate sphinx file')
    .option('--with-houses', 'add houses table')
    .option('--with-rooms', 'add rooms table')
    .action((opt)=>{
        const index_addrobj_name = INDEXES_NAMES.addrobj;
        const index_suggests_name = INDEXES_NAMES.suggest;
        const index_house_name = INDEXES_NAMES.houses;
        const listen_server = SPHINX.host;

        let _path_idx_fias = path.resolve(os.tmpdir(),'idx_fias_addrobj.conf');
        let _path_suggdict = path.resolve(os.tmpdir(),'suggdict.txt');
        let _temp_csv_suggdict = path.resolve(os.tmpdir(),'suggdict.csv');

        const _sphinx_var = path.resolve(SPHINX.vardir);
        const _result_conf = path.resolve(opt.output,'sphinx.conf');
        const indexer = 'indexer'

        try {
            fs.mkdirSync(path.resolve(SPHINX.vardir,'data'),{recursive:true});
            fs.mkdirSync(path.resolve(SPHINX.vardir,'log'),{recursive:true});
            fs.mkdirSync(path.resolve(SPHINX.vardir,'run'),{recursive:true});
            fs.writeFileSync(_path_idx_fias, IDX_ADDROBJ(index_addrobj_name,PG_CONFIG,_sphinx_var,3));
            fs.closeSync(fs.openSync(_path_suggdict, 'w'));
            const _spawnindexer = spawn(indexer,[
                index_addrobj_name,
                '-c',
                _path_idx_fias,
                '--buildstops',
                _path_suggdict,
                '30000',
                '--buildfreqs'
            ]);
            _spawnindexer.stdout.on('data',data=>logger.info(`${data}`))
            _spawnindexer.stderr.on('data',data=>logger.error(`${data}`))
            _spawnindexer.on('close',code=> {
                if(!code) {
                    logger.info(`${code}`);
                    logger.info(`create dict with trigrams`);
                    readStream = fs.createReadStream(_path_suggdict);
                    writeStream = fs.createWriteStream(_temp_csv_suggdict);
                    const rl = readline.createInterface({
                        input: readStream,
                        crlfDelay: Infinity
                    });
                    rl.on('line', (line) => {
                        let _splitline = line.split(' ');
                        if(_splitline.length<2){
                            throw new Error(`Cannot read file ${_path_suggdict}`)
                        }
                        writeStream.write(`${_splitline[0]};${trigram(_splitline[0])};${_splitline[1]}\n`);
                    });
                    rl.on('close',()=> {
                        logger.info(`finish create dict with trigrams`);
                        readStream.close();
                        writeStream.close();
                        PG_CLIENT_POOL.connect((err, client, done)=>{
                            logger.error(err)
                            client.query('BEGIN')
                                .then(res=>client.query('TRUNCATE "AOTRIG" RESTART IDENTITY;'))
                                .then(res=>{
                                    let _fileStream = fs.createReadStream(_temp_csv_suggdict);
                                    let _stream = client.query(copyFrom(`COPY "AOTRIG" (word,trigramm,frequency) FROM STDIN DELIMITER ';' NULL 'NULL'`));
                                    _fileStream.pipe(_stream);
                                    return _stream;
                                })
                                .then(res=>client.query('COMMIT'))
                                .catch(e=> {
                                    logger.error('Error in transaction', err.stack);
                                    client.query('ROLLBACK')
                                        .then(res=>logger.warn('Rollback action'))
                                        .catch(err=>logger.error('Error rolling back client', err.stack))
                                        .finally(()=>client.release())

                                })
                                .finally(()=>{
                                    client.release();
                                    fs.writeFileSync(_result_conf, CONF_FABRIC(
                                        index_addrobj_name,
                                        index_suggests_name,
                                        index_house_name,
                                        PG_CONFIG,
                                        _sphinx_var,
                                        3,
                                        listen_server));
                                    const _spawnfinishindexer = spawn(indexer,[
                                        '-c',
                                        _result_conf,
                                        '--all',
                                        '--rotate'
                                    ]);
                                    _spawnfinishindexer.stdout.on('data',data=>logger.info(`${data}`));
                                    _spawnfinishindexer.stderr.on('data',data=>logger.error(`${data}`));
                                    _spawnfinishindexer.on('close',code=> {
                                        fs.unlinkSync(_path_idx_fias);
                                        fs.unlinkSync(_path_suggdict);
                                        fs.unlinkSync(_temp_csv_suggdict);
                                    })
                                })
                        })
                    })
                }
                else throw new Error(`finish with ${code}`)
            })
        } catch (err) {
            logger.error(`${err}`)
        }
    });
program.parse(process.argv);