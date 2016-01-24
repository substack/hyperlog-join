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
    if (res === undefined
    || (res.key === undefined && !Array.isArray(res))) {
      return next()
    }
    if (Array.isArray(res)) {
      self.xdb.batch(res.map(map), next)
    } else {
      var rec = map(res)
      if (rec.type === 'del') {
        self.xdb.del(rec.key, next)
      } else self.xdb.put(rec.key, rec.value, next)
    }
    function map (r) {
      return {
        type: r.type || 'put',
        key: Buffer(r.key).toString('hex') + '!' + row.key,
        value: r.value
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
  var hkey = Buffer(key).toString('hex')
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
      key: row.key.replace(/^[^!]+!/,''),
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
