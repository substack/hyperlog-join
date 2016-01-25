var hindex = require('hyperlog-index')
var sub = require('subleveldown')
var through = require('through2')
var readonly = require('read-only-stream')

module.exports = Join

function Join (opts) {
  if (!(this instanceof Join)) return new Join(opts)
  var self = this
  self.map = opts.map
  self.log = opts.log
  self.idb = sub(opts.db, 'i')
  self.xdb = sub(opts.db, 'x', {
    valueEncoding: opts.valueEncoding || opts.log.valueEncoding || 'json'
  })
  self.dex = hindex(self.log, self.idb, function (row, next) {
    if (row.value === undefined) return next()
    var res = self.map(row)
    if (res === undefined || (res.key === undefined && !Array.isArray(res))) {
      return next()
    }
    var batch = ops(Array.isArray(res) ? res : [res])
    self.xdb.batch(batch, next)

    function ops (rows) {
      var batch = rows.map(map)
      var rels = {}
      rows.forEach(function (row) {
        rels[row.key] = true
      })
      Object.keys(rels).forEach(function (key) {
        batch.push({ type: 'put', key: 'r!' + key, value: 0 })
      })
      return batch
    }

    function map (r) {
      if (r.type === 'del') {
        return {
          type: 'del',
          key: 'h!' + Buffer(r.key).toString('hex') + '!' + r.rowKey
        }
      } else {
        return {
          type: 'put',
          key: 'h!' + Buffer(r.key).toString('hex') + '!' + row.key,
          value: r.value
        }
      }
    }
  })
}

Join.prototype.list = function (key, opts, cb) {
  var self = this
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  var rows = cb ? [] : null

  var stream = through.obj(write, end)
  var hkey = 'h!' + Buffer(key).toString('hex')
  self.dex.ready(function () {
    var r = self.xdb.createReadStream({
      gt: hkey + '!',
      lt: hkey + '!~'
    })
    r.on('error', stream.emit.bind(stream, 'error'))
    if (cb) r.once('error', cb)
    r.pipe(stream)
  })
  return readonly(stream)

  function write (row, enc, next) {
    var rec = {
      key: row.key.replace(/^h![^!]+!/,''),
      value: row.value
    }
    if (rows) rows.push(rec)
    next(null, rec)
  }
  function end (next) {
    if (cb) cb(null, rows)
    next()
  }
}

Join.prototype.relations = function (opts) {
  var self = this
  var stream = through.obj(write, end)
  self.dex.ready(function () {
    var r = self.xdb.createReadStream({
      gt: 'r!',
      lt: 'r!~'
    })
    r.on('error', stream.emit.bind(stream, 'error'))
    r.pipe(stream)
  })
  return readonly(stream)

  function write (row, enc, next) {
    next(null, row.key.replace(/^r!/,''))
  }
  function end (next) {
    next()
  }
}
