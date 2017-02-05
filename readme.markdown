# hyperlog-join

relational joins over a hyperlog

# example

In this example, we can associate a `changeset` foreign key with changeset
documents.

``` js
var join = require('hyperlog-join')
var hyperlog = require('hyperlog')
var memdb = require('memdb')

var log = hyperlog(memdb(), { valueEncoding: 'json' })
var j = join({
  log: log,
  db: memdb(),
  map: function (row, cb) {
    var v = row.value
    if (v.changeset) cb(null, { key: v.changeset, value: v.id })
    else cb()
  }
})

log.append({ id: 'A', type: 'changeset', tags: { comment: 'whatever' } })
log.append({ id: 'B', type: 'node', lat: 64.4, lon: -147.3, changeset: 'A' })
log.append({ id: 'C', type: 'node', lat: 63.9, lon: -147.6, changeset: 'A' })
log.append({ id: 'D', type: 'changeset', tags: { comment: 'hey' } })
log.append({ id: 'E', type: 'node', lat: 64.2, lon: -146.5, changeset: 'D' })

j.list('A', function (err, nodes) {
  console.log(nodes)
})
```

output:

```
[ { key: '022116bee40416e057ed404eae77a998eb8da3a2662e22e2f3f666a558519fb7',
    value: 'C' },
  { key: 'b66ea5345fd95776ddb1e6ae1a6627f0c0c45dff04e9d3b3a8e1ab3d32963d84',
    value: 'B' } ]
```

# api

``` js
var join = require('hyperlog-join')
```

## var j = join(opts)

* `opts.log` - hyperlog instance
* `opts.db` - levelup handle
* `opts.map(row, cb)` - async mapping function to join elements with a foreign key

The mapping function accepts a `row` argument from the hyperlog and should
return a single object with `key` and `value` properties or an array of
`key`/`value` objects into the callback `cb(err, res)`.

To delete relations, the mapping function should return an object with
`type='del'`, a `key` specifying the foreign key as in the put case, and a
`rowKey` of the hyperlog key for the row that inserted the original relation.

## var stream = j.list(key, cb)

Look up a list of values from the mapping function by their `key`.

This function returns a readable object stream of results or you can collect the
results with the `cb(err, nodes)` callback. Each object in the results has the
`key` of the original hyperlog document and the `value` set in the mapping
function.

## var stream = j.relations(opts)

Return a readable stream of existing relations, the foreign keys set by
`row.key` in the mapping function.

These results can be filtered according to leveldb range options: `opts.lt`,
`opts.gt`, `opts.lte`, and `opts.gte` and limited in quantity with
`opts.limit`.

## j.on('error', function (err) {})

Handle errors from the underlying [hyperlog-index][1] with the `'error'` event.

[1]: https://npmjs.com/package/hyperlog-index

# install

```
npm install hyperlog-join
```

# license

BSD
