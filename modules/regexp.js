module.exports = {
	id: '~regexp',
	test: v => v instanceof RegExp,
	serialize: v => ({_: '~regexp', v: v.source, f: v.flags}),
	deserialize: v => new RegExp(v.v, v.f),
};
