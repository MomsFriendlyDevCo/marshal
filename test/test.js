import {times, random, sampleSize} from 'lodash-es';
import {expect} from 'chai';
import marshal from '../index.js';

describe('Simple type marshaling', function() {
	[
		{name: 'arrays (flat)', value: ()=> times(100, ()=> (10000, 99999))},
		{name: 'arrays (nested)', value: ()=> times(100, ()=> (1000, 9999)).map(()=> times(10, ()=> (10000, 99999)))},
		{name: 'boolean (false)', value: ()=> false},
		{name: 'boolean (true)', value: ()=> true},
		{name: 'dates', value: ()=> new Date(Date.now() + (Math.random() * 10000))},
		{name: 'function', value: ()=> ({func: ()=> console.log('Hello World')}), test: (a, b) => a.toString() == b.toString()},
		{name: 'infinity', value: ()=> Infinity},
		{name: '-infinity', value: ()=> -Infinity},
		{name: 'numbers', value: ()=> (10000, 99999)},
		{name: 'numbers (negative)', value: ()=> 0 - (10000, 99999)},
		{name: 'objects (key/val)', value: ()=> ({foo: (10000, 99999), bar: (10000, 99999), baz: (10000, 99999)})},
		{name: 'regex', value: ()=> /something.*/},
		{name: 'sets', value: ()=> new Set([1, 2, 3])},
		{name: 'strings', value: ()=> 'Hello World-'  + (10000, 99999)},
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

describe('Custom modules', ()=> {

	it('should support overriding array output', ()=> {
		var sampleObject = {
			foo: [1, 2, 3],
			bar: [[1, 1, 1], [2, 2, 2], [3, 3, 3]],
			baz: {flarp: [{florp: [4, 5, 6]}]},
		};

		let modArrayFlatten = { // Custom Array -> Object converter
			id: `~array`,
			recursive: true,
			test: v => Array.isArray(v),
			serialize: v => ({_: '~array', ...v}),
			deserialize: v => Object.entries(v)
				.filter(([k]) => k !== '_')
				.map(([, v]) => v),
		};

		var serialized = marshal.serialize(sampleObject, {
			clone: true,
			modules: [
				...marshal.settings.modules, // Normal converters
				modArrayFlatten,
			],
			stringify: false,
		});
		expect(serialized).to.be.an('object');

		expect(serialized).to.deep.equal({
			foo: {_: '~array', 0: 1, 1: 2, 2: 3},
			bar: {
				_: '~array',
				0: {_: '~array', 0: 1, 1: 1, 2: 1},
				1: {_: '~array', 0: 2, 1: 2, 2: 2},
				2: {_: '~array', 0: 3, 1: 3, 2: 3},
			},
			baz: {
				flarp: {
					_: '~array',
					0: {
						florp: {_: '~array', 0: 4, 1: 5, 2: 6},
					},
				},
			},
		});

		var deserialized = marshal.deserialize(serialized, {
			modules: [
				...marshal.settings.modules, // Normal converters
				modArrayFlatten,
			],
			destringify: false,
		});
		expect(deserialized).to.deep.equal(sampleObject, 'convert back to source');
	});

});

describe('Complex combined types', ()=> {

	it('should marshal various types', ()=> {
		var sampleObject = {
			arrays: [[1, 2, 3], [], [[[]]], [-10, 'Hello', Infinity]],
			booleans: [true, false],
			dates: [new Date(), new Date(Date.now() + (100000, 999999)), new Date(Date.now() - (100000, 999999))],
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
				barFoo: (10000, 99999),
				barBar: 'String-' + (10000, 99999),
				barBaz: (1) ? true : false,
			},
			baz: {
				bazFoo: {
					bazFooFoo: 'hello',
					bazFooBar: times(100, ()=> (10000, 99999)),
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
		var items = times(10, x => ({title: x}));
		items.forEach(item => item.children = sampleSize(items, items.length));

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
