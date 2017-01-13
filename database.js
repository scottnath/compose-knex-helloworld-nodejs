'use strict';

/**
 * Create words database table, if it does not exist
 */
const createTable = (database, config) => {
      console.log('-------------------');
      console.log('TABLE CREATION CONFIG');
      console.log(config);
      console.log('-------------------');
  return database.schema.hasTable(config.table).then(exists => {
    if (exists) {
      console.log('-------------------');
      console.log('TABLE EXISTS');
      console.log('-------------------');
      return `table ${config.connection.database} EXISTS`;
    }

    return database.schema.createTable(config.table, table => {
      table.string('word');
      table.string('definition');
    });
  }).catch(e => {
      console.log('-------------------');
      console.log('CREATE TABLE CONNECTION ERROR');
      console.log(e);
    throw new Error(e);
  });
}

module.exports = {
  createTable,
};
