'use strict';

/**
 * Module dependencies.
 */

import MongoJS from 'mongojs';
import dbg from 'debug';

/**
 * Module dependencies.
 */
const debug = dbg('event-store-mongo:db');

/**
 * MongoStore initializer.
 *
 * @param {Store} store
 * @param {Object} config
 * @return {Store}
 * @api public
 */

export default (store, config = {}) => {

  const { name } = store;

  let { db, mongo } = config;

  if (!db && !mongo) {
    throw new Error('Missing required MongoStore db instance or mongo connection string.');
  }

  db = db || MongoJS(mongo);

  db.on('error', (err) => {
    console.error(err);
    debug('database error ocurred %s', err);
    store.emit('error', err);
  });

  store.db = db;
}
