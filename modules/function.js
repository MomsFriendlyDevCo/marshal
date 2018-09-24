module.exports = {
	id: '~function',
	test: v => typeof v == 'function',
	serialize: v => ({_: '~function', v: v.toString()}),
	deserialize: v => eval(v.v.toString()),
};
