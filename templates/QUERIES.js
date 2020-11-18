const  CREATE_STRUCTURE = function(extensions,addrobj,house,rooms,socrbase,aotrig,conf){
    let _extensions = `
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
            CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;`
    let _ADDRROBJ = `
            DROP TABLE IF EXISTS "ADDROBJ";
            CREATE TABLE "ADDROBJ" (
                  "id"         SERIAL4 NOT NULL,
                  "aoid"       UUID    NOT NULL,
                  "aoguid"     UUID,
                  "shortname"  VARCHAR(10) COLLATE "default",
                  "formalname" VARCHAR(120) COLLATE "default",
                  "aolevel"    INT2,
                  "parentguid" UUID,
                  "actstatus"  BOOL,
                  "livestatus" BOOL,
                  "nextid"     UUID,
                  "regioncode" int2,
                  "postalcode" VARCHAR(6) COLLATE "default", 
                  "ifnsfl"     VARCHAR(4) COLLATE "default",
                  "terrifnsfl" VARCHAR(4) COLLATE "default",
                  "ifnsul"     VARCHAR(4) COLLATE "default",
                  "terrifnsul" VARCHAR(4) COLLATE "default",
                  "okato"      VARCHAR(11) COLLATE "default",
                  "oktmo"      VARCHAR(11) COLLATE "default",
                  CONSTRAINT "aoid" UNIQUE ("aoid"),
                  CONSTRAINT "id_addrobj" PRIMARY KEY ("id")
            )
            WITH (OIDS =FALSE);`;
    let _HOUSE = `    
            DROP TABLE IF EXISTS "HOUSE";
            CREATE TABLE "HOUSE" (
                 "id"         SERIAL4 NOT NULL,
                 "houseid"   UUID    NOT NULL,
                 "houseguid"  UUID    NOT NULL,
                 "aoguid"     UUID,
                 "housenum"   VARCHAR(20) COLLATE "default",
                 "buildnum"   VARCHAR(50) COLLATE "default",
                 "strucnum"   VARCHAR(50) COLLATE "default",
                 "enddate"    VARCHAR(10) COLLATE "default",
                 "strstatus"  INT2,
                 "statstatus"  INT2,
                 "eststatus"  INT2,
                 "divtype"    INT2,
                 "postalcode" VARCHAR(6) COLLATE "default",
                 "ifnsfl"     VARCHAR(4) COLLATE "default",
                 "terrifnsfl" VARCHAR(4) COLLATE "default",
                 "ifnsul"     VARCHAR(4) COLLATE "default",
                 "terrifnsul" VARCHAR(4) COLLATE "default",
                 "okato"      VARCHAR(11) COLLATE "default",
                 "oktmo"      VARCHAR(11) COLLATE "default",
                 "cadnum"     VARCHAR(100) COLLATE "default",
                 CONSTRAINT "houseuid" UNIQUE ("houseid"),
                 CONSTRAINT "id_house" PRIMARY KEY ("id")
            )
            WITH (OIDS =FALSE);`;
    let _ROOM = `
            DROP TABLE IF EXISTS "ROOM";
            CREATE TABLE "ROOM" (
                "id"         SERIAL4 NOT NULL,
                "roomid"    UUID    NOT NULL,
                "roomguid"   UUID    NOT NULL,
                "houseguid"  UUID,
                "regioncode" VARCHAR(2) COLLATE "default",
                "flatnumber" VARCHAR(50) COLLATE "default",
                "roomnumber" VARCHAR(50) COLLATE "default",
                "livestatus" BOOL,
                "nextid"     UUID,
                "postalcode" VARCHAR(6) COLLATE "default",
                "cadnum"     VARCHAR(100) COLLATE "default",
                CONSTRAINT "roomuid" UNIQUE ("roomid"),
                CONSTRAINT "id_room" PRIMARY KEY ("id")
            )
                WITH (OIDS =FALSE);`;
    let _SOCRBASE = `
    DROP TABLE IF EXISTS "SOCRBASE";
    CREATE TABLE "SOCRBASE" (
      "id"       SERIAL4 NOT NULL,
      "level"    INT2,
      "scname"   VARCHAR(10),
      "socrname" VARCHAR(50),
      "kod_t_st" VARCHAR(4),
      CONSTRAINT "kod_t_st" UNIQUE ("kod_t_st"),
      CONSTRAINT "id_socrbase" PRIMARY KEY ("id")
    )
    WITH (OIDS =FALSE);`
    let AOTRIG = `
    DROP TABLE IF EXISTS "AOTRIG";
    CREATE TABLE "AOTRIG" (
      "id"        SERIAL4 NOT NULL,
      "word"      VARCHAR(50),
      "trigramm"  VARCHAR(180),
      "frequency" INT4,
      CONSTRAINT "word" UNIQUE ("word"),
      CONSTRAINT "id_aotrig" PRIMARY KEY ("id")
    )
    WITH (OIDS =FALSE);`
    let _OTHER = `
        DROP TABLE IF EXISTS "CONFIG";
        CREATE TABLE "CONFIG" (
            "id" int4 NOT NULL,
            "version" UUID,
            CONSTRAINT "id_config" PRIMARY KEY ("id")
        )
        WITH (OIDS=FALSE);
        INSERT INTO "public"."CONFIG" VALUES ('0', uuid_generate_v4());`

    return (extensions?_extensions:'') +
            (addrobj?_ADDRROBJ:'') +
            (house?_HOUSE:'') +
            (rooms?_ROOM:'') +
            (socrbase?_SOCRBASE:'') +
            (aotrig?AOTRIG:'') +
            (conf?_OTHER:'');

}

