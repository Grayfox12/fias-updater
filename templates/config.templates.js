const {SPHINX_QUERY} = require('./QUERIES')
const path = require('path')
const IDX_ADDROBJ = (index,db,varpath,minlentostar)=> `
source ${index}
{
    type                = pgsql
    sql_host            = ${db.host}
    sql_user            = ${db.user}
    sql_pass            = ${db.passwd}
    sql_db              = ${db.name}
    sql_port            = ${db.port}

    sql_query           = ${SPHINX_QUERY.replace(/(.)\n/g,'$1 \\\n')}

    sql_field_string    = fullname
    sql_field_string    = sname
    sql_attr_uint       = wordcount
    sql_attr_string     = aoid
    sql_attr_string     = postalcode
    sql_attr_string     = ifnsfl
    sql_attr_string     = ifnsul
    sql_attr_string     = okato
    sql_attr_string     = oktmo
}

index ${index}
{
    min_word_len        = 1
    min_prefix_len      = ${minlentostar}
    min_infix_len       = 0
    bigram_index        = all

    # strip html by default
    html_strip          = 1

    ignore_chars        = @, -
    charset_table = 0..9, A..Z->a..z, _, a..z, \\
        U+0401->U+0435, U+0451->U+0435, \\
        U+410..U+42F->U+430..U+44F, U+430..U+44F

    source              = ${index}
    path                =  ${path.resolve(varpath,'data',index)}
}
`
const IDX_SUGGESTS = (index,db,varpath)=>`
source ${index}
{
    type                = pgsql
    sql_host            = ${db.host}
    sql_user            = ${db.user}
    sql_pass            = ${db.passwd}
    sql_db              = ${db.name}
    sql_port            = ${db.port}
    sql_query           = SELECT id, trigramm, word, LENGTH(word) AS len, frequency FROM "AOTRIG"

    sql_field_string     = trigramm
    sql_attr_uint        = len
    sql_attr_string      = word
    sql_attr_string      = frequency
}

index ${index}
{
    source              = ${index}
    path                = ${path.resolve(varpath,'data',index)}
}
`
const IDX_HOUSES = (indexname,db,varpath) =>`

source ${indexname}_part_1
{
    type                = pgsql
    sql_host            = ${db.host}
    sql_user            = ${db.user}
    sql_pass            = ${db.passwd}
    sql_db              = ${db.name}
    sql_port            = ${db.port}
    sql_query_range     = SELECT MIN(id),MAX(id)/4 FROM "HOUSE"
    sql_range_step      = 100000
    sql_query           = SELECT id, \\
                           aoguid, \\
                           houseid, \\
                           houseguid, \\
                           housenum, \\
                           buildnum, \\
                           strucnum, \\
                           postalcode, \\
                           ifnsfl, \\
                           ifnsul, \\
                           okato, \\
                           oktmo, \\
                           concat(housenum, \\
                                  (CASE WHEN buildnum IS NULL THEN '' ELSE concat(', корп. ', buildnum) END), \\
                                  (CASE WHEN strucnum IS NULL THEN '' ELSE concat(', стр. ', strucnum) END)) \\
                                   AS fullname \\
                    FROM "HOUSE" \\
                    WHERE COALESCE(TO_TIMESTAMP(enddate, 'YYYY-MM-DD'), \\
                                             TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD')) \\
                                   = TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD') and id between $start and $end


    sql_field_string     = aoguid
    sql_attr_string      = houseid
    sql_attr_string      = houseguid
    sql_attr_string      = fullname
}
source ${indexname}_part_2
{
    type                = pgsql
    sql_host            = ${db.host}
    sql_user            = ${db.user}
    sql_pass            = ${db.passwd}
    sql_db              = ${db.name}
    sql_port            = ${db.port}
    sql_query_range     = SELECT MAX(id)/4,2*MAX(id)/4 FROM "HOUSE"
    sql_range_step      = 100000
    sql_query           = SELECT id, \\
                           aoguid, \\
                           houseid, \\
                           houseguid, \\
                           housenum, \\
                           buildnum, \\
                           strucnum, \\
                           postalcode, \\
                           ifnsfl, \\
                           ifnsul, \\
                           okato, \\
                           oktmo, \\
                           concat(housenum, \\
                                  (CASE WHEN buildnum IS NULL THEN '' ELSE concat(', корп. ', buildnum) END), \\
                                  (CASE WHEN strucnum IS NULL THEN '' ELSE concat(', стр. ', strucnum) END)) \\
                                   AS fullname \\
                    FROM "HOUSE" \\
                    WHERE COALESCE(TO_TIMESTAMP(enddate, 'YYYY-MM-DD'), \\
                                             TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD')) \\
                                   = TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD') AND id between $start and $end

    sql_field_string     = aoguid
    sql_attr_string      = houseid
    sql_attr_string      = houseguid
    sql_attr_string      = fullname
}
source ${indexname}_part_3
{
    type                = pgsql
    sql_host            = ${db.host}
    sql_user            = ${db.user}
    sql_pass            = ${db.passwd}
    sql_db              = ${db.name}
    sql_port            = ${db.port}
    sql_query_range     = SELECT 2*MAX(id)/4,3*MAX(id)/4 FROM "HOUSE"
    sql_range_step      = 100000    
    sql_query           = SELECT id, \\
                           aoguid, \\
                           houseid, \\
                           houseguid, \\
                           housenum, \\
                           buildnum, \\
                           strucnum, \\
                           postalcode, \\
                           ifnsfl, \\
                           ifnsul, \\
                           okato, \\
                           oktmo, \\
                           concat(housenum, \\
                                  (CASE WHEN buildnum IS NULL THEN '' ELSE concat(', корп. ', buildnum) END), \\
                                  (CASE WHEN strucnum IS NULL THEN '' ELSE concat(', стр. ', strucnum) END)) \\
                                   AS fullname \\
                    FROM "HOUSE" \\
                    WHERE COALESCE(TO_TIMESTAMP(enddate, 'YYYY-MM-DD'), \\
                                             TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD')) \\
                                   = TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD') AND id between $start and $end

    sql_field_string     = aoguid
    sql_attr_string      = houseid
    sql_attr_string      = houseguid
    sql_attr_string      = fullname
}
source ${indexname}_part_4
{
    type                = pgsql
    sql_host            = ${db.host}
    sql_user            = ${db.user}
    sql_pass            = ${db.passwd}
    sql_db              = ${db.name}
    sql_port            = ${db.port}
    sql_query_range     = SELECT 3*MAX(id)/4,MAX(id) FROM "HOUSE"
    sql_range_step      = 100000   
    sql_query           = SELECT id, \\
                           aoguid, \\
                           houseid, \\
                           houseguid, \\
                           housenum, \\
                           buildnum, \\
                           strucnum, \\
                           postalcode, \\
                           ifnsfl, \\
                           ifnsul, \\
                           okato, \\
                           oktmo, \\
                           concat(housenum, \\
                                  (CASE WHEN buildnum IS NULL THEN '' ELSE concat(', корп. ', buildnum) END), \\
                                  (CASE WHEN strucnum IS NULL THEN '' ELSE concat(', стр. ', strucnum) END)) \\
                                   AS fullname \\
                    FROM "HOUSE" \\
                    WHERE COALESCE(TO_TIMESTAMP(enddate, 'YYYY-MM-DD'), \\
                                             TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD')) \\
                                   = TO_TIMESTAMP('2079-06-06', 'YYYY-MM-DD') AND id between $start and $end

    sql_field_string     = aoguid
    sql_attr_string      = houseid
    sql_attr_string      = houseguid
    sql_attr_string      = fullname
}

index ${indexname}_part_1
{
     path                = ${path.resolve(varpath,'data',indexname+'_part_1')}
     source              = ${indexname}_part_1
     ondisk_attrs        = pool
}

index ${indexname}_part_2
{
     path                = ${path.resolve(varpath,'data',indexname+'_part_2')}
     source              = ${indexname}_part_2
     ondisk_attrs        = pool
}

index ${indexname}_part_3
{
     path                = ${path.resolve(varpath,'data',indexname+'_part_3')}
     source              = ${indexname}_part_3
     ondisk_attrs        = pool
}

index ${indexname}_part_4
{
     path                = ${path.resolve(varpath,'data',indexname+'_part_4')}
     source              = ${indexname}_part_4
     ondisk_attrs        = pool
}

index ${indexname}
{
     type                = distributed
     local               = ${indexname}_part_1
     local               = ${indexname}_part_2
     local               = ${indexname}_part_3
     local               = ${indexname}_part_4
}
`
const INDEXER_SEARCHD = (listen,varpath)=>`
indexer
{
        # memory limit, in bytes, kiloytes (16384K) or megabytes (256M)
        # optional, default is 32M, max is 2047M, recommended is 256M to 1024M
        mem_limit               = 256M

        # maximum IO calls per second (for I/O throttling)
        # optional, default is 0 (unlimited)
        #
        # max_iops              = 40

        # maximum IO call size, bytes (for I/O throttling)
        # optional, default is 0 (unlimited)
        #
        max_iosize              = 524288
}

searchd
{

        listen                  = ${listen}

        # required by RT-indexes
        workers                 = threads

        # log file, searchd run info is logged here
        # optional, default is 'searchd.log'
        log                     =  ${path.resolve(varpath,'log','searchd.log')}

        # query log file, all search queries are logged here
        # optional, default is empty (do not log queries)
        query_log               = ${path.resolve(varpath,'log','query.log')}

        # client read timeout, seconds
        # optional, default is 5
        read_timeout    = 7

        # maximum amount of children to fork (concurrent searches to run)
        # optional, default is 0 (unlimited)
        max_children    = 4

        # PID file, searchd process ID file name
        # mandatory
        pid_file                = ${path.resolve(varpath,'run','searchd.pid')}
        binlog_path             = ${path.resolve(varpath,'run')}
        # seamless rotate, prevents rotate stalls if precaching huge datasets
        # optional, default is 1
        seamless_rotate = 1

        # whether to forcibly preopen all indexes on startup
        # optional, default is 0 (do not preopen)
        preopen_indexes = 0

        # whether to unlink .old index copies on succesful rotation.
        # optional, default is 1 (do unlink)
        unlink_old              = 1

        expansion_limit = 32
}

`

const CONF_FABRIC = (index_addr,index_suggests,index_houses,db,varpath,minlentostar,listen)=>
        IDX_ADDROBJ(index_addr,db,varpath,minlentostar) +
        IDX_SUGGESTS(index_suggests,db,varpath) +
        IDX_HOUSES(index_houses,db,varpath) +
        INDEXER_SEARCHD(listen,varpath)

module.exports = {IDX_ADDROBJ,CONF_FABRIC}