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
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const knex = require('knex');
const cfenv = require('cfenv');
const parse = require('pg-connection-string').parse;

// required for postgres
const pg = require('pg');

// local modules
const database = require('./database');

app.use(bodyParser.urlencoded({
  extended: false
}));

// We want to extract the port to publish our app on
const port = process.env.PORT || 8080;

// Parse the environment variable
const appenv = cfenv.getAppEnv();

// From within the application environment (appenv,) extract the services object
let services = appenv.services;

// Generic postgres config
let config = {
  dialect: 'pg',
  connection: {},
  debug: false,
  table: 'words',
};

/**
 * Local environment object
 */
services['user-provided'] = {
  database: 'knex_bluemix_helloworld',
  host: 'localhost',
  username: 'punchcard',
  password: 'punchcard',
};

// The services object is a map named by service so we extract the one for PostgreSQL
let credentials;

// The services object is a map named by service, so we extract the one for PostgreSQL
if (services['compose-for-postgresql']) {
  // We now take the first bound PostgreSQL service and extract it's credentials object
  credentials = services['compose-for-postgresql'][0].credentials;

  // Within the credentials, an entry ca_certificate_base64 contains the SSL pinning key
  // We convert that from a string into a Buffer entry in an array which we use when
  // connecting.
  const ca = new Buffer(credentials.ca_certificate_base64, 'base64');
  const connectionString = credentials.uri;

  // use the parsed connectionString to get username, password, database name, server, port
  // So we can use those as the `connection` object in knex
  config.connection = parse(connectionString);

  // Add some ssl
  config.ssl = {
    rejectUnauthorized: false,
    ca: ca
  }
}
else {
  // no service object, so use the user-provided connection object
  config.connection = services['user-provided'];
}

// set up knex using the config
const db = knex(config);

// create the table in the database
database.createTable(db, config);

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

/**
 * Save word/definition to database
 * 
 * @param {object} req - HTTP Request
 * @param {object} res - HTTP Response
 * 
 * @return {object} returns a knex promise
 */
app.put('/words', function(request, response) {
  return db(config.table).insert({word: request.body.word, definition: request.body.definition}).returning('*').then(result => {
    // save to db worked, send the last added entry
    response.send(result);
  }).catch(error => {
    // something went wrong on save, send the status and error
    response.status(500).send(error);
  });
});


/**
 * Get all rows in the words table
 * 
 * @param {object} request - HTTP Request
 * @param {object} response - HTTP Response
 * @param {object} next - Express callback
 *
 */
app.get('/words', function(request, response, next) {
  return db.select('*').from(config.table).then(rows => {
    // sends all rows
    return response.send(rows);
  })
  .catch(error => {
    // something went wrong on select, send the status and error
    return response.status(500).send(error);
  });
});

// Now we go and listen for a connection.
app.listen(port);

console.log(`app started on port ${port}`);

require('cf-deployment-tracker-client').track();
