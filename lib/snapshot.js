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

  const { rounds = 10 } = options;
  const coll = store.db.collection(`${store.name}.snapshots`);

  coll.ensureIndex({ id: 1, revision: 1 }, error);
  coll.ensureIndex({ version: 1 }, error);

  /**
   * Handle `snapshot` errors.
   *
   * @param {Errorr} err
   * @api private
   */

  const error = err => err && store.emit('error', err);

  /**
   * Get `snapshot`.
   *
   * @param {String|Number} id
   * @param {Function} fn
   * @api public
   */

  const get = (id, fn) => {
    if (isArray(id)) return getMulti(id, fn);
    coll.find({ id }).limit(-1).sort({ version: -1 }).next(fn);
  }

  /**
   * Get multiple `snapshot`s.
   *
   * @param {Array} ids
   * @param {Function} fn
   * @api public
   */

  const getMulti = (ids, fn) => coll.aggregate(...[
    { $match: { id: { $in: ids } } },
    { $group: { _id: '$id', revision: { $last: '$revision' } } },
    { $project: { _id: 0, id: '$_id.id', revision: 1 }}
  ], (err, pairs) => {
    if (err) return fn(err);
    let query = {};
    if (!pairs.length) return fn(null, [])
    if (1 === pairs.length) query = pairs[0];
    else query.$or = pairs;
    coll.find(query).toArray(fn);
  });

  /**
   * Commit a single entity `snapshot`.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @api public
   */

  const commit = (entity, options, fn = noop) => {
    if (isArray(entity)) return commitMulti(entity, options, fn);
    if (options.snap || entity.revision >= entity.version + rounds) {
      let snap = entity.snap();
      return coll.insert(normalize(snap), err => {
        if (err) return fn(err);
        fn(null, entity);
      });
    }
    fn(null, entity);
  };

  /**
   * Commit multiple entities `snapshot`s.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @api public
   */

  const commitMulti = (entities, options, fn) => {
    const snaps = entities
      .filter(e => options.snap || e.revision >= e.version + rounds)
      .map(e => normalize(e.snap()));
    if (!snaps.length) return fn(null, snaps);
    return coll.insert(snaps, err => {
      if (err) return fn(err);
      fn(null, entities);
    });
  }

  /**
   * Normalize `snapshot`.
   *
   * @param {Object} snap
   * @return {Object} snap
   * @api private
   */

  const normalize = snap => omit(snap, '_id');

  store.snapshot = { get, commit };

}
