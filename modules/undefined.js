module.exports = {
	id: '~undefined',
	test: v => v === undefined,
	serialize: v => ({_: '~undefined'}),
	deserialize: v => undefined,
};
