var _ = require('lodash');
var traverse = require('traverse');

var marshal = module.exports = {
	settings: {
		asJSON: true,
		modules: [
			'date',
			'function',
			'infinity',
			'nan',
			'regexp',
			'undefined',
		],
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
				return marhsal.loadedModules[module.id] = module;
			} else {
				throw new Error('Unknown module type');
			}
		});
	},

	serialize: function(data, options) {
		var settings = _.defaults(options, marshal.settings);
		var modules = marshal.loadModules(settings.modules);

		var wrapped = traverse(data).map(function(node) {
			var encoder = modules.find(m => m.test(node));
			if (encoder) {
				this.update(encoder.serialize(node), true);
			}
		});

		return settings.asJSON ? JSON.stringify(wrapped): wrapped;
	},

	deserialize: function(data, options) {
		var settings = _.defaults(options, marshal.settings);
		var modules = marshal.loadModules(settings.modules);
		var modulesByID = _.mapKeys(modules, 'id');

		var parsed = JSON.parse(data);

		return traverse(parsed).map(function(node) {
			if (_.isObject(node) && node._ && node._.startsWith('~') && modulesByID[node._]) {
				this.update(modulesByID[node._].deserialize(node), true);
			}
		})
	},
};
