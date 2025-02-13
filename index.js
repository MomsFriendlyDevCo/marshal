import {
	cloneDeep as _cloneDeep,
	defaults as _defaults,
	get as _get,
	keys as _keys,
	isObject as _isObject,
	mapKeys as _mapKeys,
	set as _set,
} from 'lodash-es';
import {keyArrangeDeep} from 'lodash-keyarrange';

import modDate from '#modules/date';
import modFunction from '#modules/function';
import modInfinity from '#modules/infinity';
import modNan from '#modules/nan';
import modRegExp from '#modules/regexp';
import modSet from '#modules/set';
import modUndefined from '#modules/undefined';

let marshal = {
	settings: {
		stringify: true,
		destringify: true,
		clone: false,
		depth: 0,
		modules: [
			modDate,
			modFunction,
			modInfinity,
			modNan,
			modRegExp,
			modSet,
			modUndefined,
		],
		circular: true,
		symetric: false,
	},

	loadedModules: {},


	/**
	* Load the given module into memory if we don't already have it
	* @param {array <string>|array <Object>} modules The modules to load, each can be a short string (impliying a built-in module), a path to a module or an object. All must provide a basic module structure
	* @returns {array} Array of modules used in this session
	*/
	loadModules(modules) {
		return modules.map(module => {
			if (_isObject(module)) { // Assume its a compatible module
				if (!module.id) throw new Error('Provided custom module does not expose an `id` property');
				return marshal.loadedModules[module.id] = module;
			} else {
				throw new Error('Unknown module type');
			}
		});
	},

	serialize(data, options) {
		let settings = _defaults(options, marshal.settings);
		let modules = marshal.loadModules(settings.modules);

		let tree =
			settings.symetric ? keyArrangeDeep(data)
			: settings.clone ? _cloneDeep(data)
			: data;

		let seen = new Map();

		let traverse = (node, path) => {
			let isObject = _isObject(node);
			if (isObject && settings.circular) {
				let foundExisting = seen.get(node);
				if (foundExisting) {
					return _set(tree, path, {_: '~circular', p: foundExisting.join('.')});
				} else {
					seen.set(node, path);
				}
			}

			let encoder = modules.find(m => m.test(node));
			let isDeep = (!settings.depth || path.length < settings.depth) && isObject;

			if (encoder) {
				let result = encoder.serialize(node);
				if (encoder.recursive && isDeep) {
					let keys = _keys(node);
					if (settings.symetric) keys.sort();
					_set(tree, path, result);
					keys.forEach(k => traverse(node[k], path.concat(k)));
				} else if (path.length) {
					_set(tree, path, result);
				} else {
					tree = result;
				}
			} else if (isDeep) {
				let keys = _keys(node);
				if (settings.symetric) keys.sort();
				keys.forEach(k => traverse(node[k], path.concat(k)));
			}
		};

		traverse(tree, []);

		return settings.stringify ? JSON.stringify(tree): tree;
	},

	deserialize(data, options) {
		let settings = _defaults(options, marshal.settings);
		let modules = marshal.loadModules(settings.modules);
		let modulesByID = _mapKeys(modules, 'id');

		let tree = settings.destringify ? JSON.parse(data)
			: settings.clone ? _cloneDeep(data)
			: data;

		let traverse = (node, path) => {
			if (_isObject(node) && node._ && node._.startsWith('~') && modulesByID[node._]) {
				let result = modulesByID[node._].deserialize(node);
				if (path.length) {
					if (modulesByID[node._].recursive && _isObject(result)) { // If we got back an object should we recurse into it?
						_set(tree, path, result);
						_keys(result).forEach(k =>
							traverse(node[k], [...path, k])
						);
					} else { // Simple object return (or we're not recursing)
						_set(tree, path, result);
					}
				} else {
					tree = result;
				}
			} else if (settings.circular && _isObject(node) && node._ && node._ == '~circular') {
				_set(tree, path, _get(tree, node.p));
			} else if ((!settings.depth || path.length < settings.depth) && _isObject(node)) {
				_keys(node).forEach(k => traverse(node[k], path.concat(k)));
			}
		};

		traverse(tree, []);

		return tree;
	},
};

export default marshal;
