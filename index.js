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
    if (res === undefined || res.key === undefined) return next()
    var key = Buffer(res.key).toString('hex') + '!' + row.key
    self.xdb.put(key, res.value, next)
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
