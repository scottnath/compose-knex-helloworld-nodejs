'use strict';

/**
 * Create words database table, if it does not exist
 * 
 * @param  {object} database post-config knex database object
 * @param  {object} config   database configuration
 * 
 * @return {object} knex promise
 */
const createTable = (database, config) => {
  return database.schema.hasTable(config.table).then(exists => {
    if (exists) {
      return `table ${config.connection.database} EXISTS`;
    }

    return database.schema.createTable(config.table, table => {
      table.string('word');
      table.string('definition');
    });
  }).catch(e => {
    throw new Error(e);
  });
}

module.exports = {
  createTable,
};
