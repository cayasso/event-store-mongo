'use strict';

/**
 * Module dependencies.
 */

import { isFunction, set } from 'lodash';
import Emitter from 'eventemitter3';
import snapshot from './snapshot';
import event from './event';
import dbg from 'debug';
import db from './db';

/**
 * Module variables.
 */

const debug = dbg('event-store-mongo:store');
const isArray = Array.isArray;
const noop = () => {};

/**
 * Store Error class inheriting from Emitter.
 *
 * @type {Object}
 */

class StoreError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    Error.captureStackTrace(this, this.constructor.name);
  }
}

/**
 * Store class inheriting from Emitter.
 *
 * @type {Object}
 */

export default class Store extends Emitter {

  /**
   * Setup `store` object.
   *
   * @param {Object} Entity
   * @param {Object} options
   * @return {Store} this
   * @api public
   */

  constructor(Entity, options = {}) {
    super();

    if (this.constructor === Store) {
      throw new StoreError('Can not instantiate abstract class.');
    }

    if (!Entity) {
      throw new StoreError('Entity class is required.');
    }

    if ('function' !== typeof Entity) {
      throw new StoreError('The given entity is not a constructor.');
    }

    this.Entity = Entity;
    this.name = Entity.name.toLowerCase();

    this.use(db, options);
    this.use(event, options);
    this.use(snapshot, options);

    this.invalid = fn => fn(new StoreError('Invalid entity id property.'));
  }

  /**
   * Get a single or multiple entities.
   *
   * @param {String|Number|Array|Function} id
   * @param {Function} [fnx
   * @return {Store} this
   * @api public
   */

  get(id, fn) {

    // Get all entities.
    if (isFunction(id)) {
      fn = id;
      this.event.distinct('id', (err, ids) => {
        if (err) return fn(err);
        this.get(ids, fn);
      });
    } else if (isArray(id)) {
      const ids = id;

      // Get multiple entities by ids.
      this.snapshot.get(ids, (err, snaps) => {
        if (err) return fn(err);
        this.event.get(ids, snaps, (err, events) => {
          if (err) return fn(err);
          if (snaps && !snaps.length && !events.length) return fn(null, []);
          const check = id => i => i.id === id;
          const entities = ids
            .map(id => {
              const snap = snaps.find(check(id));
              const evts = events.filter(check(id));
              return (snap || evts.length) ? this.cast(id).restore(snap).replay(evts) : null;
            });
          fn(null, entities);
        });
      });

    } else {

      // Get a single entity by id.
      this.snapshot.get(id, (err, snap) => {
        if (err) return fn(err);
        this.event.get(id, snap, (err, events) => {
          if (err) return fn(err);
          if (!snap && !events.length) return fn(null, null);
          let entity = this.cast(id).restore(snap).replay(events);
          fn(null, entity, true);
        });
      });
    }
    return this;
  }

  /**
   * Commit `entity` snapshot and events.
   *
   * @param {Entity|Array} entity
   * @param {Function} [fn]
   * @return {Store} this
   * @api public
   */

  commit(entity, options, fn = noop) {

    if (isFunction(options)) {
      fn = options;
      options = {};
    }

    if (isArray(entity)) {
      const entities = entity;

      if (entities.find(e => !e.id)) return this.invalid(fn);

      // Commit multiple entities
      this.snapshot.commit(entities, options, err => {
        if (err) return fn(err);
        this.event.commit(entities, err => {
          if (err) return fn(err);
          fn(null, entities.map(this.emits));
        });
      });

    } else {

      if (!entity || !entity.id) return this.invalid(fn);

      // Commit a single entity
      this.snapshot.commit(entity, options, err => {
        if (err) return fn(err);
        this.event.commit(entity, err => {
          if (err) return fn(err);
          fn(null, this.emits(entity));
        });
      });
    }
    return this;
  }

  /**
   * Emit entity queued events.
   *
   * @param {Entity} entity
   * @return {Store} this
   * @api private
   */

  emits(entity) {
    entity.queue.splice(0, Infinity)
    .forEach(a => entity.emit(...a));
    return entity;
  }

  /**
   * Recreate entity.
   *
   * @param {Object} id
   * @return {Entity}
   * @api private
   */

  cast(id) {
    return set(new this.Entity, 'id', id);
  }

  /**
   * Method to extend object.
   *
   * @param {Function} fn
   * @param {Object} options
   * @return {Store} this
   * @api public
   */

  use(fn, options) {
    fn(this, options);
  }

}
