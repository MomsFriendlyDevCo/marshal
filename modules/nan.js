module.exports = {
	id: '~nan',
	test: v => Number.isNaN(v),
	serialize: v => ({_: '~nan'}),
	deserialize: v => NaN,
};
