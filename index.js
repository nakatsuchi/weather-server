var config = require('./config.json');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.text({ type: 'application/atom+xml' }));

app.get('/weather-server/webhook', function(req, res) {
  console.log('GET');
  console.log('query: %j', req.query);
  console.log('body: %j', req.body);
  res.set('Content-Type', 'text/plain');
  switch (req.query['hub.mode']) {
    case 'denied':
      onDenied(req, res);
      break;
    case 'subscribe':
      onSubscribe(req, res);
      break;
    case 'unsubscribe':
      onUnsubscribe(req, res);
      break;
  }
});

app.post('/weather-server/webhook', function(req, res) {
  console.log('POST');
  console.log('body: %j', req.body);
});

function onDenied(req, res) {
  console.log('Subscription denied');
  res.status(200).send(req.query['hub.challenge']);
}

function onSubscribe(req, res) {
  if (!verifyHub(req)) {
    console.log('Hub verification failed');
    res.status(404).send(req.query['hub.challenge']);
  } else {
    console.log('Subscribed ' + req.query['hub.topic']);
    res.status(200).send(req.query['hub.challenge']);
  }
}

function verifyHub(req) {
  return req.query['hub.verify_token'] === config.verifyToken &&
    req.query['hub.topic'].indexOf(config.topicPrefix) === 0;
}

function onUnsubscribe(req, res) {
  console.log('Unsubscribed');
  res.status(200).send(req.query['hub.challenge']);
}

var server = app.listen(config.port, function() {
  console.log('Subscriber listening on %j', server.address());
});

