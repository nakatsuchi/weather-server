var env = process.env.NODE_ENV || 'development';
var config = require('./knexfile');
var knex = require('knex')(config[env]);
var Promise = require('bluebird');
var parseString = Promise.promisify(require('xml2js').parseString);
var request = require('request');

var feedsTableName = 'jmaxml_feeds';

function extractUUID(feedid) {
  var colon = feedid.lastIndexOf(':');
  return feedid.substring(colon + 1);
}

function downloadText(url) {
  return new Promise(function(resolve, reject) {
    var options = {
      url: url,
      encoding: 'utf8'
    };
    request(options, function(error, response, body) {
      if (error) {
        reject(error);
      } else if (response.statusCode !== 200) {
        reject(response.statusCode);
      } else {
        resolve(body);
      }
    });
  });
};

function extractContentURL(uuid, links) {
  return links.map(function(ln) {
    return ln.$.href
  }).filter(function(href) {
    return 0 <= href.indexOf(uuid);
  })[0];
}

function createTableIfNotExists() {
  return knex.schema.hasTable(feedsTableName).then(function(exists) {
    if (!exists) {
      return knex.schema.createTable(feedsTableName, function(table) {
        table.uuid('uuid').primary();
        table.string('title').notNull();
        table.timestamp('updated').notNull();
        table.string('author');
        table.json('doc', true)
      });
    }
  });
}

function parseAtomEntries(xml) {
  return parseString(xml).then(function(atom) {
    var entries = atom.feed.entry;
    return entries.map(function(entry) {
      var uuid = extractUUID(entry.id[0]);
      var url = extractContentURL(uuid, entry.link);
      return {
        uuid: uuid,
        title: entry.title[0],
        updated: new Date(entry.updated[0]),
        author: entry.author[0].name,
        doc_url: url
      };
    });
  });
}

function downloadDocument(entry) {
  if (!entry.doc_url) {
    return Promise.reject(new Error('feed has no valid url for content'));
  } else {
    return downloadText(entry.doc_url).then(function(xml) {
      return parseString(xml);
    }).then(function(doc) {
      entry.doc = doc;
      return entry;
    });
  }
}

function loadEntry(entry) {
  return downloadDocument(entry).then(function(entryWithDoc) {
    return Promise.all([entryWithDoc, createTableIfNotExists()]);
  }).spread(function(entry) {
    return knex(feedsTableName).insert({
      uuid: entry.uuid,
      title: entry.title,
      updated: entry.updated,
      author: entry.author,
      doc: entry.doc
    });
  });
}

function loadEntries(xml) {
  return parseAtomEntries(xml).then(function(entries) {
    return entries.map(function(entry) {
      return loadEntry(entry);
    }).reduce(function(prev, curr) {
      return prev.then(function() {
        console.log('Loaded: %j', {
          title: prev.title,
          updated: prev.updated,
          author: prev.author,
          doc_url: prev.doc_url
        });
        return curr;
      });
    });
  });
}

module.exports = {
  loadEntries: loadEntries
};

