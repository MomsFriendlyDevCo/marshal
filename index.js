var _ = require('lodash');
_.mixin(require('lodash-keyarrange'));

var marshal = module.exports = {
	settings: {
		stringify: true,
		destringify: true,
		clone: false,
		depth: 0,
		modules: [
			'date',
			'function',
			'infinity',
			'nan',
			'regexp',
			'set',
			'undefined',
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
	loadModules: function(modules) {
		return modules.map(module => {
			if (_.isString(module) && !/[\/\.]/.test(module)) { // Simple string - assume its located in ./modules
				if (marshal.loadedModules[module]) return marshal.loadedModules[module]; // Already loaded
				var loadedModule = require(`${__dirname}/modules/${module}.js`);
				if (!loadedModule.id) throw new Error('Default module from path does not expose an `id` property');
				marshal.loadedModules[module] = loadedModule;
				return marshal.loadedModules[module];
			} else if (_.isString(module)) { // Assume its a path
				loadedModule = require(module);
				if (!loadedModule.id) throw new Error('Provided custom module from path does not expose an `id` property');
				return marshal.loadedModules[loadedModule.id] = loadedModule;
			} else if (_.isObject(module)) { // Assume its a compatible module
				if (!module.id) throw new Error('Provided custom module does not expose an `id` property');
				return marshal.loadedModules[module.id] = module;
			} else {
				throw new Error('Unknown module type');
			}
		});
	},

	serialize: function(data, options) {
		var settings = _.defaults(options, marshal.settings);
		var modules = marshal.loadModules(settings.modules);

		var tree =
			settings.symetric ? _.keyArrangeDeep(data)
			: settings.clone ? _.cloneDeep(data)
			: data;

		var seen = [];

		var traverse = (node, path) => {
			if (settings.circular) {
				var foundExisting = seen.find(s => s[0] === node);
				if (foundExisting) {
					return _.set(tree, path, {_: '~circular', p: foundExisting[1]});
				} else {
					seen.push([node, path]);
				}
			}

			var encoder = modules.find(m => m.test(node));
			if (encoder) {
				var result = encoder.serialize(node);
				if (path.length) {
					_.set(tree, path, result);
				} else {
					tree = result;
				}
			} else if ((!settings.depth || path.length < settings.depth) && _.isObject(node)) {
				var keys = _.keys(node);
				if (settings.symetric) keys.sort();
				keys.forEach(k => traverse(node[k], path.concat(k)));
			}
		};

		traverse(tree, []);

		return settings.stringify ? JSON.stringify(tree): tree;
	},

	deserialize: function(data, options) {
		var settings = _.defaults(options, marshal.settings);
		var modules = marshal.loadModules(settings.modules);
		var modulesByID = _.mapKeys(modules, 'id');

		var tree = settings.destringify ? JSON.parse(data)
			: settings.clone ? _.cloneDeep(data)
			: data;

		var traverse = (node, path) => {
			if (_.isObject(node) && node._ && node._.startsWith('~') && modulesByID[node._]) {
				var result = modulesByID[node._].deserialize(node);
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
