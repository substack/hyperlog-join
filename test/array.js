var join = require('../')
var hyperlog = require('hyperlog')
var memdb = require('memdb')
var test = require('tape')

test('array', function (t) {
  t.plan(4)
  var log = hyperlog(memdb(), { valueEncoding: 'json' })
  var j = join({
    log: log,
    db: memdb(),
    map: function (row, cb) {
      var v = row.value
      var ops = []
      if (v.changeset) {
        ops.push({ key: 'changeset!' + v.changeset, value: v.id })
      }
      ops.push({ key: 'type!' + v.type, value: v.id })
      cb(null, ops)
    }
  })
  log.append({ id: 'A', type: 'changeset', tags: { comment: 'whatever' } })
  log.append({ id: 'B', type: 'node', lat: 64.4, lon: -147.3, changeset: 'A' })
  log.append({ id: 'C', type: 'node', lat: 63.9, lon: -147.6, changeset: 'A' })
  log.append({ id: 'D', type: 'changeset', tags: { comment: 'hey' } })
  log.append({ id: 'E', type: 'node', lat: 64.2, lon: -146.5, changeset: 'D' })

  j.list('changeset!A', function (err, nodes) {
    t.ifError(err)
    t.deepEqual(nodes, [
      { key: '022116bee40416e057ed404eae77a998eb8da3a2662e22e2f3f666a558519fb7',
        value: 'C' },
      { key: 'b66ea5345fd95776ddb1e6ae1a6627f0c0c45dff04e9d3b3a8e1ab3d32963d84',
        value: 'B' }
    ], 'callback A')
  })

  j.list('type!node', function (err, nodes) {
    t.ifError(err)
    t.deepEqual(nodes, [
      { key: '022116bee40416e057ed404eae77a998eb8da3a2662e22e2f3f666a558519fb7',
        value: 'C' },
      { key: 'b66ea5345fd95776ddb1e6ae1a6627f0c0c45dff04e9d3b3a8e1ab3d32963d84',
        value: 'B' },
      { key: 'ee8d0c5dd3648aa51ae76e5762c307a78ec9b54aef83cb85ffc2e71aaf3313aa',
        value: 'E' }
    ])
  })
})
