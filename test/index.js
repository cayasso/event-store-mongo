'use strict';

import should from 'should';
import MongoJS from 'mongojs';
import Entity from 'event-store-entity';
import Store from '../lib/index';

const MONGO_URL = 'mongodb://127.0.0.1:27017/test-event-store';
const db = new MongoJS(MONGO_URL);
const config = { db };

let id = 0;

class TestEntity extends Entity {

  constructor(id) {
    super();
    this.id = id || ++id;
    this.status = 'created';
  }

  init() {
    this.status = 'initiated';
    this.record('init');
    return this;
  }

  start(data) {
    this.status = 'started';
    this.startedBy = data.agent;
    this.record('start', data);
    this.emit('started');
    return this;
  }

  end(data) {
    this.status = 'ended';
    this.endedBy = data.agent;
    this.record('end', data);
    this.enqueue('ended');
    return this;
  }
}

class TestStore extends Store {
  constructor(Entity, options) {
    super(Entity, options);
  }
}

describe('event-store-mongo', function() {

  it('should be a function', () => {
    Store.should.be.a.Function;
  });

  it('should throw error if trying to instantiate directly', function () {
    (function () {
      new Store();
    }).should.throw('Can not instantiate abstract class.');
  });

  it('should throw error if missing entity class', function () {
    (function () {
      new TestStore();
    }).should.throw("Entity class is required.");
  });

  it('should throw error on invalid entity type', function () {
    (function () {
      new TestStore({});
    }).should.throw('The given entity is not a constructor.');
  });

  it('should throw error if no mongodb connection string or object is provided', function () {
    (function () {
      new TestStore(TestEntity);
    }).should.throw(/required MongoStore db instance/);
  });

  it('should have required methods', () => {
    let repository = new TestStore(TestEntity, config);
    repository.get.should.be.a.Function;
    repository.commit.should.be.a.Function;
  });

  it('should commit and get single entity', function (done) {
    let repository = new TestStore(TestEntity, config);
    let t1 = new TestEntity('t1').init();
    repository.commit(t1, (err) => {
      if (err) return done(err);
      return done();
      repository.get('t1', (err, entity) => {
        if (err) return done(err);
        entity.should.be.an.instanceof(Entity);
        t1.id.should.eql(entity.id);
        done();
      });
    });
  })

  it('should commit and get multiple entities', function (done) {
    let repository = new TestStore(TestEntity, config);
    let foo = new TestEntity('foo').init();
    let bar = new TestEntity('bar').init();
    repository.commit([foo, bar], (err, entities) => {
      if (err) return done(err);
      repository.get(['foo', 'bar'], (err, entities) => {
        if (err) return done(err);
        foo.id.should.eql(entities[0].id);
        bar.id.should.eql(entities[1].id);
        done();
      });
    });
  })

  it('should commit and get multiple entities by snapshot', function (done) {
    let repository = new TestStore(TestEntity, config);
    let x = new TestEntity('x').init().start({ agent: 'Martha' });
    let y = new TestEntity('y').init().start({ agent: 'Josh' });
    repository.commit([x, y], { snap: true }, (err, entities) => {
      if (err) return done(err);
      repository.get(['x', 'y'], (err, entities) => {
        if (err) return done(err);
        entities[0].revision.should.eql(2);
        x.id.should.eql(entities[0].id);
        x.startedBy.should.eql(entities[0].startedBy);
        entities[1].revision.should.eql(2);
        y.id.should.eql(entities[1].id);
        y.startedBy.should.eql(entities[1].startedBy);
        done();
      });
    });
  })

  after(function (done) {
    db.dropDatabase(function () {
      db.close(done);
    });
  });

});
