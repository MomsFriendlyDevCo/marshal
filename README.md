@momsfriendlydevco/marshal
==========================
A simple marshaling serializer for modern JavaScript primitives.

**Features**:

* Will attempt to serialize all known JS primitive types (dates, NaN, sets, undefined etc.)
* Can serialize / deserialize circular structures
* Simple serialize / deserialize usage
* Extremely fast - uses its own traversal system rather than a 3rd party NPM library
* Low dependency count - only Lodash is needed


```javascript
var marshal = require('@momsfriendlydevco/marshal');

var serializedString = marshal.serialize({... some complex object ...});

var deserializedObject = marshal.deserialize(serializedString);
```

See the [testkit](./test) for more complex examples.


API
===

marshal.serialize(Object, [Settings])
-------------------------------------
The object or primitive to transform into a string.
Settings are inherited from the main `marshal.settings` structure or overridden by any settings passed in here.


marshal.deserialize(String, [Settings])
---------------------------------------
Transform a serialized string back into a native JS object.
Settings are inherited from the main `marshal.settings` structure or overridden by any settings passed in here.


marshal.settings
----------------
The objects to use when operating.

| Option        | Type      | Default                  | Description                                                                                                            |
|---------------|-----------|--------------------------|------------------------------------------------------------------------------------------------------------------------|
| `clone`       | `Boolean` | `false`                  | Clone the input to the serialize / deserialize functions before operating. Adds overhead but will not mutate the input |
| `circular`    | `Boolean` | `true`                   | Detect and manage circular references, if you know the input / output object cannot be circular there is a speed bonus to disabling this |
| `symetric`    | `Boolean` | `false`                  | Encode objects symetrically - i.e. reorder keys so that they can be consistantly hashed                                |
| `depth`       | `Number`  | `0`                      | The maximum depth to traverse into when operating. If zero this is infinite                                            |
| `modules`     | `Array`   | [All modules](./modules) | Which modules to use when operating (see notes below)                                                                  |
| `stringify`   | `Boolean` | `true`                   | Whether to transform the mutated object in `marshal.serialize()` into a string                                         |
| `destringify` | `Boolean` | `true`                   | Assume that input to `marshal.deserialize()` is a string which needs transforming first                                |


**NOTES:**

* Modules can be specified as simple strings (e.g. 'date') which assumes they are built in modules [provided with the NPM](./modules), if this is a path that path is automatically included. If this is an object it is assumed to be an already compatible module
* All modules must expose a `id`, `test`, `serialize` and `deserialize` properties
