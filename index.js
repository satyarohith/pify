'use strict';

const processFn = (fn, opts) => (that, args) => {
	const P = opts.promiseModule;

	// TODO: no idea why this is needed
	args = args || [];

	return new P((resolve, reject) => {
		args.push((err, result, ...additionalArgs) => {
			if (err) {
				reject(err);
			} else if (opts.multiArgs) {
				resolve([result, ...additionalArgs]);
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
			if (opts.excludeMain) {
				return Reflect.apply(target, thisArg, argumentsList);
			}

			let cached = cache.get(main);

			if (!cached) {
				cached = processFn(target, opts);
				cache.set(main, cached);
			}

			return cached(thisArg, argumentsList);
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
