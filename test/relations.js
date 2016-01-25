var join = require('../')
var hyperlog = require('hyperlog')
var memdb = require('memdb')
var test = require('tape')

test('relations', function (t) {
  t.plan(4)
  var log = hyperlog(memdb(), { valueEncoding: 'json' })
  var j = join({
    log: log,
    db: memdb(),
    map: function (row) {
      var v = row.value
      if (v.changeset) return { key: v.changeset, value: v.id }
    }
  })
  log.append({ id: 'A', type: 'changeset', tags: { comment: 'whatever' } })
  log.append({ id: 'B', type: 'node', lat: 64.4, lon: -147.3, changeset: 'A' })
  log.append({ id: 'C', type: 'node', lat: 63.9, lon: -147.6, changeset: 'A' })
  log.append({ id: 'D', type: 'changeset', tags: { comment: 'hey' } })
  log.append({ id: 'E', type: 'node', lat: 64.2, lon: -146.5, changeset: 'D' })

  var expected0 = [ 'A', 'D' ]
  j.relations()
    .on('data', function (row) {
      t.deepEqual(row, expected0.shift())
    })

  var expected1 = [ 'D' ]
  j.relations({ gt: 'A' })
    .on('data', function (row) {
      t.deepEqual(row, expected1.shift())
    })

  var expected2 = [ 'A' ]
  j.relations({ lt: 'C' })
    .on('data', function (row) {
      t.deepEqual(row, expected2.shift())
    })
})
