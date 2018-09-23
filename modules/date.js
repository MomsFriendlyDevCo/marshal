module.exports = {
	id: '~date',
	test: v => v instanceof Date,
	serialize: v => ({_: '~date', v: v.toISOString()}),
	deserialize: v => new Date(v.v),
};
