var _ = require('lodash');
var expect = require('chai').expect;
var marshal = require('..');

describe('Simple type marshaling', function() {
	[
		{name: 'arrays (flat)', value: ()=> _.times(100, ()=> _.random(10000, 99999))},
		{name: 'arrays (nested)', value: ()=> _.times(100, ()=> _.random(1000, 9999)).map(i => _.times(10, ()=> _.random(10000, 99999)))},
		{name: 'boolean (false)', value: ()=> false},
		{name: 'boolean (true)', value: ()=> true},
		{name: 'dates', value: ()=> new Date(Date.now() + (Math.random() * 10000))},
		{name: 'function', value: ()=> ({func: ()=> console.log('Hello World')}), test: (a, b) => a.toString() == b.toString()},
		{name: 'infinity', value: ()=> Infinity},
		{name: '-infinity', value: ()=> -Infinity},
		{name: 'numbers', value: ()=> _.random(10000, 99999)},
		{name: 'numbers (negative)', value: ()=> 0 - _.random(10000, 99999)},
		{name: 'objects (key/val)', value: ()=> ({foo: _.random(10000, 99999), bar: _.random(10000, 99999), baz: _.random(10000, 99999)})},
		{name: 'regex', value: ()=> /something.*/},
		{name: 'sets', value: ()=> new Set([1, 2, 3])},
		{name: 'strings', value: ()=> 'Hello World-'  + _.random(10000, 99999)},
	].forEach(t => {

		it(t.name, ()=> {
			var sampleValue = t.value();
			var serialized = marshal.serialize(sampleValue, {clone: true});
			expect(serialized).to.be.a('string');

			var deserialized = marshal.deserialize(serialized);
			if (t.test) {
				expect(t.test(sampleValue, deserialized)).to.be.true;
			} else {
				expect(deserialized).to.deep.equal(sampleValue);
			}
		});

	});
});

describe('Complex combined types', done => {

	it('should marshal various types', ()=> {
		var sampleObject = {
			arrays: [[1, 2, 3], [], [[[]]], [-10, 'Hello', Infinity]],
			booleans: [true, false],
			dates: [new Date(), new Date(Date.now() + _.random(100000, 999999)), new Date(Date.now() - _.random(100000, 999999))],
			// Functions never compare directly in Mocha for some reason
			//functions: [()=> false, arg => console.log(arg), (a, b, c) => a + b / c],
			nullables: [null, undefined],
			numbers: [0, 123, NaN, Infinity, -Infinity, -5, 928, 312312.312312],
			objects: [{foo: 1, bar: 2, baz: {bazFoo: 3}}, {}, {subKey: [1, 2, {}]}],
			regex: [/./, /^start/, /end$/, /global/g, /multi-global/mg],
			sets: [new Set([1, 2, 3, 10]), new Set()],
			strings: ['', 'a', 'Hello World', '😈🙓😿'],
		};

		var serialized = marshal.serialize(sampleObject, {clone: true});
		expect(serialized).to.be.a('string');

		var deserialized = marshal.deserialize(serialized);
		expect(deserialized).to.deep.equal(sampleObject);
	});

	it('should marshal nested objects', ()=> {
		var sampleObject = {
			foo: 'Foo',
			bar: {
				barFoo: _.random(10000, 99999),
				barBar: 'String-' + _.random(10000, 99999),
				barBaz: _.random(1) ? true : false,
			},
			baz: {
				bazFoo: {
					bazFooFoo: 'hello',
					bazFooBar: _.times(100, ()=> _.random(10000, 99999)),
					bazFooBaz: {
						bazFooBazFoo: {
							bazFooBazFooFoo: 123,
							bazFooBazFooBar: [1, 2, 3],
						},
					},
				},
			},
		};

		var serialized = marshal.serialize(sampleObject, {clone: true});
		expect(serialized).to.be.a('string');

		var deserialized = marshal.deserialize(serialized);
		expect(deserialized).to.deep.equal(sampleObject);
	});

	it('should marshal circular data types #1', ()=> {
		var foo = {title: 'foo', child: undefined};
		var bar = {title: 'baz', child: foo};
		foo.child = bar;

		var sampleObject = {root: foo};

		var serialized = marshal.serialize(sampleObject, {clone: true});
		expect(serialized).to.be.a('string');

		var deserialized = marshal.deserialize(serialized);
		expect(deserialized).to.deep.equal(sampleObject);
	});

	it('should marshal circular data types #2', ()=> {
		var items = _.times(10, x => ({title: x}));
		items.forEach(item => item.children = _.sampleSize(items, items.length));

		var sampleObject = {items: [{children: items}]};

		var serialized = marshal.serialize(sampleObject, {clone: true});
		expect(serialized).to.be.a('string');

		var deserialized = marshal.deserialize(serialized);
		expect(deserialized).to.deep.equal(sampleObject);
	});
});

describe('Symetrical encoding', ()=> {

	it('should marshal objects symetrically', ()=> {
		expect(marshal.serialize({one: 1, two: 2})).to.not.equal(marshal.serialize({two: 2, one: 1}));
		expect(marshal.serialize({one: 1, two: 2}, {symetric: true})).to.equal(marshal.serialize({two: 2, one: 1}, {symetric: true}));
	});

});
