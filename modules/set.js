module.exports = {
	id: '~set',
	test: v => v instanceof Set,
	serialize: v => ({_: '~set', v: Array.from(v)}),
	deserialize: v => new Set(v.v),
};
