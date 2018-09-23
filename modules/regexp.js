module.exports = {
	id: '~regexp',
	test: v => v instanceof RegExp,
	serialize: v => ({_: '~regexp', v: v.toString(), f: v.flags}),
	deserialize: v => new RegExp(v.v.replace(/^\//, '').replace(/\/$/, ''), v.f),
};
