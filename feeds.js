var env = process.env.NODE_ENV || 'development';
var config = require('./config');
var cassandra = require('cassandra-driver');
var Promise = require('bluebird');
var parseString = Promise.promisify(require('xml2js').parseString);
var request = require('request');

var feedsTableName = 'jmaxml_feeds';
var client = Promise.promisifyAll(new cassandra.Client(config.database));

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

function parseAtomEntries(xml) {
  return parseString(xml).then(function(atom) {
    var entries = atom.feed.entry;
    return entries.map(function(entry) {
      var uuid = extractUUID(entry.id[0]);
      var url = extractContentURL(uuid, entry.link);
      return {
        id: uuid,
        title: entry.title[0],
        updated: new Date(entry.updated[0]),
        author: entry.author[0].name[0],
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
  console.log('downloading entry: %s', entry.id);
  return downloadDocument(entry).then(function(entryWithDoc) {
    var cql =
      'INSERT INTO jmaxml_feeds (id, updated, title, author, doc) ' +
      'VALUES (?, ?, ?, ?, ?)';
    var row = {
      id: entryWithDoc.id,
      updated: entryWithDoc.updated,
      title: entryWithDoc.title,
      author: entryWithDoc.author,
      doc: JSON.stringify(entryWithDoc.doc)
    };
    return client.executeAsync(cql, row);
  });
}

function loadEntries(xml) {
  return parseAtomEntries(xml).then(function(entries) {
    return entries.map(function(entry) {
      var cql =
        'SELECT COUNT(*) FROM jmaxml_feeds ' +
        'WHERE id = ? ' +
        'LIMIT 1';
      return client.executeAsync(cql, [entry.id]).then(function(result) {
        if (+result.rows[0].count === 0) {
          return loadEntry(entry);
        } else {
          console.info('The entry %s is already exist.', entry.id);
        }
      });
    }).reduce(function(prev, curr) {
      return prev.then(function() {
        return curr;
      });
    });
  });
}

module.exports = {
  loadEntries: loadEntries
};

