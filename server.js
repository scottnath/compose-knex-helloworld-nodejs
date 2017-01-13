'use strict';
/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 // First add the obligatory web framework
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const knex = require('knex');

var database = require('./database');

app.use(bodyParser.urlencoded({
  extended: false
}));

// Util is handy to have around, so thats why that's here.
const util = require('util')
// and so is assert
const assert = require('assert');

// We want to extract the port to publish our app on
var port = process.env.PORT || 8080;

// Then we'll pull in the database client library
var pg = require('pg');

// Now lets get cfenv and ask it to parse the environment variable
var cfenv = require('cfenv');
var appenv = cfenv.getAppEnv();

console.log('appenv');
console.log(JSON.stringify(appenv, null, 2));
// Within the application environment (appenv) there's a services object
let services = appenv.services;
console.log('services YES');
console.log(Array.isArray(services));

/**

  knex: {
    dialect: 'pg',
    connection: {
      host: 'localhost',
      user: 'punchcard',
      database: 'punchcard',
    },
    debug: false,
    acquireConnectionTimeout: 2000,
  },

 */
services['user-provided'] = {
  dialect: 'pg',
  connection: {
    database: 'knex_bluemix_helloworld',
    password: 'punchcard',
    host: 'localhost',
    username: 'punchcard'
  },
  debug: false,
  table: 'words',
};


services['production'] = {
  dialect: 'pg',
  connection: {
    database: 'compose',
    password: 'IDGSRVWBBPZOMGWA',
    host: 'bluemix-sandbox-dal-9-portal.3.dblayer.com',
    username: 'admin',
    crazy: 'madeup',
    user: 'admin',
    port: 21889,
  },
  debug: false,
  table: 'words',
};

console.log('services');
console.log(JSON.stringify(services, null, 2));

// The services object is a map named by service so we extract the one for PostgreSQL
let credentials;
let config;

if (services['compose-for-postgresql']) {
  credentials = services['compose-for-postgresql'][0].credentials;

  // Within the credentials, an entry ca_certificate_base64 contains the SSL pinning key
  // We convert that from a string into a Buffer entry in an array which we use when
  // connecting.
  var ca = new Buffer(credentials.ca_certificate_base64, 'base64');
  var connectionString = credentials.uri;

  // We want to parse connectionString to get username, password, database name, server, port
  // So we can use those to connect to the database
  var parse = require('pg-connection-string').parse;
  // config = parse(connectionString);
  config = services['production'];
console.log('-------------------');
console.log('PARSIN THAT CONNECT STRING!');
console.log(JSON.stringify(parse(connectionString), null, 2));
console.log('-------------------');

  // Add some ssl
  config.ssl = {
    rejectUnauthorized: false,
    ca: ca
  }
}
else {
  config = services['user-provided'];
}

console.log('-------------------');
console.log('CREDENTIALS');
console.log(JSON.stringify(credentials, null, 2));
console.log('-------------------');

console.log('config');
console.log(JSON.stringify(config.connection, null, 2));

const db = knex(config);

database.createTable(db, config);

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

app.put('/words', function(request, response) {
  return db(config.table).insert({word: request.body.word, definition: request.body.definition}).returning('*').then(result => {
    console.log(`added: ${JSON.stringify(result, null, 2)}`);
    return response.send(result);
  }).catch(error => {
    console.error(`error: ${error}`);
    return response.status(500).send(error);
  });
});


/**
 * Read from the database when someone visits /words
 * @param {object} request - HTTP Request
 * @param {object} response - HTTP Response
 * @param {object} next - Express callback
 *
 */
app.get('/words', function(request, response, next) {
  return db.select('*').from(config.table).then(rows => {
    console.log('/words table rows');
    console.log(JSON.stringify(rows, null, 2));
    return response.send(rows);
  })
  .catch(error => {
    console.error('error on /words load');
    console.error(error);
    return response.status(500).send(error);
  });
});

// Now we go and listen for a connection.
app.listen(port);

console.log(`app started on port ${port}`);

require('cf-deployment-tracker-client').track();
