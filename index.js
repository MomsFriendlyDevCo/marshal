import _ from 'lodash';
import _keyArrange from 'lodash-keyarrange';
_.mixin(_keyArrange);

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
			if (_.isObject(module)) { // Assume its a compatible module
				if (!module.id) throw new Error('Provided custom module does not expose an `id` property');
				return marshal.loadedModules[module.id] = module;
			} else {
				throw new Error('Unknown module type');
			}
		});
	},

	serialize(data, options) {
		let settings = _.defaults(options, marshal.settings);
		let modules = marshal.loadModules(settings.modules);

		let tree =
			settings.symetric ? _.keyArrangeDeep(data)
			: settings.clone ? _.cloneDeep(data)
			: data;

		let seen = [];

		let traverse = (node, path) => {
			if (settings.circular) {
				let foundExisting = seen.find(s => s[0] === node);
				if (foundExisting) {
					return _.set(tree, path, {_: '~circular', p: foundExisting[1]});
				} else {
					seen.push([node, path]);
				}
			}

			let encoder = modules.find(m => m.test(node));
			if (encoder) {
				let result = encoder.serialize(node);
				if (path.length) {
					_.set(tree, path, result);
				} else {
					tree = result;
				}
			} else if ((!settings.depth || path.length < settings.depth) && _.isObject(node)) {
				let keys = _.keys(node);
				if (settings.symetric) keys.sort();
				keys.forEach(k => traverse(node[k], path.concat(k)));
			}
		};

		traverse(tree, []);

		return settings.stringify ? JSON.stringify(tree): tree;
	},

	deserialize(data, options) {
		let settings = _.defaults(options, marshal.settings);
		let modules = marshal.loadModules(settings.modules);
		let modulesByID = _.mapKeys(modules, 'id');

		let tree = settings.destringify ? JSON.parse(data)
			: settings.clone ? _.cloneDeep(data)
			: data;

		let traverse = (node, path) => {
			if (_.isObject(node) && node._ && node._.startsWith('~') && modulesByID[node._]) {
				let result = modulesByID[node._].deserialize(node);
				if (path.length) {
					_.set(tree, path, result);
				} else {
					tree = result;
				}
			} else if (settings.circular && _.isObject(node) && node._ && node._ == '~circular') {
				_.set(tree, path, _.get(tree, node.p));
			} else if ((!settings.depth || path.length < settings.depth) && _.isObject(node)) {
				_.keys(node).forEach(k => traverse(node[k], path.concat(k)));
			}
		};

		traverse(tree, []);

		return tree;
	},
};

export default marshal;
