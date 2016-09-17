'use strict';

const processFn = (fn, opts) => function () {
	const that = this;
	const P = opts.promiseModule;
	const args = new Array(arguments.length);

	for (let i = 0; i < arguments.length; i++) {
		args[i] = arguments[i];
	}

	return new P((resolve, reject) => {
		args.push(function (err, result) {
			if (err) {
				reject(err);
			} else if (opts.multiArgs) {
				const results = new Array(arguments.length - 1);

				for (let i = 1; i < arguments.length; i++) {
					results[i - 1] = arguments[i];
				}

				resolve(results);
			} else {
				resolve(result);
			}
		});

		fn.apply(that, args);
	});
};

module.exports = (obj, opts) => {
	opts = Object.assign({
		exclude: [/.+Sync$/],
		promiseModule: Promise
	}, opts);

	const filter = key => {
		const match = pattern => typeof pattern === 'string' ? key === pattern : pattern.test(key);
		return opts.include ? opts.include.some(match) : !opts.exclude.some(match);
	};

	const cache = new Map();
	const main = Symbol('main');

	return new Proxy(obj, {
		apply: (target, thisArg, argumentsList) => {
			let cached = cache.get(main);

			if (!cached) {
				cached = opts.excludeMain ? target : processFn(target, opts);
				cache.set(main, cached);
			}

			return cached.apply(thisArg, argumentsList);
		},
		get: (target, key) => {
			let cached = cache.get(key);

			if (!cached) {
				const x = target[key];

				cached = typeof x === 'function' && filter(key) ? processFn(x, opts) : x;
				cache.set(key, cached);
			}

			return cached;
		}
	});
};
