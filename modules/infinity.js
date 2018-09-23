module.exports = {
	id: '~infinity',
	test: v => v === Infinity || v === -Infinity,
	serialize: v => ({_: '~infinity', v: v === Infinity ? 1 : 0}),
	deserialize: v => v.v == 1 ? Infinity : -Infinity,
};
