# event-store-mongo

[![Build Status](https://travis-ci.org/cayasso/event-store-mongo.png?branch=master)](https://travis-ci.org/cayasso/event-store-mongo)
[![NPM version](https://badge.fury.io/js/event-store-mongo.png)](http://badge.fury.io/js/event-store-mongo)

Mongo store for storing [event-store-entity](https://github.com/cayasso/event-store-entity) entities.

## Instalation

``` bash
$ npm install event-store
```

## Usage

```js
import Entity from 'event-store-entity';
import Store from 'event-store-mongo';

class Order extends Entity {
  constructor(id) {
    super();
    this.id = id;
  }
}

class OrderStore extends Store {
  constructor(Entity, options) {
    super(Entity, options);
  }
}

const order = new Order('abc123');
const orderStore = new OrderStore(Order);

// later in the code after calling order methods
orderStore.commit(order, (err, order) => {
  console.log(order.id); //=> abc123
});

// and then later
orderStore.get('abc123', (err, order) => {
  console.log(order.id); //=> abc123
});
```

## API

### Store()

Abstract class for extending and creating new store classes.

```js
import Store from 'event-store-mongo';

class class OrderStore extends Store {
  constructor(Entity, options) {
    super(Entity, options);
  }
}
```

### store.get(id, fn)

Get one or multiple entities by `id` from MongoDB.

```js
store.get('abc123', (err, entity) => {
  console.log(entity.id); //=> abc123
});

// or

store.get(['abc123', 'abc124', 'abc125'], (err, entities) => {
  console.log(entities.map(e => e.id)); //=> ['abc123', 'abc124', 'abc125']
});
```

### store.commit(entity, fn)

Commit a single or multiple entities to MongoDB.

```js
store.commit(order, (err, entity) => {
  console.log(entity.id); //=> abc123
});

// or

store.get([order1, order2, order3], (err, entities) => {
  console.log(entities.map(e => e.id)); //=> ['abc123', 'abc124', 'abc125']
});
```

## Run tests

```bash
$ make test
```

## Credits

This library was inspired by the [sourced](https://github.com/mateodelnorte/sourced) and [sourced-repo-mongo](https://github.com/mateodelnorte/sourced-repo-mongo) projects.

## License

(The MIT License)

Copyright (c) 2016 Jonathan Brumley &lt;cayasso@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
