var expect = require('chai').expect;

describe('datastore', function() {
  var store = require('../datastore');
  var tableName = "test_table";

  afterEach(function() {
    return store.query().schema.dropTableIfExists(tableName);
  });

  describe('.save', function() {
    var someData = { x: "datax", y: ["datay", { z: 1 }] };

    beforeEach(function() {
      return store.save(tableName, someData);
    });

    it('creates a table if not exists', function() {
      return store.query().schema.hasTable(tableName).then(function(exists) {
        expect(exists).to.be.true;
      });
    });

    it('sets saved_at row', function() {
      return store.query(tableName).column('saved_at').then(function(rows) {
        expect(rows[0].saved_at).to.be.instanceof(Date);
      });
    });

    it('saves given object as JSON', function() {
      return store.query(tableName).whereRaw("raw->>'x'='datax'").then(function(rows) {
        expect(rows).to.not.be.empty;
      });
    });
  });

  describe('.saveXML', function() {
    var someXML = "<sample>data</sample>";

    beforeEach(function() {
      return store.saveXML(tableName, someXML);
    });

    it('saves given XML string as JSON', function() {
      return store.query(tableName).then(function(rows) {
        expect(rows[0].raw).to.eql({ sample: "data" });
      });
    });
  });
});
