var config = require('./config.json');
var fs = require('fs');
var Promise = require('bluebird');
var parseString = Promise.promisify(require('xml2js').parseString);
var uuid = require('node-uuid');
var feeds = require('./feeds');

var tasks = [];
for (var i = 2; i < process.argv.length; i += 2) {
  var title = process.argv[i];
  var filename = process.argv[i + 1];
  var xml = fs.readFileSync(filename, 'utf8');
  var task = parseString(xml).then(function(doc) {
    var feed = {
      uuid: filename,
      title: title,
      updated: new Date(),
      author: '',
      content: '',
      doc: doc
    };
    return feeds.save(feed)
  }).then(function() {
    console.log('Loaded "%s"', filename);
  }).catch(function(err) {
    console.error('An error occured while loading "%s"', filename);
    console.error(err);
  });
  tasks.push(task);
}

Promise.all(tasks).then(function() {
  process.exit();
});

