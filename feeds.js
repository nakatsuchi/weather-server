var env = process.env.NODE_ENV || 'development';
var config = require('./knexfile');
var knex = require('knex')(config[env]);
var Promise = require('bluebird');
var parseString = Promise.promisify(require('xml2js').parseString);
var http = require('http');

var feedsTableName = 'jmaxml_feeds';

function extractUUID(feedid) {
  var colon = feedid.lastIndexOf(':');
  return feedid.substring(colon + 1);
}

var downloadText = Promise.promisify(function(url, callback) {
  var downloaded = '';
  var req = http.get(url, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(data) {
      downloaded += data;
    });
    res.on('end', function() {
      callback(void(0), downloaded);
    });
  });
  req.on('error', function(err) { callback(err); });
});

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
        table.uuid('uuid');
        table.string('title');
        table.timestamp('updated');
        table.string('author');
        table.string('content');
        table.json('doc', true)
      });
    }
  });
}

function parse(xml) {
  return parseString(xml).then(function(obj) {
    var uuid = extractUUID(feed.id[0]);
    var url = extractContentURL(uuid, feed.link);
    return {
      uuid: extractContentURL(feed.id[0]),
      title: feed.title[0],
      updated: new Date(feed.updated[0]),
      author: feed.author[0],
      content: feed.content[0],
      doc_url: url
    };
  });
}

function downloadDocument(feed) {
  if (!feed.doc_url) {
    return Promise.reject(new Error('feed has no valid url for content'));
  } else {
    return downloadText(feed.doc_url).then(function(xml) {
      return parseString(xml);
    }).then(function(doc) {
      feed.doc = doc;
      return feed;
    });
  }
}

function save(feed) {
  return createTableIfNotExists().then(function() {
    return knex(feedsTableName).insert(feed);
  });
}

function download(xml) {
  return parse(xml).then(function(feed) {
    return downloadDocument(feed);
  }).then(function(feed) {
    return saveFeed(xml);
  });
}

module.exports = {
  save: save,
  download: download
};

