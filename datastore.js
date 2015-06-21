var env = process.env.NODE_ENV || 'development';
var config = require('./knexfile');
var knex = require('knex')(config[env]);
var Promise = require('bluebird');
var parseString = Promise.promisify(require('xml2js').parseString);

function DataStore() {
}

DataStore.prototype = {
  save: function(table, obj) {
    return createTableIfNotExists(table).then(function() {
      return knex(table).insert({
        saved_at: new Date(),
        raw: JSON.stringify(obj)
      });
    });
  },
  saveXML: function(table, xml) {
    var _this = this;
    return parseString(xml).then(function(result) {
      return _this.save(table, result);
    });
  },
  query: function() {
    if (arguments.length === 0) {
      return knex;
    } else {
      return knex.apply(knex, arguments);
    }
  }
};

function createTableIfNotExists(tableName) {
  return knex.schema.hasTable(tableName).then(function(exists) {
    if (!exists) {
      return knex.schema.createTable(tableName, function(table) {
        table.increments();
        table.timestamp('saved_at');
        table.json('raw', true).index(tableName + '_raw_gin', 'gin');
      });
    }
  });
}

module.exports = new DataStore();