const bulkcreate_fabric = (table, columns)=>`
    COPY "${table}" (${columns.join(',')}) FROM STDIN DELIMITER '$' NULL 'NULL'
`
const ADDROBJ_COLUMNS = [
    "aoid", "aoguid", "shortname", "formalname", "aolevel", "parentguid", "actstatus", "livestatus",
    "nextid", "regioncode", "postalcode", "ifnsfl", "terrifnsfl", "ifnsul", "terrifnsul", "okato", "oktmo"]
const HOUSE_COLUMNS = [
    "houseid","houseguid","aoguid","housenum","buildnum","strucnum", "enddate","strstatus", "statstatus",
    "eststatus","divtype","postalcode","ifnsfl","terrifnsfl","ifnsul","terrifnsul","okato","oktmo","cadnum"]
const ROOM_COLUMNS = [
    "roomid","roomguid","houseguid","regioncode","flatnumber","roomnumber",'livestatus',"nextid","postalcode","cadnum"]
const SOCRBASE_COLUMNS = ["level","scname","socrname","kod_t_st"]
const TABLES = {
    "ADDROBJ":{
        COLUMNS:ADDROBJ_COLUMNS,
        XMLTAG:'Object',
        BULK_CREATE:bulkcreate_fabric('ADDROBJ',ADDROBJ_COLUMNS)
    },
    "HOUSE":{
        COLUMNS:HOUSE_COLUMNS,
        XMLTAG:'House',
        BULK_CREATE:bulkcreate_fabric('HOUSE',HOUSE_COLUMNS)
    },
    "ROOM":{
        COLUMNS:ROOM_COLUMNS,
        XMLTAG:'Room',
        BULK_CREATE:bulkcreate_fabric('ROOM',ROOM_COLUMNS)
    },
    "SOCRBASE":{
        COLUMNS:SOCRBASE_COLUMNS,
        XMLTAG:'AddressObjectType',
        BULK_CREATE:bulkcreate_fabric('SOCRBASE',SOCRBASE_COLUMNS)
    }
}
const SPHINX_QUERY =
`WITH RECURSIVE PATH (cnt, aoid, aoguid, aolevel, postalcode, ifnsfl, ifnsul, okato, oktmo, fullname) AS (
    SELECT ao.id as cnt, ao.aoid, ao.aoguid, ao.aolevel, ao.postalcode, ao.ifnsfl, ao.ifnsul, ao.okato, ao.oktmo, 
           ao.shortname || ' ' || ao.formalname AS fullname,
           ao.shortname || '' AS sname
    FROM "ADDROBJ" AS ao
    WHERE aolevel = 1 AND actstatus = TRUE AND livestatus = TRUE AND nextid IS NULL
    UNION
    SELECT child.id as cnt, child.aoid, child.aoguid, child.aolevel, child.postalcode, child.ifnsfl, child.ifnsul, child.okato, child.oktmo,
           PATH.fullname || ', ' || child.shortname || ' ' || child.formalname AS fullname,
           PATH.sname || ' ' || child.shortname AS sname
    FROM "ADDROBJ" AS child, PATH
    WHERE child.parentguid = PATH.aoguid AND actstatus = TRUE AND livestatus = TRUE AND nextid IS NULL
)
SELECT p.cnt, p.aoid, p.postalcode, p.ifnsfl, p.ifnsul, p.okato, p.oktmo, p.fullname, p.sname, length(p.fullname)-length(replace(p.fullname, ' ', '')) as wordcount FROM PATH p WHERE p.AOLEVEL NOT IN (1, 3)`

module.exports = {CREATE_STRUCTURE,TABLES,SPHINX_QUERY}