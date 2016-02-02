'use strict';

/**
 * Module dependencies.
 */

import { omit } from 'lodash';

/**
 * Module variables.
 */

const isArray = Array.isArray;
const noop = () => {};

export default (store, options) => {

  const coll = store.db.collection(`${store.name}.events`);

  coll.ensureIndex({ id: 1, revision: 1 }, error);
  coll.ensureIndex({ revision: 1 }, error);

  /**
   * Handle `snapshot` errors.
   *
   * @param {Errorr} err
   * @api private
   */

  const error = err => err && store.emit('error', err);

  /**
   * Get `event`.
   *
   * @param {Object} query
   * @param {Function} fn
   * @api public
   */

  const get = (id, snap, fn) => {
    if (isArray(id)) return getMulti(id, snap, fn);
    const query = snap ? { id: snap.id, revision: { $gt: snap.revision } } : { id };
    coll.find(query).sort({ version: 1 }, fn);
  }

  /**
   * Get multiple `event`s.
   *
   * @param {Object} ids
   * @param {Array} snaps
   * @param {Function} fn
   * @api public
   */

  const getMulti = (ids, snaps, fn) => coll.find({
    $or: ids.map(id => {
      const snap = snaps.length ? snaps.find(s => s.id === id) : null;
      return snap ? { id, version: { $gt: snap.revision } } : { id };
    })
  }).sort({ id: 1, version: 1 }).toArray(fn);

  /**
   * Commit events from a single entity.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @return {Event} this
   * @api public
   */

  const commit = (entity, fn = noop) => {
    if (isArray(entity)) return commitMulti(entity, fn);
    let events = normalize(entity.events);
    if (!events.length) return fn();
    coll.insert(events, err => {
      if (err) return fn(err);
      entity.events = [];
      fn();
    });
  }

  /**
   * Commit events from multiple entities.
   *
   * @param {Array} entities
   * @param {Function} fn
   * @return {Event} this
   * @api public
   */

  const commitMulti = (entities, fn) => {
    const events = entities.reduce((a, b) => [...a.events, ...b.events]);
    if (!events.length) return fn(null, []);
    coll.insert(normalize(events), err => {
      if (err) return fn(err);
      entities.forEach(e => e.events = []);
      fn();
    });
  }

  /**
   * Normalize events.
   *
   * @return {Array} events
   * @param {Object} entity
   * @api private
   */

  const normalize = events => events.map(e => omit(e, '_id'));

  store.event = { get, commit };

}
