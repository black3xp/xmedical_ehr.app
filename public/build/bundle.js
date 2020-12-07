
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {function(): Promise<SvelteComponent>} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {Object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {Object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {Object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.29.0 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (209:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(209:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (202:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(202:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap$1(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn("Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading");

    	return wrap({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    	try {
    		window.history.replaceState(undefined, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event("hashchange"));
    }

    function link(node, hrefVar) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, hrefVar || node.getAttribute("href"));

    	return {
    		update(updated) {
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, href) {
    	// Destination must start with '/'
    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute: " + href);
    	}

    	// Add # to the href attribute
    	node.setAttribute("href", "#" + href);

    	node.addEventListener("click", scrollstateHistoryHandler);
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {HTMLElementEventMap} event - an onclick event attached to an anchor tag
     */
    function scrollstateHistoryHandler(event) {
    	// Prevent default anchor onclick behaviour
    	event.preventDefault();

    	const href = event.currentTarget.getAttribute("href");

    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix) {
    				if (typeof prefix == "string" && path.startsWith(prefix)) {
    					path = path.substr(prefix.length) || "/";
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || "/";
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || "") || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {Object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	if (restoreScrollState) {
    		window.addEventListener("popstate", event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		});

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.scrollX, previousScrollState.scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick("conditionsFailed", detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoading", Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == "object" && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    	});

    	const writable_props = ["routes", "prefix", "restoreScrollState"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble($$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		tick,
    		_wrap: wrap,
    		wrap: wrap$1,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		scrollstateHistoryHandler,
    		createEventDispatcher,
    		afterUpdate,
    		regexparam,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		lastLoc,
    		componentObj
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("previousScrollState" in $$props) previousScrollState = $$props.previousScrollState;
    		if ("lastLoc" in $$props) lastLoc = $$props.lastLoc;
    		if ("componentObj" in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			 history.scrollRestoration = restoreScrollState ? "manual" : "auto";
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\componentes\OpcionMenu.svelte generated by Svelte v3.29.0 */
    const file = "src\\componentes\\OpcionMenu.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (11:0) {#each opciones as opcion}
    function create_each_block(ctx) {
    	let div2;
    	let a;
    	let div0;
    	let i;
    	let i_class_value;
    	let t0;
    	let div1;
    	let p;
    	let t1_value = /*opcion*/ ctx[1].nombre + "";
    	let t1;
    	let t2;
    	let small;
    	let t3_value = /*opcion*/ ctx[1].descripcion + "";
    	let t3;
    	let a_href_value;
    	let link_action;
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			a = element("a");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			small = element("small");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*opcion*/ ctx[1].icono) + " svelte-1dowx5r"));
    			add_location(i, file, 14, 12, 371);
    			attr_dev(div0, "class", "icono");
    			add_location(div0, file, 13, 8, 338);
    			add_location(p, file, 17, 8, 458);
    			add_location(small, file, 18, 12, 494);
    			attr_dev(div1, "class", "info-menu");
    			add_location(div1, file, 16, 8, 425);
    			attr_dev(a, "href", a_href_value = /*opcion*/ ctx[1].url);
    			set_style(a, "display", "block");
    			add_location(a, file, 12, 8, 276);
    			attr_dev(div2, "class", "col-md-4 col-lg-3 p-3 hvr-underline-from-left svelte-1dowx5r");
    			add_location(div2, file, 11, 4, 207);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, a);
    			append_dev(a, div0);
    			append_dev(div0, i);
    			append_dev(a, t0);
    			append_dev(a, div1);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div1, t2);
    			append_dev(div1, small);
    			append_dev(small, t3);
    			append_dev(div2, t4);

    			if (!mounted) {
    				dispose = action_destroyer(link_action = link.call(null, a));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*opciones*/ 1 && i_class_value !== (i_class_value = "" + (null_to_empty(/*opcion*/ ctx[1].icono) + " svelte-1dowx5r"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (dirty & /*opciones*/ 1 && t1_value !== (t1_value = /*opcion*/ ctx[1].nombre + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*opciones*/ 1 && t3_value !== (t3_value = /*opcion*/ ctx[1].descripcion + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*opciones*/ 1 && a_href_value !== (a_href_value = /*opcion*/ ctx[1].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:0) {#each opciones as opcion}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*opciones*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*opciones*/ 1) {
    				each_value = /*opciones*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("OpcionMenu", slots, []);
    	let { opciones = [] } = $$props;

    	onMount(() => {
    		
    	});

    	const writable_props = ["opciones"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<OpcionMenu> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("opciones" in $$props) $$invalidate(0, opciones = $$props.opciones);
    	};

    	$$self.$capture_state = () => ({ onMount, link, opciones });

    	$$self.$inject_state = $$props => {
    		if ("opciones" in $$props) $$invalidate(0, opciones = $$props.opciones);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [opciones];
    }

    class OpcionMenu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { opciones: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OpcionMenu",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get opciones() {
    		throw new Error("<OpcionMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set opciones(value) {
    		throw new Error("<OpcionMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Pages\Home\Index.svelte generated by Svelte v3.29.0 */
    const file$1 = "src\\Pages\\Home\\Index.svelte";

    function create_fragment$2(ctx) {
    	let div3;
    	let h1;
    	let t1;
    	let div2;
    	let div1;
    	let div0;
    	let opcionesmenu;
    	let current;

    	opcionesmenu = new OpcionMenu({
    			props: { opciones: /*opciones*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Menus";
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			create_component(opcionesmenu.$$.fragment);
    			attr_dev(h1, "class", "text-center");
    			add_location(h1, file$1, 30, 2, 908);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$1, 33, 6, 1002);
    			attr_dev(div1, "class", "col-12 mt-4");
    			add_location(div1, file$1, 32, 4, 969);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$1, 31, 2, 946);
    			attr_dev(div3, "class", "menu mt-5 svelte-1tw44i");
    			add_location(div3, file$1, 29, 0, 881);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			mount_component(opcionesmenu, div0, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(opcionesmenu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(opcionesmenu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(opcionesmenu);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Index", slots, []);

    	let opciones = [
    		{
    			nombre: "Atencion medica",
    			icono: "mdi mdi-folder-account",
    			url: "/AtencionMedica/Atenciones",
    			descripcion: "Hospitalizaciones, Emergencias, etc."
    		},
    		{
    			nombre: "Pacientes",
    			icono: "mdi mdi-account-circle-outline",
    			url: "/Paciente/Index",
    			descripcion: "Configuracion de las diferentes opciones"
    		},
    		{
    			nombre: "Enfermería",
    			icono: "mdi mdi-doctor",
    			url: "/Paciente/Index",
    			descripcion: "Aplicaciones, Signos vitales, etc."
    		},
    		{
    			nombre: "Administracion",
    			icono: "mdi mdi-settings",
    			url: "/Usuario/Index",
    			descripcion: "Configuracion de las diferentes opciones"
    		}
    	];

    	onMount(() => {
    		
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, OpcionesMenu: OpcionMenu, opciones });

    	$$self.$inject_state = $$props => {
    		if ("opciones" in $$props) $$invalidate(0, opciones = $$props.opciones);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [opciones];
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Layout\Header.svelte generated by Svelte v3.29.0 */

    const file$2 = "src\\Layout\\Header.svelte";

    function create_fragment$3(ctx) {
    	let header;
    	let a0;
    	let t0;
    	let nav;
    	let ul;
    	let li0;
    	let div10;
    	let a1;
    	let i0;
    	let t1;
    	let span0;
    	let t2;
    	let div9;
    	let div0;
    	let a2;
    	let t3;
    	let span1;
    	let t5;
    	let a3;
    	let t6;
    	let div8;
    	let div1;
    	let t8;
    	let a4;
    	let div3;
    	let div2;
    	let i1;
    	let t9;
    	let t10;
    	let a5;
    	let div5;
    	let div4;
    	let i2;
    	let t11;
    	let t12;
    	let a6;
    	let div7;
    	let div6;
    	let i3;
    	let t13;
    	let t14;
    	let li1;
    	let a7;
    	let div11;
    	let span2;
    	let t16;
    	let div13;
    	let a8;
    	let t18;
    	let a9;
    	let t20;
    	let a10;
    	let t22;
    	let div12;
    	let t23;
    	let a11;

    	const block = {
    		c: function create() {
    			header = element("header");
    			a0 = element("a");
    			t0 = space();
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			div10 = element("div");
    			a1 = element("a");
    			i0 = element("i");
    			t1 = space();
    			span0 = element("span");
    			t2 = space();
    			div9 = element("div");
    			div0 = element("div");
    			a2 = element("a");
    			t3 = space();
    			span1 = element("span");
    			span1.textContent = "Notifications";
    			t5 = space();
    			a3 = element("a");
    			t6 = space();
    			div8 = element("div");
    			div1 = element("div");
    			div1.textContent = "today";
    			t8 = space();
    			a4 = element("a");
    			div3 = element("div");
    			div2 = element("div");
    			i1 = element("i");
    			t9 = text("\r\n                      All systems operational.");
    			t10 = space();
    			a5 = element("a");
    			div5 = element("div");
    			div4 = element("div");
    			i2 = element("i");
    			t11 = text("\r\n                      File upload successful.");
    			t12 = space();
    			a6 = element("a");
    			div7 = element("div");
    			div6 = element("div");
    			i3 = element("i");
    			t13 = text("\r\n                      Your holiday has been denied");
    			t14 = space();
    			li1 = element("li");
    			a7 = element("a");
    			div11 = element("div");
    			span2 = element("span");
    			span2.textContent = "V";
    			t16 = space();
    			div13 = element("div");
    			a8 = element("a");
    			a8.textContent = "Add Account";
    			t18 = space();
    			a9 = element("a");
    			a9.textContent = "Reset Password";
    			t20 = space();
    			a10 = element("a");
    			a10.textContent = "Help";
    			t22 = space();
    			div12 = element("div");
    			t23 = space();
    			a11 = element("a");
    			a11.textContent = "Logout";
    			attr_dev(a0, "href", "#!");
    			attr_dev(a0, "class", "sidebar-toggle");
    			attr_dev(a0, "data-toggleclass", "sidebar-open");
    			attr_dev(a0, "data-target", "body");
    			add_location(a0, file$2, 1, 4, 35);
    			attr_dev(i0, "class", "mdi mdi-24px mdi-bell-outline");
    			add_location(i0, file$2, 34, 14, 914);
    			attr_dev(span0, "class", "notification-counter");
    			add_location(span0, file$2, 35, 14, 973);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "data-toggle", "dropdown");
    			attr_dev(a1, "aria-haspopup", "true");
    			attr_dev(a1, "aria-expanded", "false");
    			add_location(a1, file$2, 28, 12, 727);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "mdi mdi-18px mdi-settings text-muted");
    			add_location(a2, file$2, 42, 16, 1261);
    			attr_dev(span1, "class", "h5 m-0");
    			add_location(span1, file$2, 45, 16, 1387);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "mdi mdi-18px mdi-notification-clear-all text-muted");
    			add_location(a3, file$2, 46, 16, 1446);
    			attr_dev(div0, "class", "d-flex p-all-15 bg-white justify-content-between\r\n                border-bottom ");
    			add_location(div0, file$2, 39, 14, 1132);
    			attr_dev(div1, "class", "text-overline m-b-5");
    			add_location(div1, file$2, 53, 16, 1710);
    			attr_dev(i1, "class", "mdi mdi-circle text-success");
    			add_location(i1, file$2, 57, 22, 1915);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$2, 56, 20, 1868);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$2, 55, 18, 1828);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "class", "d-block m-b-10");
    			add_location(a4, file$2, 54, 16, 1772);
    			attr_dev(i2, "class", "mdi mdi-upload-multiple ");
    			add_location(i2, file$2, 65, 22, 2241);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$2, 64, 20, 2194);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$2, 63, 18, 2154);
    			attr_dev(a5, "href", "#!");
    			attr_dev(a5, "class", "d-block m-b-10");
    			add_location(a5, file$2, 62, 16, 2098);
    			attr_dev(i3, "class", "mdi mdi-cancel text-danger");
    			add_location(i3, file$2, 73, 22, 2563);
    			attr_dev(div6, "class", "card-body");
    			add_location(div6, file$2, 72, 20, 2516);
    			attr_dev(div7, "class", "card");
    			add_location(div7, file$2, 71, 18, 2476);
    			attr_dev(a6, "href", "#!");
    			attr_dev(a6, "class", "d-block m-b-10");
    			add_location(a6, file$2, 70, 16, 2420);
    			attr_dev(div8, "class", "notification-events bg-gray-300");
    			add_location(div8, file$2, 52, 14, 1647);
    			attr_dev(div9, "class", "dropdown-menu notification-container dropdown-menu-right");
    			add_location(div9, file$2, 38, 12, 1046);
    			attr_dev(div10, "class", "dropdown");
    			add_location(div10, file$2, 27, 10, 691);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$2, 26, 8, 658);
    			attr_dev(span2, "class", "avatar-title rounded-circle bg-dark");
    			add_location(span2, file$2, 93, 14, 3145);
    			attr_dev(div11, "class", "avatar avatar-sm avatar-online");
    			add_location(div11, file$2, 92, 12, 3085);
    			attr_dev(a7, "class", "nav-link dropdown-toggle");
    			attr_dev(a7, "href", "#!");
    			attr_dev(a7, "role", "button");
    			attr_dev(a7, "data-toggle", "dropdown");
    			attr_dev(a7, "aria-haspopup", "true");
    			attr_dev(a7, "aria-expanded", "false");
    			add_location(a7, file$2, 85, 10, 2867);
    			attr_dev(a8, "class", "dropdown-item");
    			attr_dev(a8, "href", "#!");
    			add_location(a8, file$2, 98, 12, 3316);
    			attr_dev(a9, "class", "dropdown-item");
    			attr_dev(a9, "href", "#!");
    			add_location(a9, file$2, 99, 12, 3380);
    			attr_dev(a10, "class", "dropdown-item");
    			attr_dev(a10, "href", "#!");
    			add_location(a10, file$2, 100, 12, 3447);
    			attr_dev(div12, "class", "dropdown-divider");
    			add_location(div12, file$2, 101, 12, 3504);
    			attr_dev(a11, "class", "dropdown-item");
    			attr_dev(a11, "href", "#!");
    			add_location(a11, file$2, 102, 12, 3550);
    			attr_dev(div13, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div13, file$2, 97, 10, 3255);
    			attr_dev(li1, "class", "nav-item dropdown ");
    			add_location(li1, file$2, 84, 8, 2824);
    			attr_dev(ul, "class", "nav align-items-center");
    			add_location(ul, file$2, 24, 6, 609);
    			attr_dev(nav, "class", " ml-auto");
    			add_location(nav, file$2, 23, 4, 579);
    			attr_dev(header, "class", "admin-header");
    			add_location(header, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, a0);
    			append_dev(header, t0);
    			append_dev(header, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, div10);
    			append_dev(div10, a1);
    			append_dev(a1, i0);
    			append_dev(a1, t1);
    			append_dev(a1, span0);
    			append_dev(div10, t2);
    			append_dev(div10, div9);
    			append_dev(div9, div0);
    			append_dev(div0, a2);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			append_dev(div0, t5);
    			append_dev(div0, a3);
    			append_dev(div9, t6);
    			append_dev(div9, div8);
    			append_dev(div8, div1);
    			append_dev(div8, t8);
    			append_dev(div8, a4);
    			append_dev(a4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, i1);
    			append_dev(div2, t9);
    			append_dev(div8, t10);
    			append_dev(div8, a5);
    			append_dev(a5, div5);
    			append_dev(div5, div4);
    			append_dev(div4, i2);
    			append_dev(div4, t11);
    			append_dev(div8, t12);
    			append_dev(div8, a6);
    			append_dev(a6, div7);
    			append_dev(div7, div6);
    			append_dev(div6, i3);
    			append_dev(div6, t13);
    			append_dev(ul, t14);
    			append_dev(ul, li1);
    			append_dev(li1, a7);
    			append_dev(a7, div11);
    			append_dev(div11, span2);
    			append_dev(li1, t16);
    			append_dev(li1, div13);
    			append_dev(div13, a8);
    			append_dev(div13, t18);
    			append_dev(div13, a9);
    			append_dev(div13, t20);
    			append_dev(div13, a10);
    			append_dev(div13, t22);
    			append_dev(div13, div12);
    			append_dev(div13, t23);
    			append_dev(div13, a11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    // List of nodes to update
    const nodes = [];

    // Current location
    let location$1;

    // Function that updates all nodes marking the active ones
    function checkActive(el) {
        // Repeat this for each class
        (el.className || '').split(' ').forEach((cls) => {
            if (!cls) {
                return
            }
            // Remove the active class firsts
            el.node.classList.remove(cls);

            // If the pattern matches, then set the active class
            if (el.pattern.test(location$1)) {
                el.node.classList.add(cls);
            }
        });
    }

    // Listen to changes in the location
    loc.subscribe((value) => {
        // Update the location
        location$1 = value.location + (value.querystring ? '?' + value.querystring : '');

        // Update all nodes
        nodes.map(checkActive);
    });

    /**
     * @typedef {Object} ActiveOptions
     * @property {string|RegExp} [path] - Path expression that makes the link active when matched (must start with '/' or '*'); default is the link's href
     * @property {string} [className] - CSS class to apply to the element when active; default value is "active"
     */

    /**
     * Svelte Action for automatically adding the "active" class to elements (links, or any other DOM element) when the current location matches a certain path.
     * 
     * @param {HTMLElement} node - The target node (automatically set by Svelte)
     * @param {ActiveOptions|string|RegExp} [opts] - Can be an object of type ActiveOptions, or a string (or regular expressions) representing ActiveOptions.path.
     * @returns {{destroy: function(): void}} Destroy function
     */
    function active(node, opts) {
        // Check options
        if (opts && (typeof opts == 'string' || (typeof opts == 'object' && opts instanceof RegExp))) {
            // Interpret strings and regular expressions as opts.path
            opts = {
                path: opts
            };
        }
        else {
            // Ensure opts is a dictionary
            opts = opts || {};
        }

        // Path defaults to link target
        if (!opts.path && node.hasAttribute('href')) {
            opts.path = node.getAttribute('href');
            if (opts.path && opts.path.length > 1 && opts.path.charAt(0) == '#') {
                opts.path = opts.path.substring(1);
            }
        }

        // Default class name
        if (!opts.className) {
            opts.className = 'active';
        }

        // If path is a string, it must start with '/' or '*'
        if (!opts.path || 
            typeof opts.path == 'string' && (opts.path.length < 1 || (opts.path.charAt(0) != '/' && opts.path.charAt(0) != '*'))
        ) {
            throw Error('Invalid value for "path" argument')
        }

        // If path is not a regular expression already, make it
        const {pattern} = typeof opts.path == 'string' ?
            regexparam(opts.path) :
            {pattern: opts.path};

        // Add the node to the list
        const el = {
            node,
            className: opts.className,
            pattern
        };
        nodes.push(el);

        // Trigger the action right away
        checkActive(el);

        return {
            // When the element is destroyed, remove it from the list
            destroy() {
                nodes.splice(nodes.indexOf(el), 1);
            }
        }
    }

    /* src\Layout\AsidePacientes.svelte generated by Svelte v3.29.0 */
    const file$3 = "src\\Layout\\AsidePacientes.svelte";

    function create_fragment$4(ctx) {
    	let aside;
    	let div1;
    	let span0;
    	let a0;
    	let link_action;
    	let t1;
    	let div0;
    	let a1;
    	let t2;
    	let a2;
    	let t3;
    	let div2;
    	let ul;
    	let li0;
    	let a3;
    	let span2;
    	let span1;
    	let t5;
    	let span4;
    	let span3;
    	let t7;
    	let i0;
    	let link_action_1;
    	let active_action;
    	let t8;
    	let li1;
    	let a4;
    	let span6;
    	let span5;
    	let t10;
    	let span7;
    	let i1;
    	let link_action_2;
    	let active_action_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			aside = element("aside");
    			div1 = element("div");
    			span0 = element("span");
    			a0 = element("a");
    			a0.textContent = "xmedical";
    			t1 = space();
    			div0 = element("div");
    			a1 = element("a");
    			t2 = space();
    			a2 = element("a");
    			t3 = space();
    			div2 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a3 = element("a");
    			span2 = element("span");
    			span1 = element("span");
    			span1.textContent = "IR A INICIO";
    			t5 = space();
    			span4 = element("span");
    			span3 = element("span");
    			span3.textContent = "1";
    			t7 = space();
    			i0 = element("i");
    			t8 = space();
    			li1 = element("li");
    			a4 = element("a");
    			span6 = element("span");
    			span5 = element("span");
    			span5.textContent = "Pacientes";
    			t10 = space();
    			span7 = element("span");
    			i1 = element("i");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$3, 9, 8, 286);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$3, 8, 6, 242);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$3, 14, 8, 438);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$3, 18, 8, 611);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$3, 12, 6, 378);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$3, 6, 4, 163);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$3, 30, 14, 1041);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$3, 29, 12, 1000);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$3, 33, 14, 1158);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$3, 34, 14, 1238);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$3, 32, 12, 1118);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$3, 28, 10, 947);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$3, 27, 8, 867);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$3, 44, 16, 1626);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$3, 43, 12, 1583);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-account-circle-outline");
    			add_location(i1, file$3, 47, 16, 1743);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$3, 46, 12, 1701);
    			attr_dev(a4, "href", "/Paciente/Index");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$3, 42, 12, 1516);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$3, 41, 8, 1420);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$3, 25, 6, 807);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$3, 23, 4, 719);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$3, 5, 2, 128);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			append_dev(aside, div1);
    			append_dev(div1, span0);
    			append_dev(span0, a0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, a1);
    			append_dev(div0, t2);
    			append_dev(div0, a2);
    			append_dev(aside, t3);
    			append_dev(aside, div2);
    			append_dev(div2, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a3);
    			append_dev(a3, span2);
    			append_dev(span2, span1);
    			append_dev(a3, t5);
    			append_dev(a3, span4);
    			append_dev(span4, span3);
    			append_dev(span4, t7);
    			append_dev(span4, i0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, a4);
    			append_dev(a4, span6);
    			append_dev(span6, span5);
    			append_dev(a4, t10);
    			append_dev(a4, span7);
    			append_dev(span7, i1);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a3)),
    					action_destroyer(active_action = active.call(null, li0, { path: "/", className: "active" })),
    					action_destroyer(link_action_2 = link.call(null, a4)),
    					action_destroyer(active_action_1 = active.call(null, li1, {
    						path: "/Paciente/Index",
    						className: "active"
    					}))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AsidePacientes", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AsidePacientes> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, active });
    	return [];
    }

    class AsidePacientes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AsidePacientes",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Pages\Paciente\Index.svelte generated by Svelte v3.29.0 */
    const file$4 = "src\\Pages\\Paciente\\Index.svelte";

    function create_fragment$5(ctx) {
    	let asidepaciente;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div13;
    	let div0;
    	let t2;
    	let h4;
    	let t4;
    	let div12;
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let input;
    	let t5;
    	let div2;
    	let div1;
    	let span0;
    	let t6;
    	let a0;
    	let i0;
    	let t7;
    	let link_action;
    	let t8;
    	let div11;
    	let div10;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t10;
    	let th1;
    	let t12;
    	let th2;
    	let t14;
    	let th3;
    	let t15;
    	let tbody;
    	let tr1;
    	let td0;
    	let div8;
    	let div7;
    	let span1;
    	let t17;
    	let span2;
    	let t19;
    	let td1;
    	let t21;
    	let td2;
    	let t23;
    	let td3;
    	let div9;
    	let a1;
    	let i1;
    	let link_action_1;
    	let t24;
    	let a2;
    	let i2;
    	let link_action_2;
    	let current;
    	let mounted;
    	let dispose;
    	asidepaciente = new AsidePacientes({ $$inline: true });
    	header = new Header({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asidepaciente.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div13 = element("div");
    			div0 = element("div");
    			t2 = space();
    			h4 = element("h4");
    			h4.textContent = "Pacientes";
    			t4 = space();
    			div12 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			input = element("input");
    			t5 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			t6 = space();
    			a0 = element("a");
    			i0 = element("i");
    			t7 = text(" Nuevo paciente");
    			t8 = space();
    			div11 = element("div");
    			div10 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Nombres";
    			t10 = space();
    			th1 = element("th");
    			th1.textContent = "Edad";
    			t12 = space();
    			th2 = element("th");
    			th2.textContent = "Sexo";
    			t14 = space();
    			th3 = element("th");
    			t15 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			div8 = element("div");
    			div7 = element("div");
    			span1 = element("span");
    			span1.textContent = "FD";
    			t17 = space();
    			span2 = element("span");
    			span2.textContent = "Fiordaliza De Jesus";
    			t19 = space();
    			td1 = element("td");
    			td1.textContent = "49 años";
    			t21 = space();
    			td2 = element("td");
    			td2.textContent = "Femenino";
    			t23 = space();
    			td3 = element("td");
    			div9 = element("div");
    			a1 = element("a");
    			i1 = element("i");
    			t24 = space();
    			a2 = element("a");
    			i2 = element("i");
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$4, 12, 6, 323);
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$4, 13, 6, 350);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "class", "form-control form-control-appended");
    			attr_dev(input, "placeholder", "Buscar");
    			add_location(input, file$4, 19, 28, 628);
    			attr_dev(span0, "class", "mdi mdi-magnify");
    			add_location(span0, file$4, 22, 36, 877);
    			attr_dev(div1, "class", "input-group-text");
    			add_location(div1, file$4, 21, 32, 809);
    			attr_dev(div2, "class", "input-group-append");
    			add_location(div2, file$4, 20, 28, 743);
    			attr_dev(div3, "class", "input-group input-group-flush mb-3");
    			add_location(div3, file$4, 18, 24, 550);
    			attr_dev(div4, "class", "col-md-5");
    			add_location(div4, file$4, 17, 20, 502);
    			attr_dev(i0, "class", "mdi mdi-account-plus");
    			add_location(i0, file$4, 27, 117, 1169);
    			attr_dev(a0, "href", "/Paciente/Editar");
    			attr_dev(a0, "type", "button");
    			attr_dev(a0, "class", "btn  m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			add_location(a0, file$4, 27, 20, 1072);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$4, 16, 16, 463);
    			attr_dev(div6, "class", "col-md-12");
    			add_location(div6, file$4, 15, 12, 422);
    			add_location(th0, file$4, 36, 32, 1553);
    			add_location(th1, file$4, 37, 32, 1603);
    			add_location(th2, file$4, 38, 32, 1650);
    			add_location(th3, file$4, 39, 32, 1697);
    			add_location(tr0, file$4, 35, 28, 1515);
    			add_location(thead, file$4, 34, 24, 1478);
    			attr_dev(span1, "class", "avatar-title rounded-circle ");
    			add_location(span1, file$4, 47, 44, 2113);
    			attr_dev(div7, "class", "avatar avatar-sm");
    			add_location(div7, file$4, 46, 40, 2037);
    			attr_dev(div8, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div8, file$4, 45, 36, 1949);
    			add_location(span2, file$4, 50, 43, 2264);
    			add_location(td0, file$4, 44, 32, 1907);
    			add_location(td1, file$4, 52, 32, 2369);
    			add_location(td2, file$4, 53, 32, 2419);
    			attr_dev(i1, "class", "mdi-24px mdi mdi-circle-edit-outline");
    			add_location(i1, file$4, 57, 179, 2769);
    			attr_dev(a1, "href", "/Paciente/Editar");
    			attr_dev(a1, "data-toggle", "tooltip");
    			attr_dev(a1, "data-placement", "top");
    			attr_dev(a1, "data-original-title", "Modificar paciente");
    			attr_dev(a1, "class", "icon-table");
    			add_location(a1, file$4, 57, 40, 2630);
    			attr_dev(i2, "class", "mdi-24px mdi mdi-account-card-details");
    			add_location(i2, file$4, 60, 44, 3050);
    			attr_dev(a2, "href", "/Paciente/Perfil");
    			attr_dev(a2, "data-toggle", "tooltip");
    			attr_dev(a2, "data-placement", "top");
    			attr_dev(a2, "data-original-title", "Ver perfil");
    			attr_dev(a2, "class", "icon-table");
    			add_location(a2, file$4, 59, 40, 2873);
    			set_style(div9, "width", "200px");
    			attr_dev(div9, "class", "ml-auto");
    			add_location(div9, file$4, 56, 36, 2545);
    			set_style(td3, "text-align", "right");
    			add_location(td3, file$4, 55, 32, 2476);
    			add_location(tr1, file$4, 43, 28, 1869);
    			attr_dev(tbody, "data-bind", "foreach: pacientes");
    			add_location(tbody, file$4, 42, 24, 1801);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$4, 33, 20, 1404);
    			attr_dev(div10, "class", "table-responsive");
    			add_location(div10, file$4, 32, 16, 1352);
    			attr_dev(div11, "class", "col-md-12 m-b-30");
    			add_location(div11, file$4, 31, 12, 1304);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$4, 14, 8, 391);
    			attr_dev(div13, "class", "p-2");
    			add_location(div13, file$4, 11, 4, 298);
    			attr_dev(section, "class", "admin-content p-2");
    			add_location(section, file$4, 10, 2, 257);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$4, 8, 0, 214);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asidepaciente, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t1);
    			append_dev(main, section);
    			append_dev(section, div13);
    			append_dev(div13, div0);
    			append_dev(div13, t2);
    			append_dev(div13, h4);
    			append_dev(div13, t4);
    			append_dev(div13, div12);
    			append_dev(div12, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, input);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div5, t6);
    			append_dev(div5, a0);
    			append_dev(a0, i0);
    			append_dev(a0, t7);
    			append_dev(div12, t8);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t10);
    			append_dev(tr0, th1);
    			append_dev(tr0, t12);
    			append_dev(tr0, th2);
    			append_dev(tr0, t14);
    			append_dev(tr0, th3);
    			append_dev(table, t15);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(td0, div8);
    			append_dev(div8, div7);
    			append_dev(div7, span1);
    			append_dev(td0, t17);
    			append_dev(td0, span2);
    			append_dev(tr1, t19);
    			append_dev(tr1, td1);
    			append_dev(tr1, t21);
    			append_dev(tr1, td2);
    			append_dev(tr1, t23);
    			append_dev(tr1, td3);
    			append_dev(td3, div9);
    			append_dev(div9, a1);
    			append_dev(a1, i1);
    			append_dev(div9, t24);
    			append_dev(div9, a2);
    			append_dev(a2, i2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a1)),
    					action_destroyer(link_action_2 = link.call(null, a2))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asidepaciente.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asidepaciente.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asidepaciente, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Index", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, AsidePaciente: AsidePacientes, link });
    	return [];
    }

    class Index$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\componentes\ModalDatosPaciente.svelte generated by Svelte v3.29.0 */

    const file$5 = "src\\componentes\\ModalDatosPaciente.svelte";

    function create_fragment$6(ctx) {
    	let div51;
    	let div50;
    	let div49;
    	let div0;
    	let h5;
    	let t1;
    	let button;
    	let span0;
    	let t3;
    	let div42;
    	let div5;
    	let div2;
    	let div1;
    	let img;
    	let img_src_value;
    	let t4;
    	let h30;
    	let a0;
    	let t5;
    	let div3;
    	let t7;
    	let div4;
    	let span2;
    	let t8;
    	let span1;
    	let t10;
    	let hr0;
    	let t11;
    	let form;
    	let div32;
    	let div7;
    	let div6;
    	let sapn;
    	let t13;
    	let strong0;
    	let t15;
    	let div9;
    	let div8;
    	let span3;
    	let t17;
    	let strong1;
    	let t19;
    	let div11;
    	let div10;
    	let span4;
    	let t21;
    	let strong2;
    	let t23;
    	let div13;
    	let div12;
    	let span5;
    	let t25;
    	let strong3;
    	let t27;
    	let div15;
    	let div14;
    	let span6;
    	let t29;
    	let strong4;
    	let t31;
    	let div17;
    	let div16;
    	let span7;
    	let t33;
    	let strong5;
    	let t35;
    	let div19;
    	let div18;
    	let span8;
    	let t37;
    	let strong6;
    	let t39;
    	let div21;
    	let div20;
    	let span9;
    	let t41;
    	let strong7;
    	let t43;
    	let div23;
    	let div22;
    	let span10;
    	let t45;
    	let strong8;
    	let t47;
    	let div25;
    	let div24;
    	let span11;
    	let t49;
    	let strong9;
    	let t51;
    	let div27;
    	let div26;
    	let span12;
    	let t53;
    	let strong10;
    	let t55;
    	let div29;
    	let div28;
    	let span13;
    	let t57;
    	let strong11;
    	let t59;
    	let div31;
    	let div30;
    	let span14;
    	let t61;
    	let strong12;
    	let t63;
    	let p;
    	let b;
    	let t65;
    	let hr1;
    	let t66;
    	let div41;
    	let div34;
    	let div33;
    	let span15;
    	let t68;
    	let strong13;
    	let t70;
    	let div36;
    	let div35;
    	let span16;
    	let t72;
    	let strong14;
    	let t74;
    	let div38;
    	let div37;
    	let span17;
    	let t76;
    	let strong15;
    	let t78;
    	let div40;
    	let div39;
    	let span18;
    	let t80;
    	let strong16;
    	let t82;
    	let div48;
    	let div47;
    	let div44;
    	let a1;
    	let h31;
    	let t83;
    	let div43;
    	let t85;
    	let div46;
    	let a2;
    	let h32;
    	let t86;
    	let div45;

    	const block = {
    		c: function create() {
    			div51 = element("div");
    			div50 = element("div");
    			div49 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Datos de paciente";
    			t1 = space();
    			button = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			div42 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t4 = space();
    			h30 = element("h3");
    			a0 = element("a");
    			t5 = space();
    			div3 = element("div");
    			div3.textContent = "---";
    			t7 = space();
    			div4 = element("div");
    			span2 = element("span");
    			t8 = text("Ultima vez modificado ");
    			span1 = element("span");
    			span1.textContent = "---";
    			t10 = space();
    			hr0 = element("hr");
    			t11 = space();
    			form = element("form");
    			div32 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			sapn = element("sapn");
    			sapn.textContent = "Cedula / pasaporte";
    			t13 = space();
    			strong0 = element("strong");
    			strong0.textContent = "--";
    			t15 = space();
    			div9 = element("div");
    			div8 = element("div");
    			span3 = element("span");
    			span3.textContent = "Nombres";
    			t17 = space();
    			strong1 = element("strong");
    			strong1.textContent = "--";
    			t19 = space();
    			div11 = element("div");
    			div10 = element("div");
    			span4 = element("span");
    			span4.textContent = "Primer Apellido";
    			t21 = space();
    			strong2 = element("strong");
    			strong2.textContent = "--";
    			t23 = space();
    			div13 = element("div");
    			div12 = element("div");
    			span5 = element("span");
    			span5.textContent = "Segundo Apellido";
    			t25 = space();
    			strong3 = element("strong");
    			strong3.textContent = "--";
    			t27 = space();
    			div15 = element("div");
    			div14 = element("div");
    			span6 = element("span");
    			span6.textContent = "Sexo";
    			t29 = space();
    			strong4 = element("strong");
    			strong4.textContent = "--";
    			t31 = space();
    			div17 = element("div");
    			div16 = element("div");
    			span7 = element("span");
    			span7.textContent = "Edad";
    			t33 = space();
    			strong5 = element("strong");
    			strong5.textContent = "--";
    			t35 = space();
    			div19 = element("div");
    			div18 = element("div");
    			span8 = element("span");
    			span8.textContent = "Estado Civil";
    			t37 = space();
    			strong6 = element("strong");
    			strong6.textContent = "--";
    			t39 = space();
    			div21 = element("div");
    			div20 = element("div");
    			span9 = element("span");
    			span9.textContent = "Fecha Nacimiento";
    			t41 = space();
    			strong7 = element("strong");
    			strong7.textContent = "--";
    			t43 = space();
    			div23 = element("div");
    			div22 = element("div");
    			span10 = element("span");
    			span10.textContent = "Telefono";
    			t45 = space();
    			strong8 = element("strong");
    			strong8.textContent = "--";
    			t47 = space();
    			div25 = element("div");
    			div24 = element("div");
    			span11 = element("span");
    			span11.textContent = "Celular";
    			t49 = space();
    			strong9 = element("strong");
    			strong9.textContent = "--";
    			t51 = space();
    			div27 = element("div");
    			div26 = element("div");
    			span12 = element("span");
    			span12.textContent = "Seguro Medico";
    			t53 = space();
    			strong10 = element("strong");
    			strong10.textContent = "--";
    			t55 = space();
    			div29 = element("div");
    			div28 = element("div");
    			span13 = element("span");
    			span13.textContent = "Poliza";
    			t57 = space();
    			strong11 = element("strong");
    			strong11.textContent = "--";
    			t59 = space();
    			div31 = element("div");
    			div30 = element("div");
    			span14 = element("span");
    			span14.textContent = "NSS";
    			t61 = space();
    			strong12 = element("strong");
    			strong12.textContent = "--";
    			t63 = space();
    			p = element("p");
    			b = element("b");
    			b.textContent = "Datos demográficos";
    			t65 = space();
    			hr1 = element("hr");
    			t66 = space();
    			div41 = element("div");
    			div34 = element("div");
    			div33 = element("div");
    			span15 = element("span");
    			span15.textContent = "Dirección";
    			t68 = space();
    			strong13 = element("strong");
    			strong13.textContent = "--";
    			t70 = space();
    			div36 = element("div");
    			div35 = element("div");
    			span16 = element("span");
    			span16.textContent = "Ciudad";
    			t72 = space();
    			strong14 = element("strong");
    			strong14.textContent = "--";
    			t74 = space();
    			div38 = element("div");
    			div37 = element("div");
    			span17 = element("span");
    			span17.textContent = "Pais";
    			t76 = space();
    			strong15 = element("strong");
    			strong15.textContent = "--";
    			t78 = space();
    			div40 = element("div");
    			div39 = element("div");
    			span18 = element("span");
    			span18.textContent = "Provincia";
    			t80 = space();
    			strong16 = element("strong");
    			strong16.textContent = "--";
    			t82 = space();
    			div48 = element("div");
    			div47 = element("div");
    			div44 = element("div");
    			a1 = element("a");
    			h31 = element("h3");
    			t83 = space();
    			div43 = element("div");
    			div43.textContent = "Cerrar";
    			t85 = space();
    			div46 = element("div");
    			a2 = element("a");
    			h32 = element("h3");
    			t86 = space();
    			div45 = element("div");
    			div45.textContent = "Editar";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "modalDatosPersonales");
    			add_location(h5, file$5, 5, 20, 365);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$5, 7, 24, 561);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$5, 6, 20, 459);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$5, 4, 16, 317);
    			attr_dev(img, "class", "avatar-img rounded-circle");
    			if (img.src !== (img_src_value = "/atmosTemplate/assets/img/person.webp")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "imagen paciente");
    			add_location(img, file$5, 15, 32, 865);
    			attr_dev(div1, "class", "avatar avatar-xl");
    			add_location(div1, file$5, 14, 28, 801);
    			add_location(div2, file$5, 13, 24, 766);
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$5, 19, 28, 1127);
    			attr_dev(h30, "class", "p-t-10 searchBy-name");
    			add_location(h30, file$5, 18, 24, 1064);
    			attr_dev(div3, "class", "text-muted text-center m-b-10");
    			attr_dev(div3, "data-bind", "text: paciente().correo");
    			add_location(div3, file$5, 21, 24, 1200);
    			attr_dev(span1, "data-bind", "text: paciente().ultimaModificacion");
    			add_location(span1, file$5, 24, 84, 1446);
    			attr_dev(span2, "class", "badge badge-primary");
    			add_location(span2, file$5, 24, 28, 1390);
    			attr_dev(div4, "class", "m-auto");
    			add_location(div4, file$5, 23, 24, 1340);
    			attr_dev(div5, "class", "text-center");
    			add_location(div5, file$5, 12, 20, 715);
    			add_location(hr0, file$5, 28, 20, 1636);
    			attr_dev(sapn, "class", "text-primary");
    			add_location(sapn, file$5, 33, 36, 1925);
    			attr_dev(strong0, "class", "d-block");
    			attr_dev(strong0, "data-bind", "text: paciente().cedula");
    			add_location(strong0, file$5, 34, 36, 2015);
    			attr_dev(div6, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div6, file$5, 32, 32, 1847);
    			attr_dev(div7, "class", "form-group col-md-6");
    			add_location(div7, file$5, 31, 28, 1780);
    			attr_dev(span3, "class", "text-primary");
    			add_location(span3, file$5, 41, 36, 2530);
    			attr_dev(strong1, "class", "d-block");
    			attr_dev(strong1, "data-bind", "text: paciente().nombres");
    			add_location(strong1, file$5, 42, 36, 2609);
    			attr_dev(div8, "class", " bg-gray-100 p-2 rounded-sm");
    			add_location(div8, file$5, 40, 32, 2451);
    			attr_dev(div9, "class", "form-group col-md-12");
    			add_location(div9, file$5, 39, 28, 2383);
    			attr_dev(span4, "class", "text-primary");
    			add_location(span4, file$5, 48, 36, 3068);
    			attr_dev(strong2, "class", "d-block");
    			attr_dev(strong2, "data-bind", "text: paciente().primerApellido");
    			add_location(strong2, file$5, 49, 36, 3155);
    			attr_dev(div10, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div10, file$5, 47, 32, 2990);
    			attr_dev(div11, "class", "form-group col-md-6");
    			add_location(div11, file$5, 46, 28, 2923);
    			attr_dev(span5, "class", "text-primary");
    			add_location(span5, file$5, 56, 36, 3693);
    			attr_dev(strong3, "class", "d-block");
    			attr_dev(strong3, "data-bind", "text: paciente().segundoApellido");
    			add_location(strong3, file$5, 57, 36, 3781);
    			attr_dev(div12, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div12, file$5, 55, 32, 3615);
    			attr_dev(div13, "class", "form-group col-md-6 ");
    			add_location(div13, file$5, 54, 28, 3547);
    			attr_dev(span6, "class", "text-primary");
    			add_location(span6, file$5, 64, 36, 4321);
    			attr_dev(strong4, "class", "d-block");
    			attr_dev(strong4, "data-bind", "text: paciente().sexo");
    			add_location(strong4, file$5, 65, 36, 4397);
    			attr_dev(div14, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div14, file$5, 63, 32, 4243);
    			attr_dev(div15, "class", "form-group col-md-6");
    			add_location(div15, file$5, 62, 28, 4176);
    			attr_dev(span7, "class", "text-primary");
    			add_location(span7, file$5, 71, 36, 4863);
    			attr_dev(strong5, "class", "d-block");
    			attr_dev(strong5, "data-bind", "text: paciente().edad");
    			add_location(strong5, file$5, 72, 36, 4939);
    			attr_dev(div16, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div16, file$5, 70, 32, 4785);
    			attr_dev(div17, "class", "form-group col-md-6");
    			add_location(div17, file$5, 69, 28, 4718);
    			attr_dev(span8, "class", "text-primary");
    			add_location(span8, file$5, 78, 36, 5405);
    			attr_dev(strong6, "class", "d-block");
    			attr_dev(strong6, "data-bind", "text: paciente().estadoCivil");
    			add_location(strong6, file$5, 79, 36, 5489);
    			attr_dev(div18, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div18, file$5, 77, 32, 5327);
    			attr_dev(div19, "class", "form-group col-md-6");
    			add_location(div19, file$5, 76, 28, 5260);
    			attr_dev(span9, "class", "text-primary");
    			add_location(span9, file$5, 87, 36, 6000);
    			attr_dev(strong7, "class", "d-block");
    			attr_dev(strong7, "data-bind", "text: paciente().fechaNacimiento");
    			add_location(strong7, file$5, 88, 36, 6088);
    			attr_dev(div20, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div20, file$5, 86, 32, 5922);
    			attr_dev(div21, "class", "form-group col-md-6");
    			add_location(div21, file$5, 85, 28, 5855);
    			attr_dev(span10, "class", "text-primary");
    			add_location(span10, file$5, 95, 36, 6606);
    			attr_dev(strong8, "class", "d-block");
    			attr_dev(strong8, "data-bind", "text: paciente().telefono");
    			add_location(strong8, file$5, 96, 36, 6686);
    			attr_dev(div22, "class", " bg-gray-100 p-2 rounded-sm");
    			add_location(div22, file$5, 94, 32, 6527);
    			attr_dev(div23, "class", "form-group col-md-6");
    			add_location(div23, file$5, 93, 28, 6460);
    			attr_dev(span11, "class", "text-primary");
    			add_location(span11, file$5, 103, 36, 7205);
    			attr_dev(strong9, "class", "d-block");
    			attr_dev(strong9, "data-bind", "text: paciente().celular");
    			add_location(strong9, file$5, 104, 36, 7284);
    			attr_dev(div24, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div24, file$5, 102, 32, 7127);
    			attr_dev(div25, "class", "form-group col-md-6");
    			add_location(div25, file$5, 101, 28, 7060);
    			attr_dev(span12, "class", "text-primary");
    			add_location(span12, file$5, 111, 36, 7805);
    			attr_dev(strong10, "class", "d-block");
    			attr_dev(strong10, "data-bind", "text: paciente().nombreAseguradora");
    			add_location(strong10, file$5, 112, 36, 7890);
    			attr_dev(div26, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div26, file$5, 110, 32, 7727);
    			attr_dev(div27, "class", "form-group col-md-6 ");
    			add_location(div27, file$5, 109, 28, 7659);
    			attr_dev(span13, "class", "text-primary");
    			add_location(span13, file$5, 119, 36, 8447);
    			attr_dev(strong11, "class", "d-block");
    			attr_dev(strong11, "data-bind", "text: paciente().poliza");
    			add_location(strong11, file$5, 120, 36, 8525);
    			attr_dev(div28, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div28, file$5, 118, 32, 8369);
    			attr_dev(div29, "class", "form-group col-md-6 ");
    			add_location(div29, file$5, 117, 28, 8301);
    			attr_dev(span14, "class", "text-primary");
    			add_location(span14, file$5, 127, 36, 9025);
    			attr_dev(strong12, "class", "d-block");
    			attr_dev(strong12, "data-bind", "text: paciente().nss");
    			add_location(strong12, file$5, 128, 36, 9100);
    			attr_dev(div30, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div30, file$5, 126, 32, 8947);
    			attr_dev(div31, "class", "form-group col-md-6 ");
    			add_location(div31, file$5, 125, 28, 8879);
    			attr_dev(div32, "class", "form-row");
    			add_location(div32, file$5, 30, 24, 1728);
    			add_location(b, file$5, 134, 40, 9495);
    			attr_dev(p, "class", "mt-3");
    			add_location(p, file$5, 134, 24, 9479);
    			add_location(hr1, file$5, 135, 24, 9550);
    			attr_dev(span15, "for", "inpDireccion");
    			attr_dev(span15, "class", "text-primary");
    			add_location(span15, file$5, 139, 36, 9779);
    			attr_dev(strong13, "class", "d-block");
    			attr_dev(strong13, "data-bind", "text: paciente().direccion");
    			add_location(strong13, file$5, 140, 36, 9886);
    			attr_dev(div33, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div33, file$5, 138, 32, 9701);
    			attr_dev(div34, "class", "form-group col-md-12 ");
    			add_location(div34, file$5, 137, 28, 9632);
    			attr_dev(span16, "class", "text-primary");
    			add_location(span16, file$5, 147, 36, 10392);
    			attr_dev(strong14, "class", "d-block");
    			attr_dev(strong14, "data-bind", "text: paciente().ciudad");
    			add_location(strong14, file$5, 148, 36, 10470);
    			attr_dev(div35, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div35, file$5, 146, 32, 10314);
    			attr_dev(div36, "class", "form-group col-md-6 ");
    			add_location(div36, file$5, 145, 28, 10246);
    			attr_dev(span17, "for", "inpPais");
    			attr_dev(span17, "class", "text-primary");
    			add_location(span17, file$5, 154, 36, 10928);
    			attr_dev(strong15, "class", "d-block");
    			attr_dev(strong15, "data-bind", "text: paciente().pais");
    			add_location(strong15, file$5, 155, 36, 11018);
    			attr_dev(div37, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div37, file$5, 153, 32, 10850);
    			attr_dev(div38, "class", "form-group col-md-6 ");
    			add_location(div38, file$5, 152, 28, 10782);
    			attr_dev(span18, "class", "text-primary");
    			add_location(span18, file$5, 162, 36, 11531);
    			attr_dev(strong16, "class", "d-block");
    			attr_dev(strong16, "data-bind", "text: paciente().provincia");
    			add_location(strong16, file$5, 163, 36, 11612);
    			attr_dev(div39, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div39, file$5, 161, 32, 11453);
    			attr_dev(div40, "class", "form-group col-md-6 ");
    			add_location(div40, file$5, 160, 28, 11385);
    			attr_dev(div41, "class", "form-row");
    			add_location(div41, file$5, 136, 24, 9580);
    			attr_dev(form, "class", "form-group floating-label");
    			add_location(form, file$5, 29, 20, 1662);
    			attr_dev(div42, "class", "modal-body");
    			add_location(div42, file$5, 10, 16, 667);
    			attr_dev(h31, "class", "mdi mdi-close-outline");
    			add_location(h31, file$5, 177, 32, 12292);
    			attr_dev(div43, "class", "text-overline");
    			add_location(div43, file$5, 178, 32, 12365);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "class", "text-danger");
    			attr_dev(a1, "data-dismiss", "modal");
    			add_location(a1, file$5, 176, 28, 12205);
    			attr_dev(div44, "class", "col");
    			add_location(div44, file$5, 175, 24, 12158);
    			attr_dev(h32, "class", "mdi mdi-account-edit");
    			add_location(h32, file$5, 183, 32, 12610);
    			attr_dev(div45, "class", "text-overline");
    			add_location(div45, file$5, 184, 32, 12682);
    			attr_dev(a2, "href", "/");
    			attr_dev(a2, "class", "text-success");
    			add_location(a2, file$5, 182, 28, 12543);
    			attr_dev(div46, "class", "col");
    			add_location(div46, file$5, 181, 24, 12496);
    			attr_dev(div47, "class", "row text-center p-b-10");
    			add_location(div47, file$5, 174, 20, 12096);
    			attr_dev(div48, "class", "modal-footer");
    			add_location(div48, file$5, 173, 16, 12048);
    			attr_dev(div49, "class", "modal-content");
    			add_location(div49, file$5, 3, 12, 272);
    			attr_dev(div50, "class", "modal-dialog");
    			attr_dev(div50, "role", "document");
    			add_location(div50, file$5, 2, 8, 216);
    			attr_dev(div51, "class", "modal fade modal-slide-right");
    			attr_dev(div51, "id", "modalDatosPersonales");
    			attr_dev(div51, "tabindex", "-1");
    			attr_dev(div51, "role", "dialog");
    			attr_dev(div51, "aria-labelledby", "modalDatosPersonales");
    			set_style(div51, "display", "none");
    			set_style(div51, "padding-right", "16px");
    			attr_dev(div51, "aria-modal", "true");
    			add_location(div51, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div51, anchor);
    			append_dev(div51, div50);
    			append_dev(div50, div49);
    			append_dev(div49, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, span0);
    			append_dev(div49, t3);
    			append_dev(div49, div42);
    			append_dev(div42, div5);
    			append_dev(div5, div2);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			append_dev(div5, t4);
    			append_dev(div5, h30);
    			append_dev(h30, a0);
    			append_dev(div5, t5);
    			append_dev(div5, div3);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, span2);
    			append_dev(span2, t8);
    			append_dev(span2, span1);
    			append_dev(div42, t10);
    			append_dev(div42, hr0);
    			append_dev(div42, t11);
    			append_dev(div42, form);
    			append_dev(form, div32);
    			append_dev(div32, div7);
    			append_dev(div7, div6);
    			append_dev(div6, sapn);
    			append_dev(div6, t13);
    			append_dev(div6, strong0);
    			append_dev(div32, t15);
    			append_dev(div32, div9);
    			append_dev(div9, div8);
    			append_dev(div8, span3);
    			append_dev(div8, t17);
    			append_dev(div8, strong1);
    			append_dev(div32, t19);
    			append_dev(div32, div11);
    			append_dev(div11, div10);
    			append_dev(div10, span4);
    			append_dev(div10, t21);
    			append_dev(div10, strong2);
    			append_dev(div32, t23);
    			append_dev(div32, div13);
    			append_dev(div13, div12);
    			append_dev(div12, span5);
    			append_dev(div12, t25);
    			append_dev(div12, strong3);
    			append_dev(div32, t27);
    			append_dev(div32, div15);
    			append_dev(div15, div14);
    			append_dev(div14, span6);
    			append_dev(div14, t29);
    			append_dev(div14, strong4);
    			append_dev(div32, t31);
    			append_dev(div32, div17);
    			append_dev(div17, div16);
    			append_dev(div16, span7);
    			append_dev(div16, t33);
    			append_dev(div16, strong5);
    			append_dev(div32, t35);
    			append_dev(div32, div19);
    			append_dev(div19, div18);
    			append_dev(div18, span8);
    			append_dev(div18, t37);
    			append_dev(div18, strong6);
    			append_dev(div32, t39);
    			append_dev(div32, div21);
    			append_dev(div21, div20);
    			append_dev(div20, span9);
    			append_dev(div20, t41);
    			append_dev(div20, strong7);
    			append_dev(div32, t43);
    			append_dev(div32, div23);
    			append_dev(div23, div22);
    			append_dev(div22, span10);
    			append_dev(div22, t45);
    			append_dev(div22, strong8);
    			append_dev(div32, t47);
    			append_dev(div32, div25);
    			append_dev(div25, div24);
    			append_dev(div24, span11);
    			append_dev(div24, t49);
    			append_dev(div24, strong9);
    			append_dev(div32, t51);
    			append_dev(div32, div27);
    			append_dev(div27, div26);
    			append_dev(div26, span12);
    			append_dev(div26, t53);
    			append_dev(div26, strong10);
    			append_dev(div32, t55);
    			append_dev(div32, div29);
    			append_dev(div29, div28);
    			append_dev(div28, span13);
    			append_dev(div28, t57);
    			append_dev(div28, strong11);
    			append_dev(div32, t59);
    			append_dev(div32, div31);
    			append_dev(div31, div30);
    			append_dev(div30, span14);
    			append_dev(div30, t61);
    			append_dev(div30, strong12);
    			append_dev(form, t63);
    			append_dev(form, p);
    			append_dev(p, b);
    			append_dev(form, t65);
    			append_dev(form, hr1);
    			append_dev(form, t66);
    			append_dev(form, div41);
    			append_dev(div41, div34);
    			append_dev(div34, div33);
    			append_dev(div33, span15);
    			append_dev(div33, t68);
    			append_dev(div33, strong13);
    			append_dev(div41, t70);
    			append_dev(div41, div36);
    			append_dev(div36, div35);
    			append_dev(div35, span16);
    			append_dev(div35, t72);
    			append_dev(div35, strong14);
    			append_dev(div41, t74);
    			append_dev(div41, div38);
    			append_dev(div38, div37);
    			append_dev(div37, span17);
    			append_dev(div37, t76);
    			append_dev(div37, strong15);
    			append_dev(div41, t78);
    			append_dev(div41, div40);
    			append_dev(div40, div39);
    			append_dev(div39, span18);
    			append_dev(div39, t80);
    			append_dev(div39, strong16);
    			append_dev(div49, t82);
    			append_dev(div49, div48);
    			append_dev(div48, div47);
    			append_dev(div47, div44);
    			append_dev(div44, a1);
    			append_dev(a1, h31);
    			append_dev(a1, t83);
    			append_dev(a1, div43);
    			append_dev(div47, t85);
    			append_dev(div47, div46);
    			append_dev(div46, a2);
    			append_dev(a2, h32);
    			append_dev(a2, t86);
    			append_dev(a2, div45);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div51);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalDatosPaciente", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalDatosPaciente> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalDatosPaciente extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalDatosPaciente",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\componentes\ModalNuevaAtencion.svelte generated by Svelte v3.29.0 */

    const file$6 = "src\\componentes\\ModalNuevaAtencion.svelte";

    function create_fragment$7(ctx) {
    	let div15;
    	let div14;
    	let div13;
    	let form;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span0;
    	let t3;
    	let div11;
    	let h60;
    	let t5;
    	let div5;
    	let div4;
    	let div1;
    	let label0;
    	let input0;
    	let t6;
    	let span1;
    	let t7;
    	let span2;
    	let t9;
    	let div2;
    	let label1;
    	let input1;
    	let t10;
    	let span3;
    	let t11;
    	let span4;
    	let t13;
    	let div3;
    	let label2;
    	let input2;
    	let t14;
    	let span5;
    	let t15;
    	let span6;
    	let t17;
    	let br0;
    	let t18;
    	let div6;
    	let h61;
    	let t20;
    	let textarea;
    	let t21;
    	let br1;
    	let t22;
    	let div10;
    	let div9;
    	let div7;
    	let i;
    	let t23;
    	let div8;
    	let strong;
    	let t25;
    	let span7;
    	let t27;
    	let div12;
    	let button1;
    	let t29;
    	let button2;

    	const block = {
    		c: function create() {
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			form = element("form");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Nueva atención";
    			t1 = space();
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			div11 = element("div");
    			h60 = element("h6");
    			h60.textContent = "Tipo de atención";
    			t5 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t6 = space();
    			span1 = element("span");
    			t7 = space();
    			span2 = element("span");
    			span2.textContent = "Ambulatoria";
    			t9 = space();
    			div2 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t10 = space();
    			span3 = element("span");
    			t11 = space();
    			span4 = element("span");
    			span4.textContent = "Emergencia";
    			t13 = space();
    			div3 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t14 = space();
    			span5 = element("span");
    			t15 = space();
    			span6 = element("span");
    			span6.textContent = "Hospitalización";
    			t17 = space();
    			br0 = element("br");
    			t18 = space();
    			div6 = element("div");
    			h61 = element("h6");
    			h61.textContent = "Motivo de Consulta";
    			t20 = space();
    			textarea = element("textarea");
    			t21 = space();
    			br1 = element("br");
    			t22 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div7 = element("div");
    			i = element("i");
    			t23 = space();
    			div8 = element("div");
    			strong = element("strong");
    			strong.textContent = "--";
    			t25 = space();
    			span7 = element("span");
    			span7.textContent = "--";
    			t27 = space();
    			div12 = element("div");
    			button1 = element("button");
    			button1.textContent = "Cancelar";
    			t29 = space();
    			button2 = element("button");
    			button2.textContent = "Crear";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "myLargeModalLabel");
    			add_location(h5, file$6, 6, 24, 441);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$6, 8, 28, 647);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$6, 7, 24, 541);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$6, 5, 20, 389);
    			add_location(h60, file$6, 13, 24, 823);
    			attr_dev(input0, "type", "radio");
    			input0.checked = true;
    			attr_dev(input0, "name", "TipoAtencion");
    			attr_dev(input0, "data-bind", "checked: tipoAtencion");
    			input0.value = "A";
    			attr_dev(input0, "class", "cstm-switch-input");
    			add_location(input0, file$6, 18, 40, 1131);
    			attr_dev(span1, "class", "cstm-switch-indicator ");
    			add_location(span1, file$6, 20, 40, 1336);
    			attr_dev(span2, "class", "cstm-switch-description");
    			add_location(span2, file$6, 21, 40, 1422);
    			attr_dev(label0, "class", "cstm-switch cursor-hover");
    			add_location(label0, file$6, 17, 36, 1049);
    			attr_dev(div1, "class", " m-b-10 ml-2");
    			add_location(div1, file$6, 16, 32, 985);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "name", "TipoAtencion");
    			attr_dev(input1, "data-bind", "checked: tipoAtencion");
    			input1.value = "E";
    			attr_dev(input1, "class", "cstm-switch-input");
    			add_location(input1, file$6, 27, 40, 1734);
    			attr_dev(span3, "class", "cstm-switch-indicator ");
    			add_location(span3, file$6, 29, 40, 1931);
    			attr_dev(span4, "class", "cstm-switch-description");
    			add_location(span4, file$6, 30, 40, 2017);
    			attr_dev(label1, "class", "cstm-switch");
    			add_location(label1, file$6, 26, 36, 1665);
    			attr_dev(div2, "class", " m-b-10 ml-2");
    			add_location(div2, file$6, 25, 32, 1601);
    			attr_dev(input2, "type", "radio");
    			attr_dev(input2, "name", "TipoAtencion");
    			attr_dev(input2, "data-bind", "checked: tipoAtencion");
    			input2.value = "H";
    			attr_dev(input2, "class", "cstm-switch-input");
    			add_location(input2, file$6, 35, 40, 2326);
    			attr_dev(span5, "class", "cstm-switch-indicator ");
    			add_location(span5, file$6, 37, 40, 2523);
    			attr_dev(span6, "class", "cstm-switch-description");
    			add_location(span6, file$6, 38, 40, 2609);
    			attr_dev(label2, "class", "cstm-switch");
    			add_location(label2, file$6, 34, 36, 2257);
    			attr_dev(div3, "class", " m-b-10 ml-2");
    			add_location(div3, file$6, 33, 32, 2193);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$6, 15, 28, 934);
    			attr_dev(div5, "class", "col-md-12");
    			add_location(div5, file$6, 14, 24, 881);
    			add_location(br0, file$6, 44, 24, 2860);
    			add_location(h61, file$6, 46, 28, 2959);
    			attr_dev(textarea, "class", "form-control");
    			textarea.required = true;
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			set_style(textarea, "height", "150px");
    			attr_dev(textarea, "id", "exampleFormControlTextarea1");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "MotivoConsulta");
    			add_location(textarea, file$6, 47, 28, 3016);
    			add_location(br1, file$6, 50, 28, 3280);
    			attr_dev(div6, "data-bind", "visible: puedeCrear()");
    			add_location(div6, file$6, 45, 24, 2890);
    			attr_dev(i, "class", "mdi mdi-alert-circle-outline");
    			add_location(i, file$6, 57, 36, 3611);
    			attr_dev(div7, "class", "icon");
    			add_location(div7, file$6, 56, 32, 3555);
    			attr_dev(strong, "data-bind", "text: title");
    			add_location(strong, file$6, 60, 36, 3788);
    			attr_dev(span7, "data-bind", "text: message");
    			add_location(span7, file$6, 60, 82, 3834);
    			attr_dev(div8, "class", "content");
    			add_location(div8, file$6, 59, 32, 3729);
    			attr_dev(div9, "class", "d-flex");
    			add_location(div9, file$6, 55, 28, 3501);
    			attr_dev(div10, "class", "alert alert-border-warning");
    			attr_dev(div10, "data-bind", "visible: !puedeCrear(), using: warningMessage");
    			add_location(div10, file$6, 53, 24, 3344);
    			attr_dev(div11, "class", "modal-body");
    			add_location(div11, file$6, 12, 20, 773);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$6, 70, 24, 4130);
    			attr_dev(button2, "data-bind", "visible: puedeCrear()");
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "btn btn-primary");
    			add_location(button2, file$6, 71, 24, 4242);
    			attr_dev(div12, "class", "modal-footer");
    			add_location(div12, file$6, 69, 20, 4078);
    			attr_dev(form, "data-bind", "submit: crearAtencion");
    			attr_dev(form, "id", "frmCreacionAtencion");
    			add_location(form, file$6, 4, 16, 302);
    			attr_dev(div13, "class", "modal-content");
    			add_location(div13, file$6, 3, 12, 257);
    			attr_dev(div14, "class", "modal-dialog modal-dialog-centered modal-lg");
    			attr_dev(div14, "role", "document");
    			add_location(div14, file$6, 2, 8, 170);
    			attr_dev(div15, "class", "modal fade bd-example-modal-lg");
    			attr_dev(div15, "tabindex", "-1");
    			attr_dev(div15, "id", "modalNuevaAtencion");
    			attr_dev(div15, "role", "dialog");
    			attr_dev(div15, "aria-labelledby", "myLargeModalLabel");
    			attr_dev(div15, "aria-hidden", "true");
    			add_location(div15, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, form);
    			append_dev(form, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span0);
    			append_dev(form, t3);
    			append_dev(form, div11);
    			append_dev(div11, h60);
    			append_dev(div11, t5);
    			append_dev(div11, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t6);
    			append_dev(label0, span1);
    			append_dev(label0, t7);
    			append_dev(label0, span2);
    			append_dev(div4, t9);
    			append_dev(div4, div2);
    			append_dev(div2, label1);
    			append_dev(label1, input1);
    			append_dev(label1, t10);
    			append_dev(label1, span3);
    			append_dev(label1, t11);
    			append_dev(label1, span4);
    			append_dev(div4, t13);
    			append_dev(div4, div3);
    			append_dev(div3, label2);
    			append_dev(label2, input2);
    			append_dev(label2, t14);
    			append_dev(label2, span5);
    			append_dev(label2, t15);
    			append_dev(label2, span6);
    			append_dev(div11, t17);
    			append_dev(div11, br0);
    			append_dev(div11, t18);
    			append_dev(div11, div6);
    			append_dev(div6, h61);
    			append_dev(div6, t20);
    			append_dev(div6, textarea);
    			append_dev(div6, t21);
    			append_dev(div6, br1);
    			append_dev(div11, t22);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div7);
    			append_dev(div7, i);
    			append_dev(div9, t23);
    			append_dev(div9, div8);
    			append_dev(div8, strong);
    			append_dev(div8, t25);
    			append_dev(div8, span7);
    			append_dev(form, t27);
    			append_dev(form, div12);
    			append_dev(div12, button1);
    			append_dev(div12, t29);
    			append_dev(div12, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalNuevaAtencion", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalNuevaAtencion> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalNuevaAtencion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalNuevaAtencion",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\Pages\Paciente\Perfil.svelte generated by Svelte v3.29.0 */
    const file$7 = "src\\Pages\\Paciente\\Perfil.svelte";

    function create_fragment$8(ctx) {
    	let asidepacientes;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let div4;
    	let div3;
    	let div0;
    	let span0;
    	let t3;
    	let div2;
    	let h50;
    	let span1;
    	let t5;
    	let a0;
    	let i0;
    	let t6;
    	let t7;
    	let div1;
    	let span2;
    	let t9;
    	let span3;
    	let t11;
    	let div6;
    	let div5;
    	let a1;
    	let i1;
    	let t12;
    	let t13;
    	let div129;
    	let div128;
    	let div127;
    	let div88;
    	let div15;
    	let div13;
    	let div12;
    	let div11;
    	let i2;
    	let t14;
    	let t15;
    	let div14;
    	let textarea;
    	let t16;
    	let div39;
    	let div18;
    	let div17;
    	let div16;
    	let i3;
    	let t17;
    	let t18;
    	let div21;
    	let div20;
    	let a2;
    	let i4;
    	let t19;
    	let div19;
    	let button0;
    	let t21;
    	let button1;
    	let t23;
    	let button2;
    	let t25;
    	let div38;
    	let div37;
    	let div24;
    	let div22;
    	let i5;
    	let t26;
    	let t27;
    	let div23;
    	let p0;
    	let t29;
    	let div27;
    	let div25;
    	let i6;
    	let t30;
    	let t31;
    	let div26;
    	let p1;
    	let t33;
    	let div30;
    	let div28;
    	let i7;
    	let t34;
    	let t35;
    	let div29;
    	let p2;
    	let t37;
    	let div33;
    	let div31;
    	let i8;
    	let t38;
    	let t39;
    	let div32;
    	let p3;
    	let t41;
    	let div36;
    	let div34;
    	let i9;
    	let t42;
    	let t43;
    	let div35;
    	let p4;
    	let t45;
    	let div87;
    	let div40;
    	let h51;
    	let t47;
    	let p5;
    	let t49;
    	let div86;
    	let form;
    	let div42;
    	let h1;
    	let i10;
    	let t50;
    	let br0;
    	let t51;
    	let span4;
    	let t53;
    	let div41;
    	let a3;
    	let t55;
    	let br1;
    	let t56;
    	let div85;
    	let div52;
    	let div45;
    	let div44;
    	let div43;
    	let i11;
    	let t57;
    	let div48;
    	let div46;
    	let t59;
    	let div47;
    	let t61;
    	let div51;
    	let div50;
    	let a4;
    	let i12;
    	let t62;
    	let div49;
    	let button3;
    	let t64;
    	let button4;
    	let t66;
    	let button5;
    	let t68;
    	let div62;
    	let div55;
    	let div54;
    	let div53;
    	let i13;
    	let t69;
    	let div58;
    	let div56;
    	let t71;
    	let div57;
    	let t73;
    	let div61;
    	let div60;
    	let a5;
    	let i14;
    	let t74;
    	let div59;
    	let button6;
    	let t76;
    	let button7;
    	let t78;
    	let button8;
    	let t80;
    	let div73;
    	let div66;
    	let div65;
    	let div64;
    	let div63;
    	let i15;
    	let t81;
    	let div69;
    	let div67;
    	let t83;
    	let div68;
    	let t85;
    	let div72;
    	let div71;
    	let a6;
    	let i16;
    	let t86;
    	let div70;
    	let button9;
    	let t88;
    	let button10;
    	let t90;
    	let button11;
    	let t92;
    	let div84;
    	let div77;
    	let div76;
    	let div75;
    	let div74;
    	let i17;
    	let t93;
    	let div80;
    	let div78;
    	let t95;
    	let div79;
    	let t97;
    	let div83;
    	let div82;
    	let a7;
    	let i18;
    	let t98;
    	let div81;
    	let button12;
    	let t100;
    	let button13;
    	let t102;
    	let button14;
    	let t104;
    	let div114;
    	let div105;
    	let div91;
    	let div90;
    	let div89;
    	let i19;
    	let t105;
    	let t106;
    	let div104;
    	let div103;
    	let div94;
    	let h60;
    	let t108;
    	let hr0;
    	let t109;
    	let div92;
    	let t110;
    	let div93;
    	let strong0;
    	let t112;
    	let div102;
    	let div101;
    	let h61;
    	let t114;
    	let hr1;
    	let t115;
    	let div96;
    	let div95;
    	let strong1;
    	let t117;
    	let h62;
    	let t119;
    	let hr2;
    	let t120;
    	let div98;
    	let div97;
    	let strong2;
    	let t122;
    	let h63;
    	let t124;
    	let hr3;
    	let t125;
    	let div100;
    	let div99;
    	let strong3;
    	let t127;
    	let div113;
    	let div108;
    	let div107;
    	let div106;
    	let i20;
    	let t128;
    	let t129;
    	let div112;
    	let div110;
    	let input;
    	let t130;
    	let ul;
    	let div109;
    	let li0;
    	let a8;
    	let t132;
    	let li1;
    	let a9;
    	let t134;
    	let li2;
    	let a10;
    	let i21;
    	let t135;
    	let t136;
    	let div111;
    	let t137;
    	let button15;
    	let span5;
    	let t139;
    	let div126;
    	let div118;
    	let div117;
    	let div116;
    	let div115;
    	let i22;
    	let t140;
    	let t141;
    	let div125;
    	let div124;
    	let div123;
    	let div122;
    	let div121;
    	let strong4;
    	let t143;
    	let i23;
    	let t144;
    	let div119;
    	let t146;
    	let div120;
    	let t148;
    	let a11;
    	let i24;
    	let link_action;
    	let t149;
    	let modaldatospaciente;
    	let t150;
    	let modalnuevaatencion;
    	let current;
    	let mounted;
    	let dispose;
    	asidepacientes = new AsidePacientes({ $$inline: true });
    	header = new Header({ $$inline: true });
    	modaldatospaciente = new ModalDatosPaciente({ $$inline: true });
    	modalnuevaatencion = new ModalNuevaAtencion({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asidepacientes.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "HL";
    			t3 = space();
    			div2 = element("div");
    			h50 = element("h5");
    			span1 = element("span");
    			span1.textContent = "Fiordaliza De Jesus Herrera";
    			t5 = space();
    			a0 = element("a");
    			i0 = element("i");
    			t6 = text(" Ver\r\n                                        datos personales");
    			t7 = space();
    			div1 = element("div");
    			span2 = element("span");
    			span2.textContent = "49 años";
    			t9 = text(" | ");
    			span3 = element("span");
    			span3.textContent = "05600180675";
    			t11 = space();
    			div6 = element("div");
    			div5 = element("div");
    			a1 = element("a");
    			i1 = element("i");
    			t12 = text("\r\n                                Iniciar nueva atención");
    			t13 = space();
    			div129 = element("div");
    			div128 = element("div");
    			div127 = element("div");
    			div88 = element("div");
    			div15 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			i2 = element("i");
    			t14 = text("\r\n                            Comentario");
    			t15 = space();
    			div14 = element("div");
    			textarea = element("textarea");
    			t16 = space();
    			div39 = element("div");
    			div18 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			i3 = element("i");
    			t17 = text("\r\n                            Ultimos Signo Vitales");
    			t18 = space();
    			div21 = element("div");
    			div20 = element("div");
    			a2 = element("a");
    			i4 = element("i");
    			t19 = space();
    			div19 = element("div");
    			button0 = element("button");
    			button0.textContent = "Action";
    			t21 = space();
    			button1 = element("button");
    			button1.textContent = "Another action";
    			t23 = space();
    			button2 = element("button");
    			button2.textContent = "Something else here";
    			t25 = space();
    			div38 = element("div");
    			div37 = element("div");
    			div24 = element("div");
    			div22 = element("div");
    			i5 = element("i");
    			t26 = text(" Peso");
    			t27 = space();
    			div23 = element("div");
    			p0 = element("p");
    			p0.textContent = "0Lb";
    			t29 = space();
    			div27 = element("div");
    			div25 = element("div");
    			i6 = element("i");
    			t30 = text(" Temperatura");
    			t31 = space();
    			div26 = element("div");
    			p1 = element("p");
    			p1.textContent = "0°C";
    			t33 = space();
    			div30 = element("div");
    			div28 = element("div");
    			i7 = element("i");
    			t34 = text(" Frecuencia Respiratoria");
    			t35 = space();
    			div29 = element("div");
    			p2 = element("p");
    			p2.textContent = "0";
    			t37 = space();
    			div33 = element("div");
    			div31 = element("div");
    			i8 = element("i");
    			t38 = text(" Frecuencia Cardiaca");
    			t39 = space();
    			div32 = element("div");
    			p3 = element("p");
    			p3.textContent = "0";
    			t41 = space();
    			div36 = element("div");
    			div34 = element("div");
    			i9 = element("i");
    			t42 = text("  Presion Alterial (mmHg)");
    			t43 = space();
    			div35 = element("div");
    			p4 = element("p");
    			p4.textContent = "0/0";
    			t45 = space();
    			div87 = element("div");
    			div40 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Archivos o Documentos";
    			t47 = space();
    			p5 = element("p");
    			p5.textContent = "Puede subir documentos del paciente, como fotos de laboratorios, recetas entre otros.";
    			t49 = space();
    			div86 = element("div");
    			form = element("form");
    			div42 = element("div");
    			h1 = element("h1");
    			i10 = element("i");
    			t50 = text("\r\n                                    Puede arrastrar el documento a esta zona.");
    			br0 = element("br");
    			t51 = space();
    			span4 = element("span");
    			span4.textContent = "(Tambien puede hacer clic y seleccionar el archivo,\r\n                                        luego presione subir archivo).";
    			t53 = space();
    			div41 = element("div");
    			a3 = element("a");
    			a3.textContent = "Subir Archivo";
    			t55 = space();
    			br1 = element("br");
    			t56 = space();
    			div85 = element("div");
    			div52 = element("div");
    			div45 = element("div");
    			div44 = element("div");
    			div43 = element("div");
    			i11 = element("i");
    			t57 = space();
    			div48 = element("div");
    			div46 = element("div");
    			div46.textContent = "SRS Document";
    			t59 = space();
    			div47 = element("div");
    			div47.textContent = "25.5 Mb";
    			t61 = space();
    			div51 = element("div");
    			div50 = element("div");
    			a4 = element("a");
    			i12 = element("i");
    			t62 = space();
    			div49 = element("div");
    			button3 = element("button");
    			button3.textContent = "Action";
    			t64 = space();
    			button4 = element("button");
    			button4.textContent = "Another action";
    			t66 = space();
    			button5 = element("button");
    			button5.textContent = "Something else here";
    			t68 = space();
    			div62 = element("div");
    			div55 = element("div");
    			div54 = element("div");
    			div53 = element("div");
    			i13 = element("i");
    			t69 = space();
    			div58 = element("div");
    			div56 = element("div");
    			div56.textContent = "Design Guide.pdf";
    			t71 = space();
    			div57 = element("div");
    			div57.textContent = "9 Mb";
    			t73 = space();
    			div61 = element("div");
    			div60 = element("div");
    			a5 = element("a");
    			i14 = element("i");
    			t74 = space();
    			div59 = element("div");
    			button6 = element("button");
    			button6.textContent = "Action";
    			t76 = space();
    			button7 = element("button");
    			button7.textContent = "Another action";
    			t78 = space();
    			button8 = element("button");
    			button8.textContent = "Something else here";
    			t80 = space();
    			div73 = element("div");
    			div66 = element("div");
    			div65 = element("div");
    			div64 = element("div");
    			div63 = element("div");
    			i15 = element("i");
    			t81 = space();
    			div69 = element("div");
    			div67 = element("div");
    			div67.textContent = "response.json";
    			t83 = space();
    			div68 = element("div");
    			div68.textContent = "15 Kb";
    			t85 = space();
    			div72 = element("div");
    			div71 = element("div");
    			a6 = element("a");
    			i16 = element("i");
    			t86 = space();
    			div70 = element("div");
    			button9 = element("button");
    			button9.textContent = "Action";
    			t88 = space();
    			button10 = element("button");
    			button10.textContent = "Another action";
    			t90 = space();
    			button11 = element("button");
    			button11.textContent = "Something else here";
    			t92 = space();
    			div84 = element("div");
    			div77 = element("div");
    			div76 = element("div");
    			div75 = element("div");
    			div74 = element("div");
    			i17 = element("i");
    			t93 = space();
    			div80 = element("div");
    			div78 = element("div");
    			div78.textContent = "June Accounts.xls";
    			t95 = space();
    			div79 = element("div");
    			div79.textContent = "6 Mb";
    			t97 = space();
    			div83 = element("div");
    			div82 = element("div");
    			a7 = element("a");
    			i18 = element("i");
    			t98 = space();
    			div81 = element("div");
    			button12 = element("button");
    			button12.textContent = "Action";
    			t100 = space();
    			button13 = element("button");
    			button13.textContent = "Another action";
    			t102 = space();
    			button14 = element("button");
    			button14.textContent = "Something else here";
    			t104 = space();
    			div114 = element("div");
    			div105 = element("div");
    			div91 = element("div");
    			div90 = element("div");
    			div89 = element("div");
    			i19 = element("i");
    			t105 = text("\r\n                            Antecedentes");
    			t106 = space();
    			div104 = element("div");
    			div103 = element("div");
    			div94 = element("div");
    			h60 = element("h6");
    			h60.textContent = "Alergias";
    			t108 = space();
    			hr0 = element("hr");
    			t109 = space();
    			div92 = element("div");
    			t110 = space();
    			div93 = element("div");
    			strong0 = element("strong");
    			strong0.textContent = "No hay ningula alergia registrada";
    			t112 = space();
    			div102 = element("div");
    			div101 = element("div");
    			h61 = element("h6");
    			h61.textContent = "Antecedentes Patologicos";
    			t114 = space();
    			hr1 = element("hr");
    			t115 = space();
    			div96 = element("div");
    			div95 = element("div");
    			strong1 = element("strong");
    			strong1.textContent = "Ninguno registrado";
    			t117 = space();
    			h62 = element("h6");
    			h62.textContent = "Antecedentes no Patologicos";
    			t119 = space();
    			hr2 = element("hr");
    			t120 = space();
    			div98 = element("div");
    			div97 = element("div");
    			strong2 = element("strong");
    			strong2.textContent = "Ninguno registrado";
    			t122 = space();
    			h63 = element("h6");
    			h63.textContent = "Antecedentes Psiquiátricos";
    			t124 = space();
    			hr3 = element("hr");
    			t125 = space();
    			div100 = element("div");
    			div99 = element("div");
    			strong3 = element("strong");
    			strong3.textContent = "Ninguno registrado";
    			t127 = space();
    			div113 = element("div");
    			div108 = element("div");
    			div107 = element("div");
    			div106 = element("div");
    			i20 = element("i");
    			t128 = text("\r\n                            Medicamentos en uso");
    			t129 = space();
    			div112 = element("div");
    			div110 = element("div");
    			input = element("input");
    			t130 = space();
    			ul = element("ul");
    			div109 = element("div");
    			li0 = element("li");
    			a8 = element("a");
    			a8.textContent = "Metrocaps";
    			t132 = space();
    			li1 = element("li");
    			a9 = element("a");
    			a9.textContent = "Albendazol";
    			t134 = space();
    			li2 = element("li");
    			a10 = element("a");
    			i21 = element("i");
    			t135 = text(" Agregar manualmente");
    			t136 = space();
    			div111 = element("div");
    			t137 = text("AirPlus\r\n                                ");
    			button15 = element("button");
    			span5 = element("span");
    			span5.textContent = "×";
    			t139 = space();
    			div126 = element("div");
    			div118 = element("div");
    			div117 = element("div");
    			div116 = element("div");
    			div115 = element("div");
    			i22 = element("i");
    			t140 = text("\r\n                            Atenciones Recibidas");
    			t141 = space();
    			div125 = element("div");
    			div124 = element("div");
    			div123 = element("div");
    			div122 = element("div");
    			div121 = element("div");
    			strong4 = element("strong");
    			strong4.textContent = "4/5/2020";
    			t143 = space();
    			i23 = element("i");
    			t144 = space();
    			div119 = element("div");
    			div119.textContent = "Mariela Camilo";
    			t146 = space();
    			div120 = element("div");
    			div120.textContent = "Atención Ambulatoria";
    			t148 = space();
    			a11 = element("a");
    			i24 = element("i");
    			t149 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			t150 = space();
    			create_component(modalnuevaatencion.$$.fragment);
    			attr_dev(span0, "class", "avatar-title rounded-circle");
    			add_location(span0, file$7, 20, 32, 809);
    			attr_dev(div0, "class", "avatar mr-3  avatar-xl");
    			add_location(div0, file$7, 19, 28, 739);
    			add_location(span1, file$7, 23, 50, 1009);
    			attr_dev(i0, "class", "mdi mdi-comment-eye");
    			add_location(i0, file$7, 23, 196, 1155);
    			attr_dev(a0, "href", "#!");
    			attr_dev(a0, "class", "btn ml-2 btn-primary btn-sm");
    			attr_dev(a0, "data-toggle", "modal");
    			attr_dev(a0, "data-target", "#modalDatosPersonales");
    			add_location(a0, file$7, 23, 91, 1050);
    			attr_dev(h50, "class", "mt-0");
    			add_location(h50, file$7, 23, 32, 991);
    			add_location(span2, file$7, 25, 56, 1319);
    			add_location(span3, file$7, 25, 79, 1342);
    			attr_dev(div1, "class", "opacity-75");
    			add_location(div1, file$7, 25, 32, 1295);
    			attr_dev(div2, "class", "media-body m-auto");
    			add_location(div2, file$7, 22, 28, 926);
    			attr_dev(div3, "class", "media");
    			add_location(div3, file$7, 18, 24, 690);
    			attr_dev(div4, "class", "col-md-6 text-white p-b-30");
    			add_location(div4, file$7, 17, 20, 624);
    			attr_dev(i1, "class", "mdi mdi-progress-check");
    			add_location(i1, file$7, 33, 166, 1759);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "type", "button");
    			attr_dev(a1, "class", "btn text-white m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			attr_dev(a1, "data-toggle", "modal");
    			attr_dev(a1, "data-target", "#modalNuevaAtencion");
    			add_location(a1, file$7, 33, 28, 1621);
    			attr_dev(div5, "class", "dropdown");
    			add_location(div5, file$7, 32, 24, 1569);
    			attr_dev(div6, "class", "col-md-6");
    			set_style(div6, "text-align", "right");
    			add_location(div6, file$7, 31, 20, 1495);
    			attr_dev(div7, "class", "row p-b-60 p-t-60");
    			add_location(div7, file$7, 16, 16, 571);
    			attr_dev(div8, "class", "col-md-12");
    			add_location(div8, file$7, 15, 12, 530);
    			attr_dev(div9, "class", "");
    			add_location(div9, file$7, 14, 8, 502);
    			attr_dev(div10, "class", "bg-dark m-b-30");
    			add_location(div10, file$7, 13, 4, 464);
    			attr_dev(i2, "class", "mdi mdi-comment-account-outline mdi-18px");
    			add_location(i2, file$7, 54, 36, 2442);
    			attr_dev(div11, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div11, file$7, 53, 32, 2355);
    			attr_dev(div12, "class", "avatar mr-2 avatar-xs");
    			add_location(div12, file$7, 52, 28, 2286);
    			attr_dev(div13, "class", "card-header");
    			add_location(div13, file$7, 51, 24, 2231);
    			attr_dev(textarea, "class", "form-control mt-2");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			attr_dev(textarea, "id", "exampleFormControlTextarea1");
    			textarea.readOnly = "";
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "Comentario");
    			add_location(textarea, file$7, 60, 28, 2736);
    			attr_dev(div14, "class", "form-group col-lg-12");
    			add_location(div14, file$7, 59, 24, 2672);
    			attr_dev(div15, "class", "card m-b-30");
    			add_location(div15, file$7, 50, 20, 2180);
    			attr_dev(i3, "class", "mdi mdi-account-heart mdi-18px");
    			add_location(i3, file$7, 68, 36, 3238);
    			attr_dev(div16, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div16, file$7, 67, 32, 3151);
    			attr_dev(div17, "class", "avatar mr-2 avatar-xs");
    			add_location(div17, file$7, 66, 28, 3082);
    			attr_dev(div18, "class", "card-header");
    			add_location(div18, file$7, 65, 24, 3027);
    			attr_dev(i4, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i4, file$7, 75, 112, 3662);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "data-toggle", "dropdown");
    			attr_dev(a2, "aria-haspopup", "true");
    			attr_dev(a2, "aria-expanded", "false");
    			add_location(a2, file$7, 75, 32, 3582);
    			attr_dev(button0, "class", "dropdown-item");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$7, 78, 36, 3831);
    			attr_dev(button1, "class", "dropdown-item");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$7, 79, 36, 3928);
    			attr_dev(button2, "class", "dropdown-item");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file$7, 80, 36, 4033);
    			attr_dev(div19, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div19, file$7, 77, 32, 3746);
    			attr_dev(div20, "class", "dropdown");
    			add_location(div20, file$7, 74, 28, 3526);
    			attr_dev(div21, "class", "card-controls");
    			add_location(div21, file$7, 73, 24, 3469);
    			attr_dev(i5, "class", "mdi mdi-speedometer mdi-18px");
    			add_location(i5, file$7, 90, 40, 4513);
    			attr_dev(div22, "class", "col-lg-9 col-sm-10");
    			add_location(div22, file$7, 89, 36, 4439);
    			add_location(p0, file$7, 93, 40, 4717);
    			attr_dev(div23, "class", "col-lg-3 col-sm-2");
    			add_location(div23, file$7, 92, 36, 4644);
    			attr_dev(div24, "class", "row");
    			add_location(div24, file$7, 88, 32, 4384);
    			attr_dev(i6, "class", "mdi mdi-thermometer mdi-18px");
    			add_location(i6, file$7, 99, 40, 4976);
    			attr_dev(div25, "class", "col-lg-9 col-sm-10");
    			add_location(div25, file$7, 98, 36, 4902);
    			add_location(p1, file$7, 102, 40, 5187);
    			attr_dev(div26, "class", "col-lg-3 col-sm-2");
    			add_location(div26, file$7, 101, 36, 5114);
    			attr_dev(div27, "class", "row");
    			add_location(div27, file$7, 97, 32, 4847);
    			attr_dev(i7, "class", "mdi mdi-chart-line mdi-18px");
    			add_location(i7, file$7, 107, 40, 5444);
    			attr_dev(div28, "class", "col-lg-9 col-sm-10");
    			add_location(div28, file$7, 106, 36, 5370);
    			add_location(p2, file$7, 110, 40, 5666);
    			attr_dev(div29, "class", "col-lg-3 col-sm-2");
    			add_location(div29, file$7, 109, 36, 5593);
    			attr_dev(div30, "class", "row");
    			add_location(div30, file$7, 105, 32, 5315);
    			attr_dev(i8, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i8, file$7, 115, 40, 5921);
    			attr_dev(div31, "class", "col-lg-9 col-sm-10");
    			add_location(div31, file$7, 114, 36, 5847);
    			add_location(p3, file$7, 118, 40, 6140);
    			attr_dev(div32, "class", "col-lg-3 col-sm-2");
    			add_location(div32, file$7, 117, 36, 6067);
    			attr_dev(div33, "class", "row");
    			add_location(div33, file$7, 113, 32, 5792);
    			attr_dev(i9, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i9, file$7, 123, 40, 6395);
    			attr_dev(div34, "class", "col-lg-9 col-sm-10");
    			add_location(div34, file$7, 122, 36, 6321);
    			add_location(p4, file$7, 126, 40, 6620);
    			attr_dev(div35, "class", "col-lg-3 col-sm-2");
    			add_location(div35, file$7, 125, 36, 6547);
    			attr_dev(div36, "class", "row");
    			add_location(div36, file$7, 121, 32, 6266);
    			attr_dev(div37, "class", "list-group-item ");
    			add_location(div37, file$7, 86, 28, 4318);
    			attr_dev(div38, "class", "list-group list  list-group-flush");
    			add_location(div38, file$7, 84, 24, 4239);
    			attr_dev(div39, "class", "card m-b-30");
    			add_location(div39, file$7, 64, 20, 2976);
    			attr_dev(h51, "class", "m-b-0");
    			add_location(h51, file$7, 137, 28, 6993);
    			attr_dev(p5, "class", "m-b-0 mt-2 text-muted");
    			add_location(p5, file$7, 140, 28, 7131);
    			attr_dev(div40, "class", "card-header");
    			add_location(div40, file$7, 136, 24, 6938);
    			attr_dev(i10, "class", " mdi mdi-progress-upload");
    			add_location(i10, file$7, 150, 40, 7639);
    			attr_dev(h1, "class", "display-4");
    			add_location(h1, file$7, 149, 36, 7575);
    			add_location(br0, file$7, 152, 77, 7801);
    			attr_dev(span4, "class", "note needsclick");
    			add_location(span4, file$7, 153, 36, 7843);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "btn btn-lg btn-primary");
    			add_location(a3, file$7, 156, 40, 8102);
    			attr_dev(div41, "class", "p-t-5");
    			add_location(div41, file$7, 155, 36, 8041);
    			attr_dev(div42, "class", "dz-message");
    			add_location(div42, file$7, 148, 32, 7513);
    			attr_dev(form, "class", "dropzone dz-clickable");
    			attr_dev(form, "action", "/");
    			add_location(form, file$7, 147, 28, 7432);
    			add_location(br1, file$7, 160, 35, 8286);
    			attr_dev(i11, "class", "mdi mdi-24px mdi-file-pdf");
    			add_location(i11, file$7, 167, 86, 8675);
    			attr_dev(div43, "class", "avatar-title bg-dark rounded");
    			add_location(div43, file$7, 167, 44, 8633);
    			attr_dev(div44, "class", "avatar avatar-sm ");
    			add_location(div44, file$7, 166, 40, 8556);
    			attr_dev(div45, "class", "m-r-20");
    			add_location(div45, file$7, 165, 36, 8494);
    			add_location(div46, file$7, 171, 40, 8908);
    			attr_dev(div47, "class", "text-muted");
    			add_location(div47, file$7, 172, 40, 8973);
    			attr_dev(div48, "class", "");
    			add_location(div48, file$7, 170, 36, 8852);
    			attr_dev(i12, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i12, file$7, 177, 124, 9305);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "data-toggle", "dropdown");
    			attr_dev(a4, "aria-haspopup", "true");
    			attr_dev(a4, "aria-expanded", "false");
    			add_location(a4, file$7, 177, 44, 9225);
    			attr_dev(button3, "class", "dropdown-item");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file$7, 181, 48, 9547);
    			attr_dev(button4, "class", "dropdown-item");
    			attr_dev(button4, "type", "button");
    			add_location(button4, file$7, 182, 48, 9656);
    			attr_dev(button5, "class", "dropdown-item");
    			attr_dev(button5, "type", "button");
    			add_location(button5, file$7, 183, 48, 9773);
    			attr_dev(div49, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div49, file$7, 180, 44, 9450);
    			attr_dev(div50, "class", "dropdown");
    			add_location(div50, file$7, 176, 40, 9157);
    			attr_dev(div51, "class", "ml-auto");
    			add_location(div51, file$7, 175, 36, 9094);
    			attr_dev(div52, "class", "list-group-item d-flex  align-items-center");
    			add_location(div52, file$7, 164, 32, 8400);
    			attr_dev(i13, "class", "mdi mdi-24px mdi-file-document-box");
    			add_location(i13, file$7, 192, 86, 10340);
    			attr_dev(div53, "class", "avatar-title bg-dark rounded");
    			add_location(div53, file$7, 192, 44, 10298);
    			attr_dev(div54, "class", "avatar avatar-sm ");
    			add_location(div54, file$7, 191, 40, 10221);
    			attr_dev(div55, "class", "m-r-20");
    			add_location(div55, file$7, 190, 36, 10159);
    			add_location(div56, file$7, 196, 40, 10582);
    			attr_dev(div57, "class", "text-muted");
    			add_location(div57, file$7, 197, 40, 10651);
    			attr_dev(div58, "class", "");
    			add_location(div58, file$7, 195, 36, 10526);
    			attr_dev(i14, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i14, file$7, 202, 124, 10980);
    			attr_dev(a5, "href", "#!");
    			attr_dev(a5, "data-toggle", "dropdown");
    			attr_dev(a5, "aria-haspopup", "true");
    			attr_dev(a5, "aria-expanded", "false");
    			add_location(a5, file$7, 202, 44, 10900);
    			attr_dev(button6, "class", "dropdown-item");
    			attr_dev(button6, "type", "button");
    			add_location(button6, file$7, 206, 48, 11222);
    			attr_dev(button7, "class", "dropdown-item");
    			attr_dev(button7, "type", "button");
    			add_location(button7, file$7, 207, 48, 11331);
    			attr_dev(button8, "class", "dropdown-item");
    			attr_dev(button8, "type", "button");
    			add_location(button8, file$7, 208, 48, 11448);
    			attr_dev(div59, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div59, file$7, 205, 44, 11125);
    			attr_dev(div60, "class", "dropdown");
    			add_location(div60, file$7, 201, 40, 10832);
    			attr_dev(div61, "class", "ml-auto");
    			add_location(div61, file$7, 200, 36, 10769);
    			attr_dev(div62, "class", "list-group-item d-flex  align-items-center");
    			add_location(div62, file$7, 189, 32, 10065);
    			attr_dev(i15, "class", "mdi mdi-24px mdi-code-braces");
    			add_location(i15, file$7, 218, 83, 12089);
    			attr_dev(div63, "class", "avatar-title  rounded");
    			add_location(div63, file$7, 218, 48, 12054);
    			attr_dev(div64, "class", "avatar avatar-sm ");
    			add_location(div64, file$7, 217, 44, 11973);
    			attr_dev(div65, "class", "avatar avatar-sm ");
    			add_location(div65, file$7, 216, 40, 11896);
    			attr_dev(div66, "class", "m-r-20");
    			add_location(div66, file$7, 215, 36, 11834);
    			add_location(div67, file$7, 223, 40, 12377);
    			attr_dev(div68, "class", "text-muted");
    			add_location(div68, file$7, 224, 40, 12443);
    			attr_dev(div69, "class", "");
    			add_location(div69, file$7, 222, 36, 12321);
    			attr_dev(i16, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i16, file$7, 229, 124, 12773);
    			attr_dev(a6, "href", "#!");
    			attr_dev(a6, "data-toggle", "dropdown");
    			attr_dev(a6, "aria-haspopup", "true");
    			attr_dev(a6, "aria-expanded", "false");
    			add_location(a6, file$7, 229, 44, 12693);
    			attr_dev(button9, "class", "dropdown-item");
    			attr_dev(button9, "type", "button");
    			add_location(button9, file$7, 233, 48, 13015);
    			attr_dev(button10, "class", "dropdown-item");
    			attr_dev(button10, "type", "button");
    			add_location(button10, file$7, 234, 48, 13124);
    			attr_dev(button11, "class", "dropdown-item");
    			attr_dev(button11, "type", "button");
    			add_location(button11, file$7, 235, 48, 13241);
    			attr_dev(div70, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div70, file$7, 232, 44, 12918);
    			attr_dev(div71, "class", "dropdown");
    			add_location(div71, file$7, 228, 40, 12625);
    			attr_dev(div72, "class", "ml-auto");
    			add_location(div72, file$7, 227, 36, 12562);
    			attr_dev(div73, "class", "list-group-item d-flex  align-items-center");
    			add_location(div73, file$7, 214, 32, 11740);
    			attr_dev(i17, "class", "mdi mdi-24px mdi-file-excel");
    			add_location(i17, file$7, 245, 91, 13890);
    			attr_dev(div74, "class", "avatar-title bg-green rounded");
    			add_location(div74, file$7, 245, 48, 13847);
    			attr_dev(div75, "class", "avatar avatar-sm ");
    			add_location(div75, file$7, 244, 44, 13766);
    			attr_dev(div76, "class", "avatar avatar-sm ");
    			add_location(div76, file$7, 243, 40, 13689);
    			attr_dev(div77, "class", "m-r-20");
    			add_location(div77, file$7, 242, 36, 13627);
    			add_location(div78, file$7, 250, 40, 14177);
    			attr_dev(div79, "class", "text-muted");
    			add_location(div79, file$7, 251, 40, 14247);
    			attr_dev(div80, "class", "");
    			add_location(div80, file$7, 249, 36, 14121);
    			attr_dev(i18, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i18, file$7, 256, 124, 14576);
    			attr_dev(a7, "href", "#!");
    			attr_dev(a7, "data-toggle", "dropdown");
    			attr_dev(a7, "aria-haspopup", "true");
    			attr_dev(a7, "aria-expanded", "false");
    			add_location(a7, file$7, 256, 44, 14496);
    			attr_dev(button12, "class", "dropdown-item");
    			attr_dev(button12, "type", "button");
    			add_location(button12, file$7, 260, 48, 14818);
    			attr_dev(button13, "class", "dropdown-item");
    			attr_dev(button13, "type", "button");
    			add_location(button13, file$7, 261, 48, 14927);
    			attr_dev(button14, "class", "dropdown-item");
    			attr_dev(button14, "type", "button");
    			add_location(button14, file$7, 262, 48, 15044);
    			attr_dev(div81, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div81, file$7, 259, 44, 14721);
    			attr_dev(div82, "class", "dropdown");
    			add_location(div82, file$7, 255, 40, 14428);
    			attr_dev(div83, "class", "ml-auto");
    			add_location(div83, file$7, 254, 36, 14365);
    			attr_dev(div84, "class", "list-group-item d-flex  align-items-center");
    			add_location(div84, file$7, 241, 32, 13533);
    			attr_dev(div85, "class", "list-group list-group-flush ");
    			add_location(div85, file$7, 162, 28, 8322);
    			attr_dev(div86, "class", "card-body");
    			add_location(div86, file$7, 144, 24, 7375);
    			attr_dev(div87, "class", "card m-b-30 d-none");
    			add_location(div87, file$7, 135, 20, 6880);
    			attr_dev(div88, "class", "col-lg-3");
    			add_location(div88, file$7, 48, 16, 2134);
    			attr_dev(i19, "class", "mdi mdi-history mdi-18px");
    			add_location(i19, file$7, 279, 36, 15751);
    			attr_dev(div89, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div89, file$7, 278, 32, 15664);
    			attr_dev(div90, "class", "avatar mr-2 avatar-xs");
    			add_location(div90, file$7, 277, 28, 15595);
    			attr_dev(div91, "class", "card-header");
    			add_location(div91, file$7, 276, 24, 15540);
    			add_location(h60, file$7, 287, 36, 16169);
    			add_location(hr0, file$7, 288, 36, 16224);
    			attr_dev(div92, "class", "alert alert-danger d-none");
    			attr_dev(div92, "role", "alert");
    			add_location(div92, file$7, 289, 36, 16266);
    			add_location(strong0, file$7, 291, 40, 16443);
    			attr_dev(div93, "class", "alert alert-light d-block");
    			add_location(div93, file$7, 290, 36, 16362);
    			attr_dev(div94, "class", "prueba col-md-12");
    			add_location(div94, file$7, 286, 32, 16101);
    			add_location(h61, file$7, 297, 40, 16730);
    			add_location(hr1, file$7, 298, 40, 16806);
    			attr_dev(strong1, "class", "text-muted");
    			add_location(strong1, file$7, 301, 48, 16999);
    			add_location(div95, file$7, 300, 44, 16944);
    			attr_dev(div96, "class", "alert alert-success");
    			attr_dev(div96, "role", "alert");
    			add_location(div96, file$7, 299, 40, 16852);
    			add_location(h62, file$7, 306, 40, 17359);
    			add_location(hr2, file$7, 307, 40, 17437);
    			attr_dev(strong2, "class", "text-muted");
    			add_location(strong2, file$7, 310, 48, 17630);
    			add_location(div97, file$7, 309, 44, 17575);
    			attr_dev(div98, "class", "alert alert-success");
    			attr_dev(div98, "role", "alert");
    			add_location(div98, file$7, 308, 40, 17483);
    			add_location(h63, file$7, 315, 40, 17990);
    			add_location(hr3, file$7, 316, 40, 18067);
    			attr_dev(strong3, "class", "text-muted");
    			add_location(strong3, file$7, 319, 48, 18260);
    			add_location(div99, file$7, 318, 44, 18205);
    			attr_dev(div100, "class", "alert alert-success");
    			attr_dev(div100, "role", "alert");
    			add_location(div100, file$7, 317, 40, 18113);
    			attr_dev(div101, "class", "prueba col-md-12");
    			add_location(div101, file$7, 296, 36, 16658);
    			add_location(div102, file$7, 295, 32, 16615);
    			attr_dev(div103, "class", "accordion ");
    			attr_dev(div103, "id", "accordionExample3");
    			add_location(div103, file$7, 285, 28, 16020);
    			attr_dev(div104, "class", "card-body");
    			add_location(div104, file$7, 284, 24, 15967);
    			attr_dev(div105, "class", "card m-b-30");
    			add_location(div105, file$7, 275, 20, 15489);
    			attr_dev(i20, "class", "mdi mdi-comment-account-outline mdi-18px");
    			add_location(i20, file$7, 334, 36, 19016);
    			attr_dev(div106, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div106, file$7, 333, 32, 18929);
    			attr_dev(div107, "class", "avatar mr-2 avatar-xs");
    			add_location(div107, file$7, 332, 28, 18860);
    			attr_dev(div108, "class", " card-header");
    			add_location(div108, file$7, 331, 24, 18804);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "name", "");
    			attr_dev(input, "id", "");
    			attr_dev(input, "data-toggle", "dropdown");
    			attr_dev(input, "aria-haspopup", "true");
    			attr_dev(input, "aria-expanded", "false");
    			add_location(input, file$7, 342, 32, 19384);
    			attr_dev(a8, "href", "#!");
    			add_location(a8, file$7, 346, 44, 19751);
    			add_location(li0, file$7, 345, 40, 19701);
    			attr_dev(a9, "href", "#!");
    			add_location(a9, file$7, 349, 44, 19916);
    			add_location(li1, file$7, 348, 40, 19866);
    			attr_dev(div109, "class", "contenidoLista");
    			add_location(div109, file$7, 344, 36, 19631);
    			attr_dev(i21, "class", "mdi mdi-plus");
    			add_location(i21, file$7, 353, 53, 20147);
    			attr_dev(a10, "href", "#!");
    			add_location(a10, file$7, 353, 40, 20134);
    			attr_dev(li2, "class", "defecto");
    			add_location(li2, file$7, 352, 36, 20072);
    			attr_dev(ul, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul, "id", "buscador");
    			add_location(ul, file$7, 343, 32, 19538);
    			attr_dev(div110, "class", "form-group buscardor dropdown");
    			add_location(div110, file$7, 341, 28, 19307);
    			attr_dev(span5, "aria-hidden", "true");
    			add_location(span5, file$7, 360, 36, 20612);
    			attr_dev(button15, "type", "button");
    			attr_dev(button15, "class", "close");
    			attr_dev(button15, "data-dismiss", "alert");
    			attr_dev(button15, "aria-label", "Close");
    			add_location(button15, file$7, 359, 32, 20498);
    			attr_dev(div111, "class", "alert alert-secondary alert-dismissible fade show");
    			attr_dev(div111, "role", "alert");
    			add_location(div111, file$7, 357, 28, 20347);
    			attr_dev(div112, "class", "col-12");
    			add_location(div112, file$7, 340, 24, 19257);
    			attr_dev(div113, "class", "card m-b-30 d-none");
    			add_location(div113, file$7, 330, 20, 18746);
    			attr_dev(div114, "class", "col-md-6 ");
    			add_location(div114, file$7, 274, 16, 15444);
    			attr_dev(i22, "class", "mdi mdi-progress-check mdi-18px");
    			add_location(i22, file$7, 431, 36, 24296);
    			attr_dev(div115, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div115, file$7, 430, 32, 24209);
    			attr_dev(div116, "class", "avatar mr-2 avatar-xs");
    			add_location(div116, file$7, 429, 28, 24140);
    			attr_dev(div117, "class", "card-header");
    			add_location(div117, file$7, 428, 24, 24085);
    			attr_dev(div118, "class", "card m-b-30");
    			add_location(div118, file$7, 427, 20, 24034);
    			add_location(strong4, file$7, 443, 40, 24879);
    			attr_dev(i23, "class", "mdi mdi-checkbox-blank-circle text-secondary");
    			add_location(i23, file$7, 444, 40, 24946);
    			add_location(div119, file$7, 445, 40, 25048);
    			add_location(div120, file$7, 446, 40, 25115);
    			attr_dev(div121, "class", "content");
    			add_location(div121, file$7, 442, 36, 24816);
    			attr_dev(div122, "class", "d-flex");
    			add_location(div122, file$7, 441, 32, 24758);
    			attr_dev(i24, "class", "mdi mdi-open-in-new");
    			add_location(i24, file$7, 450, 36, 25427);
    			attr_dev(a11, "class", "close");
    			attr_dev(a11, "data-toggle", "tooltip");
    			attr_dev(a11, "data-placement", "top");
    			attr_dev(a11, "data-original-title", "Ir");
    			attr_dev(a11, "href", "/AtencionMedica/Resumen");
    			add_location(a11, file$7, 449, 32, 25264);
    			attr_dev(div123, "class", "alert alert-border-success  alert-dismissible fade show");
    			attr_dev(div123, "role", "alert");
    			add_location(div123, file$7, 440, 28, 24642);
    			add_location(div124, file$7, 439, 24, 24607);
    			attr_dev(div125, "class", "atenciones-vnc");
    			add_location(div125, file$7, 438, 20, 24553);
    			attr_dev(div126, "class", "col-md-3");
    			add_location(div126, file$7, 369, 16, 20876);
    			attr_dev(div127, "class", "row");
    			add_location(div127, file$7, 45, 12, 2095);
    			attr_dev(div128, "class", "col-md-12");
    			add_location(div128, file$7, 44, 8, 2058);
    			attr_dev(div129, "class", "pull-up");
    			add_location(div129, file$7, 43, 4, 2027);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$7, 12, 2, 427);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$7, 10, 0, 384);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asidepacientes, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t1);
    			append_dev(main, section);
    			append_dev(section, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, span0);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, h50);
    			append_dev(h50, span1);
    			append_dev(h50, t5);
    			append_dev(h50, a0);
    			append_dev(a0, i0);
    			append_dev(a0, t6);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, span2);
    			append_dev(div1, t9);
    			append_dev(div1, span3);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, a1);
    			append_dev(a1, i1);
    			append_dev(a1, t12);
    			append_dev(section, t13);
    			append_dev(section, div129);
    			append_dev(div129, div128);
    			append_dev(div128, div127);
    			append_dev(div127, div88);
    			append_dev(div88, div15);
    			append_dev(div15, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, i2);
    			append_dev(div13, t14);
    			append_dev(div15, t15);
    			append_dev(div15, div14);
    			append_dev(div14, textarea);
    			append_dev(div88, t16);
    			append_dev(div88, div39);
    			append_dev(div39, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, i3);
    			append_dev(div18, t17);
    			append_dev(div39, t18);
    			append_dev(div39, div21);
    			append_dev(div21, div20);
    			append_dev(div20, a2);
    			append_dev(a2, i4);
    			append_dev(div20, t19);
    			append_dev(div20, div19);
    			append_dev(div19, button0);
    			append_dev(div19, t21);
    			append_dev(div19, button1);
    			append_dev(div19, t23);
    			append_dev(div19, button2);
    			append_dev(div39, t25);
    			append_dev(div39, div38);
    			append_dev(div38, div37);
    			append_dev(div37, div24);
    			append_dev(div24, div22);
    			append_dev(div22, i5);
    			append_dev(div22, t26);
    			append_dev(div24, t27);
    			append_dev(div24, div23);
    			append_dev(div23, p0);
    			append_dev(div37, t29);
    			append_dev(div37, div27);
    			append_dev(div27, div25);
    			append_dev(div25, i6);
    			append_dev(div25, t30);
    			append_dev(div27, t31);
    			append_dev(div27, div26);
    			append_dev(div26, p1);
    			append_dev(div37, t33);
    			append_dev(div37, div30);
    			append_dev(div30, div28);
    			append_dev(div28, i7);
    			append_dev(div28, t34);
    			append_dev(div30, t35);
    			append_dev(div30, div29);
    			append_dev(div29, p2);
    			append_dev(div37, t37);
    			append_dev(div37, div33);
    			append_dev(div33, div31);
    			append_dev(div31, i8);
    			append_dev(div31, t38);
    			append_dev(div33, t39);
    			append_dev(div33, div32);
    			append_dev(div32, p3);
    			append_dev(div37, t41);
    			append_dev(div37, div36);
    			append_dev(div36, div34);
    			append_dev(div34, i9);
    			append_dev(div34, t42);
    			append_dev(div36, t43);
    			append_dev(div36, div35);
    			append_dev(div35, p4);
    			append_dev(div88, t45);
    			append_dev(div88, div87);
    			append_dev(div87, div40);
    			append_dev(div40, h51);
    			append_dev(div40, t47);
    			append_dev(div40, p5);
    			append_dev(div87, t49);
    			append_dev(div87, div86);
    			append_dev(div86, form);
    			append_dev(form, div42);
    			append_dev(div42, h1);
    			append_dev(h1, i10);
    			append_dev(div42, t50);
    			append_dev(div42, br0);
    			append_dev(div42, t51);
    			append_dev(div42, span4);
    			append_dev(div42, t53);
    			append_dev(div42, div41);
    			append_dev(div41, a3);
    			append_dev(form, t55);
    			append_dev(div86, br1);
    			append_dev(div86, t56);
    			append_dev(div86, div85);
    			append_dev(div85, div52);
    			append_dev(div52, div45);
    			append_dev(div45, div44);
    			append_dev(div44, div43);
    			append_dev(div43, i11);
    			append_dev(div52, t57);
    			append_dev(div52, div48);
    			append_dev(div48, div46);
    			append_dev(div48, t59);
    			append_dev(div48, div47);
    			append_dev(div52, t61);
    			append_dev(div52, div51);
    			append_dev(div51, div50);
    			append_dev(div50, a4);
    			append_dev(a4, i12);
    			append_dev(div50, t62);
    			append_dev(div50, div49);
    			append_dev(div49, button3);
    			append_dev(div49, t64);
    			append_dev(div49, button4);
    			append_dev(div49, t66);
    			append_dev(div49, button5);
    			append_dev(div85, t68);
    			append_dev(div85, div62);
    			append_dev(div62, div55);
    			append_dev(div55, div54);
    			append_dev(div54, div53);
    			append_dev(div53, i13);
    			append_dev(div62, t69);
    			append_dev(div62, div58);
    			append_dev(div58, div56);
    			append_dev(div58, t71);
    			append_dev(div58, div57);
    			append_dev(div62, t73);
    			append_dev(div62, div61);
    			append_dev(div61, div60);
    			append_dev(div60, a5);
    			append_dev(a5, i14);
    			append_dev(div60, t74);
    			append_dev(div60, div59);
    			append_dev(div59, button6);
    			append_dev(div59, t76);
    			append_dev(div59, button7);
    			append_dev(div59, t78);
    			append_dev(div59, button8);
    			append_dev(div85, t80);
    			append_dev(div85, div73);
    			append_dev(div73, div66);
    			append_dev(div66, div65);
    			append_dev(div65, div64);
    			append_dev(div64, div63);
    			append_dev(div63, i15);
    			append_dev(div73, t81);
    			append_dev(div73, div69);
    			append_dev(div69, div67);
    			append_dev(div69, t83);
    			append_dev(div69, div68);
    			append_dev(div73, t85);
    			append_dev(div73, div72);
    			append_dev(div72, div71);
    			append_dev(div71, a6);
    			append_dev(a6, i16);
    			append_dev(div71, t86);
    			append_dev(div71, div70);
    			append_dev(div70, button9);
    			append_dev(div70, t88);
    			append_dev(div70, button10);
    			append_dev(div70, t90);
    			append_dev(div70, button11);
    			append_dev(div85, t92);
    			append_dev(div85, div84);
    			append_dev(div84, div77);
    			append_dev(div77, div76);
    			append_dev(div76, div75);
    			append_dev(div75, div74);
    			append_dev(div74, i17);
    			append_dev(div84, t93);
    			append_dev(div84, div80);
    			append_dev(div80, div78);
    			append_dev(div80, t95);
    			append_dev(div80, div79);
    			append_dev(div84, t97);
    			append_dev(div84, div83);
    			append_dev(div83, div82);
    			append_dev(div82, a7);
    			append_dev(a7, i18);
    			append_dev(div82, t98);
    			append_dev(div82, div81);
    			append_dev(div81, button12);
    			append_dev(div81, t100);
    			append_dev(div81, button13);
    			append_dev(div81, t102);
    			append_dev(div81, button14);
    			append_dev(div127, t104);
    			append_dev(div127, div114);
    			append_dev(div114, div105);
    			append_dev(div105, div91);
    			append_dev(div91, div90);
    			append_dev(div90, div89);
    			append_dev(div89, i19);
    			append_dev(div91, t105);
    			append_dev(div105, t106);
    			append_dev(div105, div104);
    			append_dev(div104, div103);
    			append_dev(div103, div94);
    			append_dev(div94, h60);
    			append_dev(div94, t108);
    			append_dev(div94, hr0);
    			append_dev(div94, t109);
    			append_dev(div94, div92);
    			append_dev(div94, t110);
    			append_dev(div94, div93);
    			append_dev(div93, strong0);
    			append_dev(div103, t112);
    			append_dev(div103, div102);
    			append_dev(div102, div101);
    			append_dev(div101, h61);
    			append_dev(div101, t114);
    			append_dev(div101, hr1);
    			append_dev(div101, t115);
    			append_dev(div101, div96);
    			append_dev(div96, div95);
    			append_dev(div95, strong1);
    			append_dev(div101, t117);
    			append_dev(div101, h62);
    			append_dev(div101, t119);
    			append_dev(div101, hr2);
    			append_dev(div101, t120);
    			append_dev(div101, div98);
    			append_dev(div98, div97);
    			append_dev(div97, strong2);
    			append_dev(div101, t122);
    			append_dev(div101, h63);
    			append_dev(div101, t124);
    			append_dev(div101, hr3);
    			append_dev(div101, t125);
    			append_dev(div101, div100);
    			append_dev(div100, div99);
    			append_dev(div99, strong3);
    			append_dev(div114, t127);
    			append_dev(div114, div113);
    			append_dev(div113, div108);
    			append_dev(div108, div107);
    			append_dev(div107, div106);
    			append_dev(div106, i20);
    			append_dev(div108, t128);
    			append_dev(div113, t129);
    			append_dev(div113, div112);
    			append_dev(div112, div110);
    			append_dev(div110, input);
    			append_dev(div110, t130);
    			append_dev(div110, ul);
    			append_dev(ul, div109);
    			append_dev(div109, li0);
    			append_dev(li0, a8);
    			append_dev(div109, t132);
    			append_dev(div109, li1);
    			append_dev(li1, a9);
    			append_dev(ul, t134);
    			append_dev(ul, li2);
    			append_dev(li2, a10);
    			append_dev(a10, i21);
    			append_dev(a10, t135);
    			append_dev(div112, t136);
    			append_dev(div112, div111);
    			append_dev(div111, t137);
    			append_dev(div111, button15);
    			append_dev(button15, span5);
    			append_dev(div127, t139);
    			append_dev(div127, div126);
    			append_dev(div126, div118);
    			append_dev(div118, div117);
    			append_dev(div117, div116);
    			append_dev(div116, div115);
    			append_dev(div115, i22);
    			append_dev(div117, t140);
    			append_dev(div126, t141);
    			append_dev(div126, div125);
    			append_dev(div125, div124);
    			append_dev(div124, div123);
    			append_dev(div123, div122);
    			append_dev(div122, div121);
    			append_dev(div121, strong4);
    			append_dev(div121, t143);
    			append_dev(div121, i23);
    			append_dev(div121, t144);
    			append_dev(div121, div119);
    			append_dev(div121, t146);
    			append_dev(div121, div120);
    			append_dev(div123, t148);
    			append_dev(div123, a11);
    			append_dev(a11, i24);
    			insert_dev(target, t149, anchor);
    			mount_component(modaldatospaciente, target, anchor);
    			insert_dev(target, t150, anchor);
    			mount_component(modalnuevaatencion, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(link_action = link.call(null, a11));
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asidepacientes.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(modaldatospaciente.$$.fragment, local);
    			transition_in(modalnuevaatencion.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asidepacientes.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(modaldatospaciente.$$.fragment, local);
    			transition_out(modalnuevaatencion.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asidepacientes, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			if (detaching) detach_dev(t149);
    			destroy_component(modaldatospaciente, detaching);
    			if (detaching) detach_dev(t150);
    			destroy_component(modalnuevaatencion, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Perfil", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Perfil> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		link,
    		Header,
    		AsidePacientes,
    		ModalDatosPaciente,
    		ModalNuevaAtencion
    	});

    	return [];
    }

    class Perfil extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Perfil",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\Pages\Paciente\Editar.svelte generated by Svelte v3.29.0 */
    const file$8 = "src\\Pages\\Paciente\\Editar.svelte";

    function create_fragment$9(ctx) {
    	let asidepacientes;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div32;
    	let div31;
    	let div0;
    	let h50;
    	let t3;
    	let div30;
    	let div29;
    	let div28;
    	let form;
    	let input0;
    	let t4;
    	let div2;
    	let div1;
    	let label0;
    	let t6;
    	let input1;
    	let t7;
    	let div4;
    	let div3;
    	let label1;
    	let t9;
    	let input2;
    	let t10;
    	let div7;
    	let div5;
    	let label2;
    	let t12;
    	let input3;
    	let t13;
    	let div6;
    	let label3;
    	let t15;
    	let input4;
    	let t16;
    	let div10;
    	let div8;
    	let label4;
    	let t18;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t22;
    	let div9;
    	let label5;
    	let t24;
    	let input5;
    	let t25;
    	let div13;
    	let div11;
    	let label6;
    	let t27;
    	let input6;
    	let t28;
    	let div12;
    	let label7;
    	let t30;
    	let input7;
    	let t31;
    	let div16;
    	let div14;
    	let label8;
    	let t33;
    	let input8;
    	let t34;
    	let div15;
    	let label9;
    	let t36;
    	let select1;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let t42;
    	let br0;
    	let t43;
    	let h51;
    	let br1;
    	let t45;
    	let hr0;
    	let t46;
    	let div20;
    	let div17;
    	let label10;
    	let t48;
    	let select2;
    	let option8;
    	let option9;
    	let option10;
    	let option11;
    	let option12;
    	let option13;
    	let option14;
    	let option15;
    	let option16;
    	let option17;
    	let option18;
    	let option19;
    	let option20;
    	let option21;
    	let option22;
    	let option23;
    	let option24;
    	let option25;
    	let option26;
    	let option27;
    	let option28;
    	let option29;
    	let option30;
    	let option31;
    	let option32;
    	let option33;
    	let option34;
    	let option35;
    	let option36;
    	let option37;
    	let option38;
    	let option39;
    	let option40;
    	let option41;
    	let option42;
    	let option43;
    	let option44;
    	let option45;
    	let option46;
    	let option47;
    	let option48;
    	let option49;
    	let option50;
    	let option51;
    	let option52;
    	let option53;
    	let option54;
    	let option55;
    	let option56;
    	let option57;
    	let option58;
    	let option59;
    	let option60;
    	let option61;
    	let option62;
    	let option63;
    	let option64;
    	let option65;
    	let option66;
    	let option67;
    	let option68;
    	let option69;
    	let option70;
    	let option71;
    	let option72;
    	let option73;
    	let option74;
    	let option75;
    	let option76;
    	let option77;
    	let option78;
    	let option79;
    	let option80;
    	let option81;
    	let option82;
    	let option83;
    	let option84;
    	let option85;
    	let option86;
    	let option87;
    	let option88;
    	let option89;
    	let option90;
    	let option91;
    	let option92;
    	let option93;
    	let option94;
    	let option95;
    	let option96;
    	let option97;
    	let option98;
    	let option99;
    	let option100;
    	let t142;
    	let div18;
    	let label11;
    	let t144;
    	let input9;
    	let t145;
    	let div19;
    	let label12;
    	let t147;
    	let input10;
    	let t148;
    	let br2;
    	let t149;
    	let h52;
    	let br3;
    	let t151;
    	let hr1;
    	let t152;
    	let div23;
    	let div21;
    	let label13;
    	let t154;
    	let input11;
    	let t155;
    	let div22;
    	let label14;
    	let t157;
    	let input12;
    	let t158;
    	let div26;
    	let div24;
    	let label15;
    	let t160;
    	let select3;
    	let option101;
    	let option102;
    	let t163;
    	let div25;
    	let label16;
    	let t165;
    	let select4;
    	let option103;
    	let option104;
    	let option105;
    	let option106;
    	let option107;
    	let option108;
    	let option109;
    	let option110;
    	let t174;
    	let div27;
    	let button0;
    	let t176;
    	let button1;
    	let i;
    	let t177;
    	let current;
    	asidepacientes = new AsidePacientes({ $$inline: true });
    	header = new Header({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asidepacientes.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div32 = element("div");
    			div31 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			h50.textContent = "Nuevo Paciente";
    			t3 = space();
    			div30 = element("div");
    			div29 = element("div");
    			div28 = element("div");
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			div2 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Cedula / Pasaporte";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div4 = element("div");
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Nombre(s)";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div7 = element("div");
    			div5 = element("div");
    			label2 = element("label");
    			label2.textContent = "Primer Apellido";
    			t12 = space();
    			input3 = element("input");
    			t13 = space();
    			div6 = element("div");
    			label3 = element("label");
    			label3.textContent = "Segundo Apellido";
    			t15 = space();
    			input4 = element("input");
    			t16 = space();
    			div10 = element("div");
    			div8 = element("div");
    			label4 = element("label");
    			label4.textContent = "Sexo";
    			t18 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "- Seleccionar -";
    			option1 = element("option");
    			option1.textContent = "Masculino";
    			option2 = element("option");
    			option2.textContent = "Femenino";
    			t22 = space();
    			div9 = element("div");
    			label5 = element("label");
    			label5.textContent = "Fecha de nacimiento";
    			t24 = space();
    			input5 = element("input");
    			t25 = space();
    			div13 = element("div");
    			div11 = element("div");
    			label6 = element("label");
    			label6.textContent = "Telefono";
    			t27 = space();
    			input6 = element("input");
    			t28 = space();
    			div12 = element("div");
    			label7 = element("label");
    			label7.textContent = "Celular";
    			t30 = space();
    			input7 = element("input");
    			t31 = space();
    			div16 = element("div");
    			div14 = element("div");
    			label8 = element("label");
    			label8.textContent = "Email";
    			t33 = space();
    			input8 = element("input");
    			t34 = space();
    			div15 = element("div");
    			label9 = element("label");
    			label9.textContent = "Estado Civil";
    			t36 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "- Seleccionar -";
    			option4 = element("option");
    			option4.textContent = "Soltero";
    			option5 = element("option");
    			option5.textContent = "Casado";
    			option6 = element("option");
    			option6.textContent = "Divorciado";
    			option7 = element("option");
    			option7.textContent = "Union Libre";
    			t42 = space();
    			br0 = element("br");
    			t43 = space();
    			h51 = element("h5");
    			h51.textContent = "Datos de Aseguradora";
    			br1 = element("br");
    			t45 = space();
    			hr0 = element("hr");
    			t46 = space();
    			div20 = element("div");
    			div17 = element("div");
    			label10 = element("label");
    			label10.textContent = "Seguro médico";
    			t48 = space();
    			select2 = element("select");
    			option8 = element("option");
    			option8.textContent = "- seleccionar seguro -";
    			option9 = element("option");
    			option9.textContent = "ARS C.M.D";
    			option10 = element("option");
    			option10.textContent = "ARS UNIVERSAL";
    			option11 = element("option");
    			option11.textContent = "ARS COLONIAL";
    			option12 = element("option");
    			option12.textContent = "ARS MONUMENTAL";
    			option13 = element("option");
    			option13.textContent = "ARS CONSTITUCION";
    			option14 = element("option");
    			option14.textContent = "ARS SEMUNASED";
    			option15 = element("option");
    			option15.textContent = "ARS RENACER";
    			option16 = element("option");
    			option16.textContent = "ARS RESERVAS INC.";
    			option17 = element("option");
    			option17.textContent = "ARS CARIBALICO";
    			option18 = element("option");
    			option18.textContent = "ARS APS";
    			option19 = element("option");
    			option19.textContent = "ARS BIENESTAR";
    			option20 = element("option");
    			option20.textContent = "ARS SERVICIOS COOP. DE SALUD";
    			option21 = element("option");
    			option21.textContent = "META SEGUROS";
    			option22 = element("option");
    			option22.textContent = "ARS MULTI MAS";
    			option23 = element("option");
    			option23.textContent = "ARS MEDI SALUD S. A.";
    			option24 = element("option");
    			option24.textContent = "IMEGLO";
    			option25 = element("option");
    			option25.textContent = "ARS PALIC SALUD";
    			option26 = element("option");
    			option26.textContent = "PLAMEDIN";
    			option27 = element("option");
    			option27.textContent = "PLENA SALUD";
    			option28 = element("option");
    			option28.textContent = "ARS S.D.S";
    			option29 = element("option");
    			option29.textContent = "OSEPA";
    			option30 = element("option");
    			option30.textContent = "ARS SALUD TOTAL";
    			option31 = element("option");
    			option31.textContent = "SEDESAP";
    			option32 = element("option");
    			option32.textContent = "ARS MAXIMA SALUD";
    			option33 = element("option");
    			option33.textContent = "UNIPROSE";
    			option34 = element("option");
    			option34.textContent = "ARS YUNEN";
    			option35 = element("option");
    			option35.textContent = "ARS CENTRO ORIENTAL";
    			option36 = element("option");
    			option36.textContent = "ARS SIMERSA";
    			option37 = element("option");
    			option37.textContent = "SEGURO ADVENTISTA";
    			option38 = element("option");
    			option38.textContent = "ARS GALENO";
    			option39 = element("option");
    			option39.textContent = "ARS UCEMED";
    			option40 = element("option");
    			option40.textContent = "BONANZA";
    			option41 = element("option");
    			option41.textContent = "IMED";
    			option42 = element("option");
    			option42.textContent = "INTERCONTINENTAL";
    			option43 = element("option");
    			option43.textContent = "ISME";
    			option44 = element("option");
    			option44.textContent = "SEME UASD (EMPLEADOS)";
    			option45 = element("option");
    			option45.textContent = "SERVICIO MEDICO PREPAGADO (SMP";
    			option46 = element("option");
    			option46.textContent = "ARS UASD";
    			option47 = element("option");
    			option47.textContent = "ARS ADASS";
    			option48 = element("option");
    			option48.textContent = "ARS SALUD FAMILIAR";
    			option49 = element("option");
    			option49.textContent = "ARS D/S.M.H";
    			option50 = element("option");
    			option50.textContent = "COPICENTRO PROFESIONAL";
    			option51 = element("option");
    			option51.textContent = "SENASA";
    			option52 = element("option");
    			option52.textContent = "ARS SIMAG";
    			option53 = element("option");
    			option53.textContent = "ARS SALUD SEGURA";
    			option54 = element("option");
    			option54.textContent = "ARL SALUD SEGURA";
    			option55 = element("option");
    			option55.textContent = "ARS FUERZAS ARMADAS";
    			option56 = element("option");
    			option56.textContent = "ARS FUTURO";
    			option57 = element("option");
    			option57.textContent = "ARS SEMMA";
    			option58 = element("option");
    			option58.textContent = "CECANOR";
    			option59 = element("option");
    			option59.textContent = "ARS BMI COMPANY";
    			option60 = element("option");
    			option60.textContent = "LABORATORIO CLINICO DR. BIENVE";
    			option61 = element("option");
    			option61.textContent = "ARS ASEMAP";
    			option62 = element("option");
    			option62.textContent = "DOMINICAN HEALTH CARE / INVERS";
    			option63 = element("option");
    			option63.textContent = "ARS META SALUD";
    			option64 = element("option");
    			option64.textContent = "HUMANO SEGUROS";
    			option65 = element("option");
    			option65.textContent = "WORLDWIDE SEGUROS";
    			option66 = element("option");
    			option66.textContent = "GRUPO MEDICO ASOCIADO";
    			option67 = element("option");
    			option67.textContent = "BIOPSIA CON INMUNO HISTOQUIMICA";
    			option68 = element("option");
    			option68.textContent = "HISTEROSALPINGOGRAFIA";
    			option69 = element("option");
    			option69.textContent = "HISTEROSALPINGOGRAFIA";
    			option70 = element("option");
    			option70.textContent = "SONOGRAFIA MUSCOLOESQUELETICA";
    			option71 = element("option");
    			option71.textContent = "ARS C.M.D";
    			option72 = element("option");
    			option72.textContent = "ARS UNIVERSAL";
    			option73 = element("option");
    			option73.textContent = "ARS COLONIAL";
    			option74 = element("option");
    			option74.textContent = "ARS MONUMENTAL";
    			option75 = element("option");
    			option75.textContent = "ARS CONSTITUCION";
    			option76 = element("option");
    			option76.textContent = "ARS SEMUNASED";
    			option77 = element("option");
    			option77.textContent = "ARS RENACER";
    			option78 = element("option");
    			option78.textContent = "ARS RESERVAS INC.";
    			option79 = element("option");
    			option79.textContent = "ARS CARIBALICO";
    			option80 = element("option");
    			option80.textContent = "ARS APS";
    			option81 = element("option");
    			option81.textContent = "ARS BIENESTAR";
    			option82 = element("option");
    			option82.textContent = "ARS SERVICIOS COOP. DE SALUD";
    			option83 = element("option");
    			option83.textContent = "META SEGUROS";
    			option84 = element("option");
    			option84.textContent = "ARS MULTI MAS";
    			option85 = element("option");
    			option85.textContent = "ARS MEDI SALUD S. A.";
    			option86 = element("option");
    			option86.textContent = "IMEGLO";
    			option87 = element("option");
    			option87.textContent = "ARS PALIC SALUD";
    			option88 = element("option");
    			option88.textContent = "PLAMEDIN";
    			option89 = element("option");
    			option89.textContent = "PLENA SALUD";
    			option90 = element("option");
    			option90.textContent = "ARS S.D.S";
    			option91 = element("option");
    			option91.textContent = "OSEPA";
    			option92 = element("option");
    			option92.textContent = "ARS SALUD TOTAL";
    			option93 = element("option");
    			option93.textContent = "SEDESAP";
    			option94 = element("option");
    			option94.textContent = "ARS MAXIMA SALUD";
    			option95 = element("option");
    			option95.textContent = "UNIPROSE";
    			option96 = element("option");
    			option96.textContent = "ARS YUNEN";
    			option97 = element("option");
    			option97.textContent = "ARS CENTRO ORIENTAL";
    			option98 = element("option");
    			option98.textContent = "ARS SIMERSA";
    			option99 = element("option");
    			option99.textContent = "SEGURO ADVENTISTA";
    			option100 = element("option");
    			option100.textContent = "ARS GALENO";
    			t142 = space();
    			div18 = element("div");
    			label11 = element("label");
    			label11.textContent = "No. Afiliado";
    			t144 = space();
    			input9 = element("input");
    			t145 = space();
    			div19 = element("div");
    			label12 = element("label");
    			label12.textContent = "Numero de Seguro Social (NSS)";
    			t147 = space();
    			input10 = element("input");
    			t148 = space();
    			br2 = element("br");
    			t149 = space();
    			h52 = element("h5");
    			h52.textContent = "Datos demográficos";
    			br3 = element("br");
    			t151 = space();
    			hr1 = element("hr");
    			t152 = space();
    			div23 = element("div");
    			div21 = element("div");
    			label13 = element("label");
    			label13.textContent = "Dirección";
    			t154 = space();
    			input11 = element("input");
    			t155 = space();
    			div22 = element("div");
    			label14 = element("label");
    			label14.textContent = "Ciudad";
    			t157 = space();
    			input12 = element("input");
    			t158 = space();
    			div26 = element("div");
    			div24 = element("div");
    			label15 = element("label");
    			label15.textContent = "País";
    			t160 = space();
    			select3 = element("select");
    			option101 = element("option");
    			option101.textContent = "- seleccionar pais -";
    			option102 = element("option");
    			option102.textContent = "República Dominicana";
    			t163 = space();
    			div25 = element("div");
    			label16 = element("label");
    			label16.textContent = "Estado / provincia";
    			t165 = space();
    			select4 = element("select");
    			option103 = element("option");
    			option103.textContent = "- seleccionar estado o provincia -";
    			option104 = element("option");
    			option104.textContent = "Duarte";
    			option105 = element("option");
    			option105.textContent = "Azua";
    			option106 = element("option");
    			option106.textContent = "Bahoruco";
    			option107 = element("option");
    			option107.textContent = "Barahona";
    			option108 = element("option");
    			option108.textContent = "Dajabon";
    			option109 = element("option");
    			option109.textContent = "Distrito Nacional";
    			option110 = element("option");
    			option110.textContent = "El Seibo";
    			t174 = space();
    			div27 = element("div");
    			button0 = element("button");
    			button0.textContent = "Limpiar";
    			t176 = space();
    			button1 = element("button");
    			i = element("i");
    			t177 = text("\r\n                        Guardar paciente");
    			attr_dev(h50, "class", "m-b-0");
    			add_location(h50, file$8, 13, 4, 381);
    			attr_dev(div0, "class", "card-header");
    			add_location(div0, file$8, 12, 0, 350);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "idPaciente");
    			input0.value = "";
    			add_location(input0, file$8, 23, 16, 606);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$8, 26, 24, 775);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "name", "Cedula");
    			attr_dev(input1, "id", "txtCedula");
    			attr_dev(input1, "pattern", "^[0-9]+$");
    			attr_dev(input1, "maxlength", "11");
    			add_location(input1, file$8, 27, 24, 841);
    			attr_dev(div1, "class", "form-group col-md-6");
    			add_location(div1, file$8, 25, 20, 716);
    			attr_dev(div2, "class", "form-row");
    			add_location(div2, file$8, 24, 16, 672);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$8, 32, 24, 1118);
    			attr_dev(input2, "type", "name");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "name", "Nombres");
    			attr_dev(input2, "max", "100");
    			input2.required = "";
    			add_location(input2, file$8, 33, 24, 1175);
    			attr_dev(div3, "class", "form-group col-md-12");
    			add_location(div3, file$8, 31, 20, 1058);
    			attr_dev(div4, "class", "form-row");
    			add_location(div4, file$8, 30, 16, 1014);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$8, 38, 24, 1425);
    			attr_dev(input3, "type", "last-name");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "name", "PrimerApellido");
    			attr_dev(input3, "max", "100");
    			input3.required = "";
    			add_location(input3, file$8, 39, 24, 1488);
    			attr_dev(div5, "class", "form-group col-md-6");
    			add_location(div5, file$8, 37, 20, 1366);
    			attr_dev(label3, "for", "");
    			add_location(label3, file$8, 42, 24, 1686);
    			attr_dev(input4, "type", "last-name");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "name", "SegundoApellido");
    			attr_dev(input4, "id", "txtApellido");
    			attr_dev(input4, "max", "100");
    			add_location(input4, file$8, 43, 24, 1750);
    			attr_dev(div6, "class", "form-group col-md-6");
    			add_location(div6, file$8, 41, 20, 1627);
    			attr_dev(div7, "class", "form-row");
    			add_location(div7, file$8, 36, 16, 1322);
    			attr_dev(label4, "for", "");
    			add_location(label4, file$8, 49, 24, 2020);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$8, 50, 89, 2137);
    			option1.__value = "M";
    			option1.value = option1.__value;
    			add_location(option1, file$8, 50, 130, 2178);
    			option2.__value = "F";
    			option2.value = option2.__value;
    			add_location(option2, file$8, 50, 166, 2214);
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "name", "Sexo");
    			attr_dev(select0, "id", "slSexo");
    			select0.required = "";
    			add_location(select0, file$8, 50, 24, 2072);
    			attr_dev(div8, "class", "form-group col-md-6");
    			add_location(div8, file$8, 48, 20, 1961);
    			add_location(label5, file$8, 55, 24, 2395);
    			attr_dev(input5, "type", "date");
    			attr_dev(input5, "name", "FechaNacimiento");
    			attr_dev(input5, "class", "form-control");
    			attr_dev(input5, "id", "txtFechaNacimiento");
    			attr_dev(input5, "placeholder", "00/00/0000");
    			attr_dev(input5, "autocomplete", "off");
    			input5.required = "";
    			add_location(input5, file$8, 56, 24, 2455);
    			attr_dev(div9, "class", "col-md-6 form-group");
    			add_location(div9, file$8, 54, 20, 2336);
    			attr_dev(div10, "class", "form-row");
    			add_location(div10, file$8, 47, 16, 1917);
    			attr_dev(label6, "for", "");
    			add_location(label6, file$8, 63, 24, 2775);
    			attr_dev(input6, "type", "text");
    			attr_dev(input6, "class", "form-control");
    			attr_dev(input6, "data-mask", "(000) 000-0000");
    			attr_dev(input6, "data-mask-clearifnotmatch", "true");
    			attr_dev(input6, "autocomplete", "off");
    			attr_dev(input6, "maxlength", "14");
    			attr_dev(input6, "placeholder", "(809) 000-0000");
    			attr_dev(input6, "name", "Telefono");
    			attr_dev(input6, "id", "txtTelefono");
    			attr_dev(input6, "max", "15");
    			add_location(input6, file$8, 64, 24, 2831);
    			attr_dev(div11, "class", "form-group col-md-6");
    			add_location(div11, file$8, 62, 20, 2716);
    			attr_dev(label7, "for", "");
    			add_location(label7, file$8, 67, 24, 3145);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "class", "form-control");
    			attr_dev(input7, "data-mask", "(000) 000-0000");
    			attr_dev(input7, "data-mask-clearifnotmatch", "true");
    			attr_dev(input7, "autocomplete", "off");
    			attr_dev(input7, "maxlength", "14");
    			attr_dev(input7, "placeholder", "(809) 000-0000");
    			attr_dev(input7, "name", "Celular");
    			attr_dev(input7, "id", "txtCelular");
    			attr_dev(input7, "max", "15");
    			add_location(input7, file$8, 68, 24, 3200);
    			attr_dev(div12, "class", "form-group col-md-6");
    			add_location(div12, file$8, 66, 20, 3086);
    			attr_dev(div13, "class", "form-row");
    			add_location(div13, file$8, 61, 16, 2672);
    			attr_dev(label8, "for", "");
    			add_location(label8, file$8, 74, 24, 3578);
    			attr_dev(input8, "type", "email");
    			attr_dev(input8, "class", "form-control");
    			attr_dev(input8, "placeholder", "prueba@correo.com");
    			attr_dev(input8, "name", "Correo");
    			attr_dev(input8, "id", "txtCorreo");
    			add_location(input8, file$8, 75, 24, 3631);
    			attr_dev(div14, "class", "form-group col-md-6");
    			add_location(div14, file$8, 73, 20, 3519);
    			attr_dev(label9, "for", "");
    			add_location(label9, file$8, 78, 24, 3842);
    			option3.__value = "";
    			option3.value = option3.__value;
    			add_location(option3, file$8, 80, 28, 4011);
    			option4.__value = "S";
    			option4.value = option4.__value;
    			add_location(option4, file$8, 81, 28, 4083);
    			option5.__value = "C";
    			option5.value = option5.__value;
    			add_location(option5, file$8, 82, 28, 4147);
    			option6.__value = "D";
    			option6.value = option6.__value;
    			add_location(option6, file$8, 83, 28, 4210);
    			option7.__value = "UL";
    			option7.value = option7.__value;
    			add_location(option7, file$8, 84, 28, 4277);
    			attr_dev(select1, "class", "form-control");
    			attr_dev(select1, "name", "EstadoCivil");
    			attr_dev(select1, "id", "slEstadoCivil");
    			select1.required = "";
    			add_location(select1, file$8, 79, 24, 3902);
    			attr_dev(div15, "class", "form-group col-md-6");
    			add_location(div15, file$8, 77, 20, 3783);
    			attr_dev(div16, "class", "form-row");
    			add_location(div16, file$8, 72, 16, 3475);
    			add_location(br0, file$8, 88, 16, 4421);
    			set_style(h51, "margin-bottom", "0");
    			add_location(h51, file$8, 89, 16, 4443);
    			add_location(br1, file$8, 89, 71, 4498);
    			set_style(hr0, "margin-top", "0");
    			add_location(hr0, file$8, 90, 16, 4520);
    			attr_dev(label10, "class", "font-secondary");
    			add_location(label10, file$8, 93, 24, 4668);
    			option8.__value = "";
    			option8.value = option8.__value;
    			add_location(option8, file$8, 95, 28, 4900);
    			option9.__value = "3";
    			option9.value = option9.__value;
    			attr_dev(option9, "data-select2-id", "39");
    			add_location(option9, file$8, 96, 28, 4978);
    			option10.__value = "4";
    			option10.value = option10.__value;
    			attr_dev(option10, "data-select2-id", "40");
    			add_location(option10, file$8, 97, 28, 5065);
    			option11.__value = "5";
    			option11.value = option11.__value;
    			attr_dev(option11, "data-select2-id", "41");
    			add_location(option11, file$8, 98, 28, 5156);
    			option12.__value = "6";
    			option12.value = option12.__value;
    			attr_dev(option12, "data-select2-id", "42");
    			add_location(option12, file$8, 99, 28, 5246);
    			option13.__value = "7";
    			option13.value = option13.__value;
    			attr_dev(option13, "data-select2-id", "43");
    			add_location(option13, file$8, 100, 28, 5338);
    			option14.__value = "8";
    			option14.value = option14.__value;
    			attr_dev(option14, "data-select2-id", "44");
    			add_location(option14, file$8, 101, 28, 5432);
    			option15.__value = "9";
    			option15.value = option15.__value;
    			attr_dev(option15, "data-select2-id", "45");
    			add_location(option15, file$8, 102, 28, 5523);
    			option16.__value = "10";
    			option16.value = option16.__value;
    			attr_dev(option16, "data-select2-id", "46");
    			add_location(option16, file$8, 103, 28, 5612);
    			option17.__value = "11";
    			option17.value = option17.__value;
    			attr_dev(option17, "data-select2-id", "47");
    			add_location(option17, file$8, 104, 28, 5708);
    			option18.__value = "12";
    			option18.value = option18.__value;
    			attr_dev(option18, "data-select2-id", "48");
    			add_location(option18, file$8, 105, 28, 5801);
    			option19.__value = "13";
    			option19.value = option19.__value;
    			attr_dev(option19, "data-select2-id", "49");
    			add_location(option19, file$8, 106, 28, 5887);
    			option20.__value = "14";
    			option20.value = option20.__value;
    			attr_dev(option20, "data-select2-id", "50");
    			add_location(option20, file$8, 107, 28, 5979);
    			option21.__value = "15";
    			option21.value = option21.__value;
    			attr_dev(option21, "data-select2-id", "51");
    			add_location(option21, file$8, 108, 28, 6086);
    			option22.__value = "16";
    			option22.value = option22.__value;
    			attr_dev(option22, "data-select2-id", "52");
    			add_location(option22, file$8, 109, 28, 6177);
    			option23.__value = "17";
    			option23.value = option23.__value;
    			attr_dev(option23, "data-select2-id", "53");
    			add_location(option23, file$8, 110, 28, 6269);
    			option24.__value = "18";
    			option24.value = option24.__value;
    			attr_dev(option24, "data-select2-id", "54");
    			add_location(option24, file$8, 111, 28, 6368);
    			option25.__value = "19";
    			option25.value = option25.__value;
    			attr_dev(option25, "data-select2-id", "55");
    			add_location(option25, file$8, 112, 28, 6453);
    			option26.__value = "20";
    			option26.value = option26.__value;
    			attr_dev(option26, "data-select2-id", "56");
    			add_location(option26, file$8, 113, 28, 6547);
    			option27.__value = "21";
    			option27.value = option27.__value;
    			attr_dev(option27, "data-select2-id", "57");
    			add_location(option27, file$8, 114, 28, 6634);
    			option28.__value = "22";
    			option28.value = option28.__value;
    			attr_dev(option28, "data-select2-id", "58");
    			add_location(option28, file$8, 115, 28, 6724);
    			option29.__value = "23";
    			option29.value = option29.__value;
    			attr_dev(option29, "data-select2-id", "59");
    			add_location(option29, file$8, 116, 28, 6812);
    			option30.__value = "24";
    			option30.value = option30.__value;
    			attr_dev(option30, "data-select2-id", "60");
    			add_location(option30, file$8, 117, 28, 6896);
    			option31.__value = "25";
    			option31.value = option31.__value;
    			attr_dev(option31, "data-select2-id", "61");
    			add_location(option31, file$8, 118, 28, 6990);
    			option32.__value = "26";
    			option32.value = option32.__value;
    			attr_dev(option32, "data-select2-id", "62");
    			add_location(option32, file$8, 119, 28, 7076);
    			option33.__value = "27";
    			option33.value = option33.__value;
    			attr_dev(option33, "data-select2-id", "63");
    			add_location(option33, file$8, 120, 28, 7171);
    			option34.__value = "28";
    			option34.value = option34.__value;
    			attr_dev(option34, "data-select2-id", "64");
    			add_location(option34, file$8, 121, 28, 7258);
    			option35.__value = "29";
    			option35.value = option35.__value;
    			attr_dev(option35, "data-select2-id", "65");
    			add_location(option35, file$8, 122, 28, 7346);
    			option36.__value = "30";
    			option36.value = option36.__value;
    			attr_dev(option36, "data-select2-id", "66");
    			add_location(option36, file$8, 123, 28, 7444);
    			option37.__value = "31";
    			option37.value = option37.__value;
    			attr_dev(option37, "data-select2-id", "67");
    			add_location(option37, file$8, 124, 28, 7534);
    			option38.__value = "32";
    			option38.value = option38.__value;
    			attr_dev(option38, "data-select2-id", "68");
    			add_location(option38, file$8, 125, 28, 7630);
    			option39.__value = "33";
    			option39.value = option39.__value;
    			attr_dev(option39, "data-select2-id", "69");
    			add_location(option39, file$8, 126, 28, 7719);
    			option40.__value = "34";
    			option40.value = option40.__value;
    			attr_dev(option40, "data-select2-id", "70");
    			add_location(option40, file$8, 127, 28, 7808);
    			option41.__value = "35";
    			option41.value = option41.__value;
    			attr_dev(option41, "data-select2-id", "71");
    			add_location(option41, file$8, 128, 28, 7894);
    			option42.__value = "36";
    			option42.value = option42.__value;
    			attr_dev(option42, "data-select2-id", "72");
    			add_location(option42, file$8, 129, 28, 7977);
    			option43.__value = "37";
    			option43.value = option43.__value;
    			attr_dev(option43, "data-select2-id", "73");
    			add_location(option43, file$8, 130, 28, 8072);
    			option44.__value = "38";
    			option44.value = option44.__value;
    			attr_dev(option44, "data-select2-id", "74");
    			add_location(option44, file$8, 131, 28, 8155);
    			option45.__value = "39";
    			option45.value = option45.__value;
    			attr_dev(option45, "data-select2-id", "75");
    			add_location(option45, file$8, 132, 28, 8255);
    			option46.__value = "40";
    			option46.value = option46.__value;
    			attr_dev(option46, "data-select2-id", "76");
    			add_location(option46, file$8, 133, 28, 8364);
    			option47.__value = "41";
    			option47.value = option47.__value;
    			attr_dev(option47, "data-select2-id", "77");
    			add_location(option47, file$8, 134, 28, 8451);
    			option48.__value = "42";
    			option48.value = option48.__value;
    			attr_dev(option48, "data-select2-id", "78");
    			add_location(option48, file$8, 135, 28, 8539);
    			option49.__value = "43";
    			option49.value = option49.__value;
    			attr_dev(option49, "data-select2-id", "79");
    			add_location(option49, file$8, 136, 28, 8636);
    			option50.__value = "44";
    			option50.value = option50.__value;
    			attr_dev(option50, "data-select2-id", "80");
    			add_location(option50, file$8, 137, 28, 8726);
    			option51.__value = "45";
    			option51.value = option51.__value;
    			attr_dev(option51, "data-select2-id", "81");
    			add_location(option51, file$8, 138, 28, 8827);
    			option52.__value = "46";
    			option52.value = option52.__value;
    			attr_dev(option52, "data-select2-id", "82");
    			add_location(option52, file$8, 139, 28, 8912);
    			option53.__value = "47";
    			option53.value = option53.__value;
    			attr_dev(option53, "data-select2-id", "83");
    			add_location(option53, file$8, 140, 28, 9000);
    			option54.__value = "48";
    			option54.value = option54.__value;
    			attr_dev(option54, "data-select2-id", "84");
    			add_location(option54, file$8, 141, 28, 9095);
    			option55.__value = "49";
    			option55.value = option55.__value;
    			attr_dev(option55, "data-select2-id", "85");
    			add_location(option55, file$8, 142, 28, 9190);
    			option56.__value = "50";
    			option56.value = option56.__value;
    			attr_dev(option56, "data-select2-id", "86");
    			add_location(option56, file$8, 143, 28, 9288);
    			option57.__value = "51";
    			option57.value = option57.__value;
    			attr_dev(option57, "data-select2-id", "87");
    			add_location(option57, file$8, 144, 28, 9377);
    			option58.__value = "52";
    			option58.value = option58.__value;
    			attr_dev(option58, "data-select2-id", "88");
    			add_location(option58, file$8, 145, 28, 9465);
    			option59.__value = "53";
    			option59.value = option59.__value;
    			attr_dev(option59, "data-select2-id", "89");
    			add_location(option59, file$8, 146, 28, 9551);
    			option60.__value = "54";
    			option60.value = option60.__value;
    			attr_dev(option60, "data-select2-id", "90");
    			add_location(option60, file$8, 147, 28, 9645);
    			option61.__value = "55";
    			option61.value = option61.__value;
    			attr_dev(option61, "data-select2-id", "91");
    			add_location(option61, file$8, 148, 28, 9754);
    			option62.__value = "56";
    			option62.value = option62.__value;
    			attr_dev(option62, "data-select2-id", "92");
    			add_location(option62, file$8, 149, 28, 9843);
    			option63.__value = "57";
    			option63.value = option63.__value;
    			attr_dev(option63, "data-select2-id", "93");
    			add_location(option63, file$8, 150, 28, 9952);
    			option64.__value = "58";
    			option64.value = option64.__value;
    			attr_dev(option64, "data-select2-id", "94");
    			add_location(option64, file$8, 151, 28, 10045);
    			option65.__value = "59";
    			option65.value = option65.__value;
    			attr_dev(option65, "data-select2-id", "95");
    			add_location(option65, file$8, 152, 28, 10138);
    			option66.__value = "60";
    			option66.value = option66.__value;
    			attr_dev(option66, "data-select2-id", "96");
    			add_location(option66, file$8, 153, 28, 10234);
    			option67.__value = "61";
    			option67.value = option67.__value;
    			attr_dev(option67, "data-select2-id", "97");
    			add_location(option67, file$8, 154, 28, 10334);
    			option68.__value = "62";
    			option68.value = option68.__value;
    			attr_dev(option68, "data-select2-id", "98");
    			add_location(option68, file$8, 155, 28, 10444);
    			option69.__value = "63";
    			option69.value = option69.__value;
    			attr_dev(option69, "data-select2-id", "99");
    			add_location(option69, file$8, 156, 28, 10544);
    			option70.__value = "64";
    			option70.value = option70.__value;
    			attr_dev(option70, "data-select2-id", "100");
    			add_location(option70, file$8, 157, 28, 10644);
    			option71.__value = "65";
    			option71.value = option71.__value;
    			attr_dev(option71, "data-select2-id", "101");
    			add_location(option71, file$8, 158, 28, 10753);
    			option72.__value = "66";
    			option72.value = option72.__value;
    			attr_dev(option72, "data-select2-id", "102");
    			add_location(option72, file$8, 159, 28, 10842);
    			option73.__value = "67";
    			option73.value = option73.__value;
    			attr_dev(option73, "data-select2-id", "103");
    			add_location(option73, file$8, 160, 28, 10935);
    			option74.__value = "68";
    			option74.value = option74.__value;
    			attr_dev(option74, "data-select2-id", "104");
    			add_location(option74, file$8, 161, 28, 11027);
    			option75.__value = "69";
    			option75.value = option75.__value;
    			attr_dev(option75, "data-select2-id", "105");
    			add_location(option75, file$8, 162, 28, 11121);
    			option76.__value = "70";
    			option76.value = option76.__value;
    			attr_dev(option76, "data-select2-id", "106");
    			add_location(option76, file$8, 163, 28, 11217);
    			option77.__value = "71";
    			option77.value = option77.__value;
    			attr_dev(option77, "data-select2-id", "107");
    			add_location(option77, file$8, 164, 28, 11310);
    			option78.__value = "72";
    			option78.value = option78.__value;
    			attr_dev(option78, "data-select2-id", "108");
    			add_location(option78, file$8, 165, 28, 11401);
    			option79.__value = "73";
    			option79.value = option79.__value;
    			attr_dev(option79, "data-select2-id", "109");
    			add_location(option79, file$8, 166, 28, 11498);
    			option80.__value = "74";
    			option80.value = option80.__value;
    			attr_dev(option80, "data-select2-id", "110");
    			add_location(option80, file$8, 167, 28, 11592);
    			option81.__value = "75";
    			option81.value = option81.__value;
    			attr_dev(option81, "data-select2-id", "111");
    			add_location(option81, file$8, 168, 28, 11679);
    			option82.__value = "76";
    			option82.value = option82.__value;
    			attr_dev(option82, "data-select2-id", "112");
    			add_location(option82, file$8, 169, 28, 11772);
    			option83.__value = "77";
    			option83.value = option83.__value;
    			attr_dev(option83, "data-select2-id", "113");
    			add_location(option83, file$8, 170, 28, 11880);
    			option84.__value = "78";
    			option84.value = option84.__value;
    			attr_dev(option84, "data-select2-id", "114");
    			add_location(option84, file$8, 171, 28, 11972);
    			option85.__value = "79";
    			option85.value = option85.__value;
    			attr_dev(option85, "data-select2-id", "115");
    			add_location(option85, file$8, 172, 28, 12065);
    			option86.__value = "80";
    			option86.value = option86.__value;
    			attr_dev(option86, "data-select2-id", "116");
    			add_location(option86, file$8, 173, 28, 12165);
    			option87.__value = "81";
    			option87.value = option87.__value;
    			attr_dev(option87, "data-select2-id", "117");
    			add_location(option87, file$8, 174, 28, 12251);
    			option88.__value = "82";
    			option88.value = option88.__value;
    			attr_dev(option88, "data-select2-id", "118");
    			add_location(option88, file$8, 175, 28, 12346);
    			option89.__value = "83";
    			option89.value = option89.__value;
    			attr_dev(option89, "data-select2-id", "119");
    			add_location(option89, file$8, 176, 28, 12434);
    			option90.__value = "84";
    			option90.value = option90.__value;
    			attr_dev(option90, "data-select2-id", "120");
    			add_location(option90, file$8, 177, 28, 12525);
    			option91.__value = "85";
    			option91.value = option91.__value;
    			attr_dev(option91, "data-select2-id", "121");
    			add_location(option91, file$8, 178, 28, 12614);
    			option92.__value = "86";
    			option92.value = option92.__value;
    			attr_dev(option92, "data-select2-id", "122");
    			add_location(option92, file$8, 179, 28, 12699);
    			option93.__value = "87";
    			option93.value = option93.__value;
    			attr_dev(option93, "data-select2-id", "123");
    			add_location(option93, file$8, 180, 28, 12794);
    			option94.__value = "88";
    			option94.value = option94.__value;
    			attr_dev(option94, "data-select2-id", "124");
    			add_location(option94, file$8, 181, 28, 12881);
    			option95.__value = "89";
    			option95.value = option95.__value;
    			attr_dev(option95, "data-select2-id", "125");
    			add_location(option95, file$8, 182, 28, 12977);
    			option96.__value = "90";
    			option96.value = option96.__value;
    			attr_dev(option96, "data-select2-id", "126");
    			add_location(option96, file$8, 183, 28, 13065);
    			option97.__value = "91";
    			option97.value = option97.__value;
    			attr_dev(option97, "data-select2-id", "127");
    			add_location(option97, file$8, 184, 28, 13154);
    			option98.__value = "92";
    			option98.value = option98.__value;
    			attr_dev(option98, "data-select2-id", "128");
    			add_location(option98, file$8, 185, 28, 13253);
    			option99.__value = "93";
    			option99.value = option99.__value;
    			attr_dev(option99, "data-select2-id", "129");
    			add_location(option99, file$8, 186, 28, 13344);
    			option100.__value = "94";
    			option100.value = option100.__value;
    			attr_dev(option100, "data-select2-id", "130");
    			add_location(option100, file$8, 187, 28, 13441);
    			attr_dev(select2, "class", "form-control");
    			attr_dev(select2, "id", "sltAseguradora");
    			set_style(select2, "width", "100%");
    			attr_dev(select2, "tabindex", "-1");
    			attr_dev(select2, "aria-hidden", "true");
    			attr_dev(select2, "name", "IdAseguradora");
    			add_location(select2, file$8, 94, 24, 4746);
    			attr_dev(div17, "class", "form-group col-md-6");
    			add_location(div17, file$8, 92, 20, 4609);
    			attr_dev(label11, "for", "");
    			add_location(label11, file$8, 190, 24, 13610);
    			attr_dev(input9, "type", "text");
    			attr_dev(input9, "name", "Poliza");
    			attr_dev(input9, "pattern", "^[0-9]+$");
    			attr_dev(input9, "class", "form-control");
    			add_location(input9, file$8, 191, 24, 13670);
    			attr_dev(div18, "class", "form-group col-md-6");
    			add_location(div18, file$8, 189, 20, 13551);
    			attr_dev(label12, "for", "");
    			add_location(label12, file$8, 194, 24, 13852);
    			attr_dev(input10, "type", "text");
    			attr_dev(input10, "class", "form-control");
    			attr_dev(input10, "pattern", "^[0-9]+$");
    			attr_dev(input10, "name", "NSS");
    			add_location(input10, file$8, 195, 24, 13929);
    			attr_dev(div19, "class", "form-group col-md-6");
    			add_location(div19, file$8, 193, 20, 13793);
    			attr_dev(div20, "class", "form-row");
    			add_location(div20, file$8, 91, 16, 4565);
    			add_location(br2, file$8, 198, 16, 14069);
    			set_style(h52, "margin-bottom", "0");
    			add_location(h52, file$8, 200, 16, 14093);
    			add_location(br3, file$8, 200, 69, 14146);
    			set_style(hr1, "margin-top", "0");
    			add_location(hr1, file$8, 201, 16, 14168);
    			attr_dev(label13, "for", "inputAddress");
    			add_location(label13, file$8, 205, 24, 14319);
    			attr_dev(input11, "type", "text");
    			attr_dev(input11, "class", "form-control");
    			attr_dev(input11, "id", "inputAddress");
    			attr_dev(input11, "placeholder", "1234 Main St");
    			attr_dev(input11, "name", "Direccion");
    			attr_dev(input11, "data-bind", "value: direccion");
    			attr_dev(input11, "max", "100");
    			add_location(input11, file$8, 206, 24, 14388);
    			attr_dev(div21, "class", "form-group col-md-12");
    			add_location(div21, file$8, 204, 20, 14259);
    			attr_dev(label14, "for", "");
    			add_location(label14, file$8, 209, 24, 14638);
    			attr_dev(input12, "type", "text");
    			attr_dev(input12, "class", "form-control");
    			attr_dev(input12, "placeholder", "Nombre de la Ciudad");
    			attr_dev(input12, "name", "Ciudad");
    			add_location(input12, file$8, 210, 24, 14692);
    			attr_dev(div22, "class", "form-group col-md-6");
    			add_location(div22, file$8, 208, 20, 14579);
    			attr_dev(div23, "class", "form-row");
    			add_location(div23, file$8, 203, 16, 14215);
    			attr_dev(label15, "class", "font-secondary");
    			add_location(label15, file$8, 216, 24, 14955);
    			option101.__value = "";
    			option101.value = option101.__value;
    			attr_dev(option101, "data-select2-id", "2");
    			add_location(option101, file$8, 218, 28, 15178);
    			option102.__value = "1";
    			option102.value = option102.__value;
    			attr_dev(option102, "data-select2-id", "163");
    			add_location(option102, file$8, 219, 28, 15274);
    			attr_dev(select3, "class", "form-control");
    			attr_dev(select3, "id", "selPaises");
    			set_style(select3, "width", "100%");
    			attr_dev(select3, "tabindex", "-1");
    			attr_dev(select3, "aria-hidden", "true");
    			attr_dev(select3, "name", "IdPais");
    			select3.required = "";
    			add_location(select3, file$8, 217, 24, 15024);
    			attr_dev(div24, "class", "form-group col-md-6");
    			add_location(div24, file$8, 215, 20, 14896);
    			attr_dev(label16, "class", "font-secondary");
    			add_location(label16, file$8, 223, 24, 15487);
    			option103.__value = "";
    			option103.value = option103.__value;
    			attr_dev(option103, "data-select2-id", "4");
    			add_location(option103, file$8, 225, 28, 15733);
    			option104.__value = "1";
    			option104.value = option104.__value;
    			attr_dev(option104, "data-select2-id", "5");
    			add_location(option104, file$8, 226, 28, 15843);
    			option105.__value = "2";
    			option105.value = option105.__value;
    			attr_dev(option105, "data-select2-id", "6");
    			add_location(option105, file$8, 227, 28, 15926);
    			option106.__value = "3";
    			option106.value = option106.__value;
    			attr_dev(option106, "data-select2-id", "7");
    			add_location(option106, file$8, 228, 28, 16007);
    			option107.__value = "4";
    			option107.value = option107.__value;
    			attr_dev(option107, "data-select2-id", "8");
    			add_location(option107, file$8, 229, 28, 16092);
    			option108.__value = "5";
    			option108.value = option108.__value;
    			attr_dev(option108, "data-select2-id", "9");
    			add_location(option108, file$8, 230, 28, 16177);
    			option109.__value = "6";
    			option109.value = option109.__value;
    			attr_dev(option109, "data-select2-id", "10");
    			add_location(option109, file$8, 231, 28, 16261);
    			option110.__value = "7";
    			option110.value = option110.__value;
    			attr_dev(option110, "data-select2-id", "11");
    			add_location(option110, file$8, 232, 28, 16356);
    			attr_dev(select4, "class", "form-control");
    			attr_dev(select4, "id", "selProvincias");
    			set_style(select4, "width", "100%");
    			attr_dev(select4, "tabindex", "-1");
    			attr_dev(select4, "aria-hidden", "true");
    			attr_dev(select4, "name", "IdProvincia");
    			select4.required = "";
    			add_location(select4, file$8, 224, 24, 15570);
    			attr_dev(div25, "class", "form-group col-md-6");
    			add_location(div25, file$8, 222, 20, 15428);
    			attr_dev(div26, "class", "form-row");
    			add_location(div26, file$8, 214, 16, 14852);
    			attr_dev(button0, "type", "reset");
    			attr_dev(button0, "class", "btn btn-danger mr-2");
    			attr_dev(button0, "data-bind", "click: $root.limpiarFormulario");
    			add_location(button0, file$8, 237, 20, 16575);
    			attr_dev(i, "class", "mdi mdi-content-save-outline");
    			add_location(i, file$8, 238, 66, 16751);
    			attr_dev(button1, "type", "submit");
    			attr_dev(button1, "class", "btn btn-success");
    			add_location(button1, file$8, 238, 20, 16705);
    			attr_dev(div27, "class", "card-body d-flex justify-content-end align-items-center");
    			add_location(div27, file$8, 236, 16, 16484);
    			attr_dev(form, "id", "frmDatosGenerales");
    			add_location(form, file$8, 22, 12, 559);
    			attr_dev(div28, "class", "col-lg-12");
    			add_location(div28, file$8, 20, 8, 520);
    			attr_dev(div29, "class", "row");
    			add_location(div29, file$8, 19, 4, 493);
    			attr_dev(div30, "class", "card-body");
    			attr_dev(div30, "id", "divDocumento");
    			add_location(div30, file$8, 18, 0, 446);
    			attr_dev(div31, "class", "card m-b-30");
    			add_location(div31, file$8, 11, 0, 323);
    			attr_dev(div32, "class", "col-lg-8 m-b-30 m-auto");
    			set_style(div32, "margin-top", "50px", 1);
    			add_location(div32, file$8, 10, 4, 249);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$8, 9, 2, 212);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$8, 7, 0, 169);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asidepacientes, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t1);
    			append_dev(main, section);
    			append_dev(section, div32);
    			append_dev(div32, div31);
    			append_dev(div31, div0);
    			append_dev(div0, h50);
    			append_dev(div31, t3);
    			append_dev(div31, div30);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div28, form);
    			append_dev(form, input0);
    			append_dev(form, t4);
    			append_dev(form, div2);
    			append_dev(div2, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			append_dev(form, t7);
    			append_dev(form, div4);
    			append_dev(div4, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t9);
    			append_dev(div3, input2);
    			append_dev(form, t10);
    			append_dev(form, div7);
    			append_dev(div7, div5);
    			append_dev(div5, label2);
    			append_dev(div5, t12);
    			append_dev(div5, input3);
    			append_dev(div7, t13);
    			append_dev(div7, div6);
    			append_dev(div6, label3);
    			append_dev(div6, t15);
    			append_dev(div6, input4);
    			append_dev(form, t16);
    			append_dev(form, div10);
    			append_dev(div10, div8);
    			append_dev(div8, label4);
    			append_dev(div8, t18);
    			append_dev(div8, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(div10, t22);
    			append_dev(div10, div9);
    			append_dev(div9, label5);
    			append_dev(div9, t24);
    			append_dev(div9, input5);
    			append_dev(form, t25);
    			append_dev(form, div13);
    			append_dev(div13, div11);
    			append_dev(div11, label6);
    			append_dev(div11, t27);
    			append_dev(div11, input6);
    			append_dev(div13, t28);
    			append_dev(div13, div12);
    			append_dev(div12, label7);
    			append_dev(div12, t30);
    			append_dev(div12, input7);
    			append_dev(form, t31);
    			append_dev(form, div16);
    			append_dev(div16, div14);
    			append_dev(div14, label8);
    			append_dev(div14, t33);
    			append_dev(div14, input8);
    			append_dev(div16, t34);
    			append_dev(div16, div15);
    			append_dev(div15, label9);
    			append_dev(div15, t36);
    			append_dev(div15, select1);
    			append_dev(select1, option3);
    			append_dev(select1, option4);
    			append_dev(select1, option5);
    			append_dev(select1, option6);
    			append_dev(select1, option7);
    			append_dev(form, t42);
    			append_dev(form, br0);
    			append_dev(form, t43);
    			append_dev(form, h51);
    			append_dev(form, br1);
    			append_dev(form, t45);
    			append_dev(form, hr0);
    			append_dev(form, t46);
    			append_dev(form, div20);
    			append_dev(div20, div17);
    			append_dev(div17, label10);
    			append_dev(div17, t48);
    			append_dev(div17, select2);
    			append_dev(select2, option8);
    			append_dev(select2, option9);
    			append_dev(select2, option10);
    			append_dev(select2, option11);
    			append_dev(select2, option12);
    			append_dev(select2, option13);
    			append_dev(select2, option14);
    			append_dev(select2, option15);
    			append_dev(select2, option16);
    			append_dev(select2, option17);
    			append_dev(select2, option18);
    			append_dev(select2, option19);
    			append_dev(select2, option20);
    			append_dev(select2, option21);
    			append_dev(select2, option22);
    			append_dev(select2, option23);
    			append_dev(select2, option24);
    			append_dev(select2, option25);
    			append_dev(select2, option26);
    			append_dev(select2, option27);
    			append_dev(select2, option28);
    			append_dev(select2, option29);
    			append_dev(select2, option30);
    			append_dev(select2, option31);
    			append_dev(select2, option32);
    			append_dev(select2, option33);
    			append_dev(select2, option34);
    			append_dev(select2, option35);
    			append_dev(select2, option36);
    			append_dev(select2, option37);
    			append_dev(select2, option38);
    			append_dev(select2, option39);
    			append_dev(select2, option40);
    			append_dev(select2, option41);
    			append_dev(select2, option42);
    			append_dev(select2, option43);
    			append_dev(select2, option44);
    			append_dev(select2, option45);
    			append_dev(select2, option46);
    			append_dev(select2, option47);
    			append_dev(select2, option48);
    			append_dev(select2, option49);
    			append_dev(select2, option50);
    			append_dev(select2, option51);
    			append_dev(select2, option52);
    			append_dev(select2, option53);
    			append_dev(select2, option54);
    			append_dev(select2, option55);
    			append_dev(select2, option56);
    			append_dev(select2, option57);
    			append_dev(select2, option58);
    			append_dev(select2, option59);
    			append_dev(select2, option60);
    			append_dev(select2, option61);
    			append_dev(select2, option62);
    			append_dev(select2, option63);
    			append_dev(select2, option64);
    			append_dev(select2, option65);
    			append_dev(select2, option66);
    			append_dev(select2, option67);
    			append_dev(select2, option68);
    			append_dev(select2, option69);
    			append_dev(select2, option70);
    			append_dev(select2, option71);
    			append_dev(select2, option72);
    			append_dev(select2, option73);
    			append_dev(select2, option74);
    			append_dev(select2, option75);
    			append_dev(select2, option76);
    			append_dev(select2, option77);
    			append_dev(select2, option78);
    			append_dev(select2, option79);
    			append_dev(select2, option80);
    			append_dev(select2, option81);
    			append_dev(select2, option82);
    			append_dev(select2, option83);
    			append_dev(select2, option84);
    			append_dev(select2, option85);
    			append_dev(select2, option86);
    			append_dev(select2, option87);
    			append_dev(select2, option88);
    			append_dev(select2, option89);
    			append_dev(select2, option90);
    			append_dev(select2, option91);
    			append_dev(select2, option92);
    			append_dev(select2, option93);
    			append_dev(select2, option94);
    			append_dev(select2, option95);
    			append_dev(select2, option96);
    			append_dev(select2, option97);
    			append_dev(select2, option98);
    			append_dev(select2, option99);
    			append_dev(select2, option100);
    			append_dev(div20, t142);
    			append_dev(div20, div18);
    			append_dev(div18, label11);
    			append_dev(div18, t144);
    			append_dev(div18, input9);
    			append_dev(div20, t145);
    			append_dev(div20, div19);
    			append_dev(div19, label12);
    			append_dev(div19, t147);
    			append_dev(div19, input10);
    			append_dev(form, t148);
    			append_dev(form, br2);
    			append_dev(form, t149);
    			append_dev(form, h52);
    			append_dev(form, br3);
    			append_dev(form, t151);
    			append_dev(form, hr1);
    			append_dev(form, t152);
    			append_dev(form, div23);
    			append_dev(div23, div21);
    			append_dev(div21, label13);
    			append_dev(div21, t154);
    			append_dev(div21, input11);
    			append_dev(div23, t155);
    			append_dev(div23, div22);
    			append_dev(div22, label14);
    			append_dev(div22, t157);
    			append_dev(div22, input12);
    			append_dev(form, t158);
    			append_dev(form, div26);
    			append_dev(div26, div24);
    			append_dev(div24, label15);
    			append_dev(div24, t160);
    			append_dev(div24, select3);
    			append_dev(select3, option101);
    			append_dev(select3, option102);
    			append_dev(div26, t163);
    			append_dev(div26, div25);
    			append_dev(div25, label16);
    			append_dev(div25, t165);
    			append_dev(div25, select4);
    			append_dev(select4, option103);
    			append_dev(select4, option104);
    			append_dev(select4, option105);
    			append_dev(select4, option106);
    			append_dev(select4, option107);
    			append_dev(select4, option108);
    			append_dev(select4, option109);
    			append_dev(select4, option110);
    			append_dev(form, t174);
    			append_dev(form, div27);
    			append_dev(div27, button0);
    			append_dev(div27, t176);
    			append_dev(div27, button1);
    			append_dev(button1, i);
    			append_dev(button1, t177);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asidepacientes.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asidepacientes.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asidepacientes, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Editar", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Editar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, AsidePacientes });
    	return [];
    }

    class Editar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editar",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\Layout\Aside.svelte generated by Svelte v3.29.0 */
    const file$9 = "src\\Layout\\Aside.svelte";

    function create_fragment$a(ctx) {
    	let aside;
    	let div1;
    	let span0;
    	let a0;
    	let link_action;
    	let t1;
    	let div0;
    	let a1;
    	let t2;
    	let a2;
    	let t3;
    	let div2;
    	let ul;
    	let li0;
    	let a3;
    	let span2;
    	let span1;
    	let t5;
    	let span4;
    	let span3;
    	let t7;
    	let i0;
    	let link_action_1;
    	let active_action;
    	let t8;
    	let li1;
    	let a4;
    	let span6;
    	let span5;
    	let t10;
    	let span7;
    	let i1;
    	let link_action_2;
    	let active_action_1;
    	let t11;
    	let li2;
    	let a5;
    	let span9;
    	let span8;
    	let t13;
    	let span10;
    	let i2;
    	let link_action_3;
    	let active_action_2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			aside = element("aside");
    			div1 = element("div");
    			span0 = element("span");
    			a0 = element("a");
    			a0.textContent = "xmedical";
    			t1 = space();
    			div0 = element("div");
    			a1 = element("a");
    			t2 = space();
    			a2 = element("a");
    			t3 = space();
    			div2 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a3 = element("a");
    			span2 = element("span");
    			span1 = element("span");
    			span1.textContent = "IR A INICIO";
    			t5 = space();
    			span4 = element("span");
    			span3 = element("span");
    			span3.textContent = "1";
    			t7 = space();
    			i0 = element("i");
    			t8 = space();
    			li1 = element("li");
    			a4 = element("a");
    			span6 = element("span");
    			span5 = element("span");
    			span5.textContent = "Atenciones";
    			t10 = space();
    			span7 = element("span");
    			i1 = element("i");
    			t11 = space();
    			li2 = element("li");
    			a5 = element("a");
    			span9 = element("span");
    			span8 = element("span");
    			span8.textContent = "Interconsultas";
    			t13 = space();
    			span10 = element("span");
    			i2 = element("i");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$9, 9, 8, 286);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$9, 8, 6, 242);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$9, 14, 8, 438);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$9, 18, 8, 611);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$9, 12, 6, 378);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$9, 6, 4, 163);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$9, 30, 14, 1041);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$9, 29, 12, 1000);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$9, 33, 14, 1158);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$9, 34, 14, 1238);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$9, 32, 12, 1118);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$9, 28, 10, 947);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$9, 27, 8, 867);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$9, 44, 22, 1684);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$9, 43, 20, 1635);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-clipboard-flow");
    			add_location(i1, file$9, 47, 22, 1824);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$9, 46, 20, 1776);
    			attr_dev(a4, "href", "/AtencionMedica/Atenciones");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$9, 42, 18, 1549);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$9, 41, 16, 1436);
    			attr_dev(span8, "class", "menu-name");
    			add_location(span8, file$9, 57, 14, 2280);
    			attr_dev(span9, "class", "menu-label");
    			add_location(span9, file$9, 56, 12, 2239);
    			attr_dev(i2, "class", "icon-placeholder mdi-24px mdi mdi-clipboard-flow");
    			add_location(i2, file$9, 60, 14, 2400);
    			attr_dev(span10, "class", "menu-icon");
    			add_location(span10, file$9, 59, 12, 2360);
    			attr_dev(a5, "href", "/AtencionMedica/Interconsultas");
    			attr_dev(a5, "class", "menu-link");
    			add_location(a5, file$9, 55, 10, 2157);
    			attr_dev(li2, "class", "menu-item");
    			add_location(li2, file$9, 54, 8, 2048);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$9, 25, 6, 807);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$9, 23, 4, 719);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$9, 5, 2, 128);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			append_dev(aside, div1);
    			append_dev(div1, span0);
    			append_dev(span0, a0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, a1);
    			append_dev(div0, t2);
    			append_dev(div0, a2);
    			append_dev(aside, t3);
    			append_dev(aside, div2);
    			append_dev(div2, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a3);
    			append_dev(a3, span2);
    			append_dev(span2, span1);
    			append_dev(a3, t5);
    			append_dev(a3, span4);
    			append_dev(span4, span3);
    			append_dev(span4, t7);
    			append_dev(span4, i0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, a4);
    			append_dev(a4, span6);
    			append_dev(span6, span5);
    			append_dev(a4, t10);
    			append_dev(a4, span7);
    			append_dev(span7, i1);
    			append_dev(ul, t11);
    			append_dev(ul, li2);
    			append_dev(li2, a5);
    			append_dev(a5, span9);
    			append_dev(span9, span8);
    			append_dev(a5, t13);
    			append_dev(a5, span10);
    			append_dev(span10, i2);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a3)),
    					action_destroyer(active_action = active.call(null, li0, { path: "/", className: "active" })),
    					action_destroyer(link_action_2 = link.call(null, a4)),
    					action_destroyer(active_action_1 = active.call(null, li1, {
    						path: "/AtencionMedica/Atenciones",
    						className: "active"
    					})),
    					action_destroyer(link_action_3 = link.call(null, a5)),
    					action_destroyer(active_action_2 = active.call(null, li2, {
    						path: "/AtencionMedica/Interconsultas",
    						className: "active"
    					}))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Aside", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Aside> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, active });
    	return [];
    }

    class Aside extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Aside",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\Pages\AtencionMedica\Interconsultas.svelte generated by Svelte v3.29.0 */
    const file$a = "src\\Pages\\AtencionMedica\\Interconsultas.svelte";

    function create_fragment$b(ctx) {
    	let aside;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div13;
    	let div0;
    	let t2;
    	let h4;
    	let t4;
    	let div12;
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let input;
    	let t5;
    	let div2;
    	let div1;
    	let span0;
    	let t6;
    	let div11;
    	let div10;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t8;
    	let th1;
    	let t10;
    	let th2;
    	let t12;
    	let th3;
    	let t13;
    	let tbody;
    	let tr1;
    	let td0;
    	let div8;
    	let div7;
    	let span1;
    	let t15;
    	let span2;
    	let t17;
    	let td1;
    	let t19;
    	let td2;
    	let t21;
    	let td3;
    	let div9;
    	let a;
    	let link_action;
    	let current;
    	let mounted;
    	let dispose;
    	aside = new Aside({ $$inline: true });
    	header = new Header({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(aside.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div13 = element("div");
    			div0 = element("div");
    			t2 = space();
    			h4 = element("h4");
    			h4.textContent = "Interconsultas";
    			t4 = space();
    			div12 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			input = element("input");
    			t5 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			t6 = space();
    			div11 = element("div");
    			div10 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Nombres";
    			t8 = space();
    			th1 = element("th");
    			th1.textContent = "Edad";
    			t10 = space();
    			th2 = element("th");
    			th2.textContent = "Sexo";
    			t12 = space();
    			th3 = element("th");
    			t13 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			div8 = element("div");
    			div7 = element("div");
    			span1 = element("span");
    			span1.textContent = "FD";
    			t15 = space();
    			span2 = element("span");
    			span2.textContent = "Fiordaliza De Jesus";
    			t17 = space();
    			td1 = element("td");
    			td1.textContent = "49 años";
    			t19 = space();
    			td2 = element("td");
    			td2.textContent = "Femenino";
    			t21 = space();
    			td3 = element("td");
    			div9 = element("div");
    			a = element("a");
    			a.textContent = "VER INTERCONSULTA";
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$a, 12, 6, 298);
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$a, 13, 6, 325);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "class", "form-control form-control-appended");
    			attr_dev(input, "placeholder", "Buscar");
    			add_location(input, file$a, 19, 28, 608);
    			attr_dev(span0, "class", "mdi mdi-magnify");
    			add_location(span0, file$a, 22, 36, 857);
    			attr_dev(div1, "class", "input-group-text");
    			add_location(div1, file$a, 21, 32, 789);
    			attr_dev(div2, "class", "input-group-append");
    			add_location(div2, file$a, 20, 28, 723);
    			attr_dev(div3, "class", "input-group input-group-flush mb-3");
    			add_location(div3, file$a, 18, 24, 530);
    			attr_dev(div4, "class", "col-md-5");
    			add_location(div4, file$a, 17, 20, 482);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$a, 16, 16, 443);
    			attr_dev(div6, "class", "col-md-12");
    			add_location(div6, file$a, 15, 12, 402);
    			add_location(th0, file$a, 34, 32, 1337);
    			add_location(th1, file$a, 35, 32, 1387);
    			add_location(th2, file$a, 36, 32, 1434);
    			add_location(th3, file$a, 37, 32, 1481);
    			add_location(tr0, file$a, 33, 28, 1299);
    			add_location(thead, file$a, 32, 24, 1262);
    			attr_dev(span1, "class", "avatar-title rounded-circle ");
    			add_location(span1, file$a, 45, 44, 1897);
    			attr_dev(div7, "class", "avatar avatar-sm");
    			add_location(div7, file$a, 44, 40, 1821);
    			attr_dev(div8, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div8, file$a, 43, 36, 1733);
    			add_location(span2, file$a, 48, 43, 2048);
    			add_location(td0, file$a, 42, 32, 1691);
    			add_location(td1, file$a, 50, 32, 2153);
    			add_location(td2, file$a, 51, 32, 2203);
    			attr_dev(a, "href", "/Paciente/Editar");
    			attr_dev(a, "data-toggle", "tooltip");
    			attr_dev(a, "data-placement", "top");
    			attr_dev(a, "data-original-title", "Modificar paciente");
    			attr_dev(a, "class", "btn btn-outline-secondary btn-sm");
    			add_location(a, file$a, 55, 40, 2414);
    			set_style(div9, "width", "200px");
    			attr_dev(div9, "class", "ml-auto");
    			add_location(div9, file$a, 54, 36, 2329);
    			set_style(td3, "text-align", "right");
    			add_location(td3, file$a, 53, 32, 2260);
    			add_location(tr1, file$a, 41, 28, 1653);
    			attr_dev(tbody, "data-bind", "foreach: pacientes");
    			add_location(tbody, file$a, 40, 24, 1585);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$a, 31, 20, 1188);
    			attr_dev(div10, "class", "table-responsive");
    			add_location(div10, file$a, 30, 16, 1136);
    			attr_dev(div11, "class", "col-md-12 m-b-30");
    			add_location(div11, file$a, 29, 12, 1088);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$a, 14, 8, 371);
    			attr_dev(div13, "class", "p-2");
    			add_location(div13, file$a, 11, 4, 273);
    			attr_dev(section, "class", "admin-content p-2");
    			add_location(section, file$a, 10, 2, 232);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$a, 8, 0, 189);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(aside, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t1);
    			append_dev(main, section);
    			append_dev(section, div13);
    			append_dev(div13, div0);
    			append_dev(div13, t2);
    			append_dev(div13, h4);
    			append_dev(div13, t4);
    			append_dev(div13, div12);
    			append_dev(div12, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, input);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div12, t6);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t8);
    			append_dev(tr0, th1);
    			append_dev(tr0, t10);
    			append_dev(tr0, th2);
    			append_dev(tr0, t12);
    			append_dev(tr0, th3);
    			append_dev(table, t13);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(td0, div8);
    			append_dev(div8, div7);
    			append_dev(div7, span1);
    			append_dev(td0, t15);
    			append_dev(td0, span2);
    			append_dev(tr1, t17);
    			append_dev(tr1, td1);
    			append_dev(tr1, t19);
    			append_dev(tr1, td2);
    			append_dev(tr1, t21);
    			append_dev(tr1, td3);
    			append_dev(td3, div9);
    			append_dev(div9, a);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(link_action = link.call(null, a));
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(aside.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(aside.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(aside, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Interconsultas", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Interconsultas> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Aside, link });
    	return [];
    }

    class Interconsultas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Interconsultas",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\Layout\AsideAtencion.svelte generated by Svelte v3.29.0 */
    const file$b = "src\\Layout\\AsideAtencion.svelte";

    function create_fragment$c(ctx) {
    	let aside;
    	let div1;
    	let span0;
    	let a0;
    	let link_action;
    	let t1;
    	let div0;
    	let a1;
    	let t2;
    	let a2;
    	let t3;
    	let div2;
    	let ul;
    	let li0;
    	let a3;
    	let span2;
    	let span1;
    	let t5;
    	let span4;
    	let span3;
    	let t7;
    	let i0;
    	let link_action_1;
    	let active_action;
    	let t8;
    	let li1;
    	let a4;
    	let span6;
    	let span5;
    	let t10;
    	let span7;
    	let i1;
    	let link_action_2;
    	let active_action_1;
    	let t11;
    	let li2;
    	let a5;
    	let span9;
    	let span8;
    	let t13;
    	let span10;
    	let i2;
    	let link_action_3;
    	let active_action_2;
    	let t14;
    	let li3;
    	let a6;
    	let span12;
    	let span11;
    	let t16;
    	let span13;
    	let i3;
    	let link_action_4;
    	let active_action_3;
    	let t17;
    	let li4;
    	let a7;
    	let span16;
    	let span14;
    	let t19;
    	let span15;
    	let t21;
    	let span17;
    	let i4;
    	let link_action_5;
    	let active_action_4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			aside = element("aside");
    			div1 = element("div");
    			span0 = element("span");
    			a0 = element("a");
    			a0.textContent = "xmedical";
    			t1 = space();
    			div0 = element("div");
    			a1 = element("a");
    			t2 = space();
    			a2 = element("a");
    			t3 = space();
    			div2 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a3 = element("a");
    			span2 = element("span");
    			span1 = element("span");
    			span1.textContent = "IR A INICIO";
    			t5 = space();
    			span4 = element("span");
    			span3 = element("span");
    			span3.textContent = "1";
    			t7 = space();
    			i0 = element("i");
    			t8 = space();
    			li1 = element("li");
    			a4 = element("a");
    			span6 = element("span");
    			span5 = element("span");
    			span5.textContent = "Resumen";
    			t10 = space();
    			span7 = element("span");
    			i1 = element("i");
    			t11 = space();
    			li2 = element("li");
    			a5 = element("a");
    			span9 = element("span");
    			span8 = element("span");
    			span8.textContent = "Editar atencion";
    			t13 = space();
    			span10 = element("span");
    			i2 = element("i");
    			t14 = space();
    			li3 = element("li");
    			a6 = element("a");
    			span12 = element("span");
    			span11 = element("span");
    			span11.textContent = "Historia Clinica";
    			t16 = space();
    			span13 = element("span");
    			i3 = element("i");
    			t17 = space();
    			li4 = element("li");
    			a7 = element("a");
    			span16 = element("span");
    			span14 = element("span");
    			span14.textContent = "Notas médicas";
    			t19 = space();
    			span15 = element("span");
    			span15.textContent = "Ingreso y Evoluciones";
    			t21 = space();
    			span17 = element("span");
    			i4 = element("i");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$b, 9, 8, 286);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$b, 8, 6, 242);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$b, 14, 8, 438);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$b, 18, 8, 611);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$b, 12, 6, 378);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$b, 6, 4, 163);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$b, 30, 14, 1041);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$b, 29, 12, 1000);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$b, 33, 14, 1158);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$b, 34, 14, 1238);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$b, 32, 12, 1118);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$b, 28, 10, 947);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$b, 27, 8, 867);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$b, 44, 16, 1642);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$b, 43, 12, 1599);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i1, file$b, 47, 16, 1757);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$b, 46, 12, 1715);
    			attr_dev(a4, "href", "/AtencionMedica/Resumen");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$b, 42, 12, 1524);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$b, 41, 8, 1420);
    			attr_dev(span8, "class", "menu-name");
    			add_location(span8, file$b, 57, 16, 2208);
    			attr_dev(span9, "class", "menu-label");
    			add_location(span9, file$b, 56, 12, 2165);
    			attr_dev(i2, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i2, file$b, 60, 16, 2331);
    			attr_dev(span10, "class", "menu-icon");
    			add_location(span10, file$b, 59, 12, 2289);
    			attr_dev(a5, "href", "/AtencionMedica/EditarDatosAtencion");
    			attr_dev(a5, "class", "menu-link");
    			add_location(a5, file$b, 55, 12, 2078);
    			attr_dev(li2, "class", "menu-item");
    			add_location(li2, file$b, 54, 8, 1962);
    			attr_dev(span11, "class", "menu-name");
    			add_location(span11, file$b, 70, 16, 2782);
    			attr_dev(span12, "class", "menu-label");
    			add_location(span12, file$b, 69, 12, 2739);
    			attr_dev(i3, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i3, file$b, 73, 16, 2906);
    			attr_dev(span13, "class", "menu-icon");
    			add_location(span13, file$b, 72, 12, 2864);
    			attr_dev(a6, "href", "/AtencionMedica/HistoriaClinica");
    			attr_dev(a6, "class", "menu-link");
    			add_location(a6, file$b, 68, 12, 2656);
    			attr_dev(li3, "class", "menu-item");
    			add_location(li3, file$b, 67, 8, 2544);
    			attr_dev(span14, "class", "menu-name");
    			add_location(span14, file$b, 83, 16, 3343);
    			attr_dev(span15, "class", "menu-info");
    			add_location(span15, file$b, 84, 16, 3405);
    			attr_dev(span16, "class", "menu-label");
    			add_location(span16, file$b, 82, 12, 3300);
    			attr_dev(i4, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i4, file$b, 87, 16, 3534);
    			attr_dev(span17, "class", "menu-icon");
    			add_location(span17, file$b, 86, 12, 3492);
    			attr_dev(a7, "href", "/AtencionMedica/NotasMedicas");
    			attr_dev(a7, "class", "menu-link");
    			add_location(a7, file$b, 81, 12, 3220);
    			attr_dev(li4, "class", "menu-item");
    			add_location(li4, file$b, 80, 8, 3111);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$b, 25, 6, 807);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$b, 23, 4, 719);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$b, 5, 2, 128);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			append_dev(aside, div1);
    			append_dev(div1, span0);
    			append_dev(span0, a0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, a1);
    			append_dev(div0, t2);
    			append_dev(div0, a2);
    			append_dev(aside, t3);
    			append_dev(aside, div2);
    			append_dev(div2, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a3);
    			append_dev(a3, span2);
    			append_dev(span2, span1);
    			append_dev(a3, t5);
    			append_dev(a3, span4);
    			append_dev(span4, span3);
    			append_dev(span4, t7);
    			append_dev(span4, i0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, a4);
    			append_dev(a4, span6);
    			append_dev(span6, span5);
    			append_dev(a4, t10);
    			append_dev(a4, span7);
    			append_dev(span7, i1);
    			append_dev(ul, t11);
    			append_dev(ul, li2);
    			append_dev(li2, a5);
    			append_dev(a5, span9);
    			append_dev(span9, span8);
    			append_dev(a5, t13);
    			append_dev(a5, span10);
    			append_dev(span10, i2);
    			append_dev(ul, t14);
    			append_dev(ul, li3);
    			append_dev(li3, a6);
    			append_dev(a6, span12);
    			append_dev(span12, span11);
    			append_dev(a6, t16);
    			append_dev(a6, span13);
    			append_dev(span13, i3);
    			append_dev(ul, t17);
    			append_dev(ul, li4);
    			append_dev(li4, a7);
    			append_dev(a7, span16);
    			append_dev(span16, span14);
    			append_dev(span16, t19);
    			append_dev(span16, span15);
    			append_dev(a7, t21);
    			append_dev(a7, span17);
    			append_dev(span17, i4);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a3)),
    					action_destroyer(active_action = active.call(null, li0, { path: "/", className: "active" })),
    					action_destroyer(link_action_2 = link.call(null, a4)),
    					action_destroyer(active_action_1 = active.call(null, li1, {
    						path: "/AtencionMedica/Resumen",
    						className: "active"
    					})),
    					action_destroyer(link_action_3 = link.call(null, a5)),
    					action_destroyer(active_action_2 = active.call(null, li2, {
    						path: "/AtencionMedica/EditarDatosAtencion",
    						className: "active"
    					})),
    					action_destroyer(link_action_4 = link.call(null, a6)),
    					action_destroyer(active_action_3 = active.call(null, li3, {
    						path: "/AtencionMedica/HistoriaClinica",
    						className: "active"
    					})),
    					action_destroyer(link_action_5 = link.call(null, a7)),
    					action_destroyer(active_action_4 = active.call(null, li4, {
    						path: "/AtencionMedica/NotasMedicas",
    						className: "active"
    					}))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AsideAtencion", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AsideAtencion> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, active });
    	return [];
    }

    class AsideAtencion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AsideAtencion",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src\Pages\AtencionMedica\Resumen.svelte generated by Svelte v3.29.0 */
    const file$c = "src\\Pages\\AtencionMedica\\Resumen.svelte";

    function create_fragment$d(ctx) {
    	let asideatencion;
    	let t0;
    	let div5;
    	let div4;
    	let div0;
    	let h50;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let div1;
    	let t5;
    	let div3;
    	let div2;
    	let button;
    	let i;
    	let t6;
    	let sapn;
    	let t8;
    	let header;
    	let t9;
    	let main;
    	let div34;
    	let div17;
    	let div6;
    	let h51;
    	let t11;
    	let div16;
    	let div15;
    	let div10;
    	let div9;
    	let div7;
    	let img0;
    	let img0_src_value;
    	let t12;
    	let div8;
    	let h60;
    	let span2;
    	let t14;
    	let span3;
    	let t16;
    	let small0;
    	let t18;
    	let pre;
    	let t20;
    	let small1;
    	let t22;
    	let p0;
    	let t24;
    	let div14;
    	let div13;
    	let div11;
    	let img1;
    	let img1_src_value;
    	let t25;
    	let div12;
    	let h61;
    	let span4;
    	let t27;
    	let span5;
    	let t29;
    	let small2;
    	let t31;
    	let p1;
    	let t33;
    	let div21;
    	let div18;
    	let h52;
    	let t35;
    	let div20;
    	let div19;
    	let table0;
    	let thead0;
    	let tr0;
    	let th0;
    	let t37;
    	let th1;
    	let t39;
    	let th2;
    	let t41;
    	let th3;
    	let t43;
    	let th4;
    	let t45;
    	let tbody0;
    	let tr1;
    	let td0;
    	let t47;
    	let td1;
    	let t49;
    	let td2;
    	let t51;
    	let td3;
    	let t53;
    	let td4;
    	let t55;
    	let div25;
    	let div22;
    	let h62;
    	let t57;
    	let div24;
    	let div23;
    	let table1;
    	let thead1;
    	let tr2;
    	let th5;
    	let t59;
    	let th6;
    	let t61;
    	let th7;
    	let t63;
    	let th8;
    	let t65;
    	let th9;
    	let t67;
    	let th10;
    	let t69;
    	let tbody1;
    	let tr3;
    	let td5;
    	let t71;
    	let td6;
    	let t73;
    	let td7;
    	let t75;
    	let td8;
    	let t77;
    	let td9;
    	let t79;
    	let th11;
    	let t81;
    	let tr4;
    	let td10;
    	let t83;
    	let td11;
    	let t85;
    	let td12;
    	let t87;
    	let td13;
    	let t89;
    	let td14;
    	let t91;
    	let th12;
    	let t93;
    	let div29;
    	let div26;
    	let h63;
    	let t95;
    	let div28;
    	let div27;
    	let table2;
    	let thead2;
    	let tr5;
    	let th13;
    	let t97;
    	let th14;
    	let t99;
    	let th15;
    	let t101;
    	let tbody2;
    	let tr6;
    	let td15;
    	let t103;
    	let td16;
    	let span6;
    	let t105;
    	let td17;
    	let t107;
    	let tr7;
    	let td18;
    	let t109;
    	let td19;
    	let span7;
    	let t111;
    	let td20;
    	let t113;
    	let tr8;
    	let td21;
    	let t115;
    	let td22;
    	let span8;
    	let t117;
    	let td23;
    	let t119;
    	let tr9;
    	let td24;
    	let t121;
    	let td25;
    	let span9;
    	let t123;
    	let td26;
    	let t125;
    	let div33;
    	let div30;
    	let h64;
    	let t127;
    	let div32;
    	let div31;
    	let table3;
    	let thead3;
    	let tr10;
    	let th16;
    	let t129;
    	let th17;
    	let t131;
    	let th18;
    	let t133;
    	let th19;
    	let t135;
    	let tbody3;
    	let tr11;
    	let td27;
    	let t137;
    	let td28;
    	let t139;
    	let td29;
    	let span10;
    	let t141;
    	let td30;
    	let t143;
    	let tr12;
    	let td31;
    	let t145;
    	let td32;
    	let t147;
    	let td33;
    	let span11;
    	let t149;
    	let td34;
    	let t151;
    	let tr13;
    	let td35;
    	let t153;
    	let td36;
    	let t155;
    	let td37;
    	let span12;
    	let t157;
    	let td38;
    	let t159;
    	let tr14;
    	let td39;
    	let t161;
    	let td40;
    	let t163;
    	let td41;
    	let span13;
    	let t165;
    	let td42;
    	let t167;
    	let modaldatospaciente;
    	let current;
    	asideatencion = new AsideAtencion({ $$inline: true });
    	header = new Header({ $$inline: true });
    	modaldatospaciente = new ModalDatosPaciente({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asideatencion.$$.fragment);
    			t0 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			span0 = element("span");
    			span0.textContent = "Resumen general";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "Fiordaliza\r\n                        De Jesus Herrera";
    			t4 = space();
    			div1 = element("div");
    			t5 = space();
    			div3 = element("div");
    			div2 = element("div");
    			button = element("button");
    			i = element("i");
    			t6 = space();
    			sapn = element("sapn");
    			sapn.textContent = "Datos del Paciente";
    			t8 = space();
    			create_component(header.$$.fragment);
    			t9 = space();
    			main = element("main");
    			div34 = element("div");
    			div17 = element("div");
    			div6 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Resumen";
    			t11 = space();
    			div16 = element("div");
    			div15 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div7 = element("div");
    			img0 = element("img");
    			t12 = space();
    			div8 = element("div");
    			h60 = element("h6");
    			span2 = element("span");
    			span2.textContent = "-doctor\r\n                                            name-";
    			t14 = space();
    			span3 = element("span");
    			span3.textContent = "-datetime-";
    			t16 = space();
    			small0 = element("small");
    			small0.textContent = "Motivo de Consulta";
    			t18 = space();
    			pre = element("pre");
    			pre.textContent = "-motivo -consulta-";
    			t20 = space();
    			small1 = element("small");
    			small1.textContent = "Historia de la Enfermedad";
    			t22 = space();
    			p0 = element("p");
    			p0.textContent = "-historia enfermedad-";
    			t24 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div11 = element("div");
    			img1 = element("img");
    			t25 = space();
    			div12 = element("div");
    			h61 = element("h6");
    			span4 = element("span");
    			span4.textContent = "-doctor name-";
    			t27 = space();
    			span5 = element("span");
    			span5.textContent = "-datetime-";
    			t29 = space();
    			small2 = element("small");
    			small2.textContent = "-tipo\r\n                                        nota-";
    			t31 = space();
    			p1 = element("p");
    			p1.textContent = "-nota-";
    			t33 = space();
    			div21 = element("div");
    			div18 = element("div");
    			h52 = element("h5");
    			h52.textContent = "Diagnosticos";
    			t35 = space();
    			div20 = element("div");
    			div19 = element("div");
    			table0 = element("table");
    			thead0 = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Código";
    			t37 = space();
    			th1 = element("th");
    			th1.textContent = "Catalogo";
    			t39 = space();
    			th2 = element("th");
    			th2.textContent = "Descripción";
    			t41 = space();
    			th3 = element("th");
    			th3.textContent = "Especialista";
    			t43 = space();
    			th4 = element("th");
    			th4.textContent = "Comentario";
    			t45 = space();
    			tbody0 = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "-codigo-";
    			t47 = space();
    			td1 = element("td");
    			td1.textContent = "-catalogo-";
    			t49 = space();
    			td2 = element("td");
    			td2.textContent = "-descripcion-";
    			t51 = space();
    			td3 = element("td");
    			td3.textContent = "-especialista-";
    			t53 = space();
    			td4 = element("td");
    			td4.textContent = "-comentario-";
    			t55 = space();
    			div25 = element("div");
    			div22 = element("div");
    			h62 = element("h6");
    			h62.textContent = "Tratamientos";
    			t57 = space();
    			div24 = element("div");
    			div23 = element("div");
    			table1 = element("table");
    			thead1 = element("thead");
    			tr2 = element("tr");
    			th5 = element("th");
    			th5.textContent = "Medicamento";
    			t59 = space();
    			th6 = element("th");
    			th6.textContent = "Dosis";
    			t61 = space();
    			th7 = element("th");
    			th7.textContent = "Concentracion";
    			t63 = space();
    			th8 = element("th");
    			th8.textContent = "Via";
    			t65 = space();
    			th9 = element("th");
    			th9.textContent = "Intervalo";
    			t67 = space();
    			th10 = element("th");
    			th10.textContent = "Especialista";
    			t69 = space();
    			tbody1 = element("tbody");
    			tr3 = element("tr");
    			td5 = element("td");
    			td5.textContent = "Sol. Salino";
    			t71 = space();
    			td6 = element("td");
    			td6.textContent = "1000";
    			t73 = space();
    			td7 = element("td");
    			td7.textContent = "ML";
    			t75 = space();
    			td8 = element("td");
    			td8.textContent = "Intravenosa";
    			t77 = space();
    			td9 = element("td");
    			td9.textContent = "Cada 8 horas";
    			t79 = space();
    			th11 = element("th");
    			th11.textContent = "Dra. Sierra";
    			t81 = space();
    			tr4 = element("tr");
    			td10 = element("td");
    			td10.textContent = "Zertal";
    			t83 = space();
    			td11 = element("td");
    			td11.textContent = "10";
    			t85 = space();
    			td12 = element("td");
    			td12.textContent = "MG";
    			t87 = space();
    			td13 = element("td");
    			td13.textContent = "Intravenosa";
    			t89 = space();
    			td14 = element("td");
    			td14.textContent = "Cada 12 horas";
    			t91 = space();
    			th12 = element("th");
    			th12.textContent = "Dr. Ramon Mena";
    			t93 = space();
    			div29 = element("div");
    			div26 = element("div");
    			h63 = element("h6");
    			h63.textContent = "Aplicaciones";
    			t95 = space();
    			div28 = element("div");
    			div27 = element("div");
    			table2 = element("table");
    			thead2 = element("thead");
    			tr5 = element("tr");
    			th13 = element("th");
    			th13.textContent = "Medicamento";
    			t97 = space();
    			th14 = element("th");
    			th14.textContent = "Proxima aplicacion";
    			t99 = space();
    			th15 = element("th");
    			th15.textContent = "Ultima aplicacion";
    			t101 = space();
    			tbody2 = element("tbody");
    			tr6 = element("tr");
    			td15 = element("td");
    			td15.textContent = "SOL. MIXTA 0.9%, 1000 CC | Dosificacion de: 500CC";
    			t103 = space();
    			td16 = element("td");
    			span6 = element("span");
    			span6.textContent = "En 1 horas";
    			t105 = space();
    			td17 = element("td");
    			td17.textContent = "12/03/2020 a las 9:30am";
    			t107 = space();
    			tr7 = element("tr");
    			td18 = element("td");
    			td18.textContent = "DEXTROSA EN RINGER | Dosificacion de: 400CC";
    			t109 = space();
    			td19 = element("td");
    			span7 = element("span");
    			span7.textContent = "En 2 horas";
    			t111 = space();
    			td20 = element("td");
    			td20.textContent = "12/03/2020 a las 9:30am";
    			t113 = space();
    			tr8 = element("tr");
    			td21 = element("td");
    			td21.textContent = "TRAMAL 100MG | Dosificacion de: 1 Ampolla";
    			t115 = space();
    			td22 = element("td");
    			span8 = element("span");
    			span8.textContent = "En 6 horas";
    			t117 = space();
    			td23 = element("td");
    			td23.textContent = "12/03/2020 a las 9:30am";
    			t119 = space();
    			tr9 = element("tr");
    			td24 = element("td");
    			td24.textContent = "SOL. MIXTA 0.9%, 1000 CC | Dosificacion de: 500CC";
    			t121 = space();
    			td25 = element("td");
    			span9 = element("span");
    			span9.textContent = "Aplicado monodosis";
    			t123 = space();
    			td26 = element("td");
    			td26.textContent = "12/03/2020 a las 9:30am";
    			t125 = space();
    			div33 = element("div");
    			div30 = element("div");
    			h64 = element("h6");
    			h64.textContent = "Estudios";
    			t127 = space();
    			div32 = element("div");
    			div31 = element("div");
    			table3 = element("table");
    			thead3 = element("thead");
    			tr10 = element("tr");
    			th16 = element("th");
    			th16.textContent = "Descripcion";
    			t129 = space();
    			th17 = element("th");
    			th17.textContent = "Especialista";
    			t131 = space();
    			th18 = element("th");
    			th18.textContent = "Diagnostico";
    			t133 = space();
    			th19 = element("th");
    			th19.textContent = "Comentario";
    			t135 = space();
    			tbody3 = element("tbody");
    			tr11 = element("tr");
    			td27 = element("td");
    			td27.textContent = "Radiografia de Torax AP y LAT";
    			t137 = space();
    			td28 = element("td");
    			td28.textContent = "Dra. Sierra";
    			t139 = space();
    			td29 = element("td");
    			span10 = element("span");
    			span10.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\r\n                                            FLEXNERI";
    			t141 = space();
    			td30 = element("td");
    			td30.textContent = "Este es un comentario de ejemplo";
    			t143 = space();
    			tr12 = element("tr");
    			td31 = element("td");
    			td31.textContent = "Hormonas T4";
    			t145 = space();
    			td32 = element("td");
    			td32.textContent = "Dr. Amarante";
    			t147 = space();
    			td33 = element("td");
    			span11 = element("span");
    			span11.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\r\n                                            FLEXNERI";
    			t149 = space();
    			td34 = element("td");
    			td34.textContent = "Este es un comentario de ejemplo";
    			t151 = space();
    			tr13 = element("tr");
    			td35 = element("td");
    			td35.textContent = "Hormonas T3";
    			t153 = space();
    			td36 = element("td");
    			td36.textContent = "Dr. Amarante";
    			t155 = space();
    			td37 = element("td");
    			span12 = element("span");
    			span12.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\r\n                                            FLEXNERI";
    			t157 = space();
    			td38 = element("td");
    			td38.textContent = "Este es un comentario de ejemplo";
    			t159 = space();
    			tr14 = element("tr");
    			td39 = element("td");
    			td39.textContent = "Hemograma";
    			t161 = space();
    			td40 = element("td");
    			td40.textContent = "Dr. Amarante";
    			t163 = space();
    			td41 = element("td");
    			span13 = element("span");
    			span13.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\r\n                                            FLEXNERI";
    			t165 = space();
    			td42 = element("td");
    			td42.textContent = "Este es un comentario de ejemplo";
    			t167 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			attr_dev(span0, "class", "badge badge-primary");
    			attr_dev(span0, "data-bind", "text: titulo");
    			add_location(span0, file$c, 12, 20, 453);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$c, 15, 20, 606);
    			add_location(h50, file$c, 11, 16, 427);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$c, 10, 12, 387);
    			attr_dev(div1, "class", "col-md-6");
    			set_style(div1, "text-align", "right");
    			add_location(div1, file$c, 19, 12, 775);
    			attr_dev(i, "data-bind", "class: icon");
    			attr_dev(i, "class", "mdi mdi-comment-eye");
    			add_location(i, file$c, 25, 24, 1101);
    			attr_dev(sapn, "data-bind", "text: text");
    			add_location(sapn, file$c, 26, 28, 1188);
    			attr_dev(button, "data-toggle", "modal");
    			attr_dev(button, "data-target", "#modalDatosPersonales");
    			set_style(button, "box-shadow", "none");
    			attr_dev(button, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button, file$c, 24, 20, 945);
    			attr_dev(div2, "class", "dropdown");
    			add_location(div2, file$c, 23, 16, 901);
    			attr_dev(div3, "class", "col-lg-12");
    			add_location(div3, file$c, 22, 12, 860);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$c, 9, 8, 356);
    			attr_dev(div5, "class", "contenedor-datos");
    			attr_dev(div5, "id", "divHeaderBar");
    			add_location(div5, file$c, 8, 4, 298);
    			attr_dev(h51, "class", "card-title m-b-0");
    			add_location(h51, file$c, 40, 20, 1602);
    			attr_dev(div6, "class", "card-header");
    			add_location(div6, file$c, 39, 16, 1555);
    			attr_dev(img0, "class", "avatar-img rounded-circle");
    			if (img0.src !== (img0_src_value = "/atmosTemplate/assets/img/person.webp")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "imagen paciente");
    			add_location(img0, file$c, 58, 36, 2610);
    			attr_dev(div7, "class", "avatar mr-3  avatar-sm");
    			add_location(div7, file$c, 57, 32, 2536);
    			attr_dev(span2, "data-bind", "text: atencionMedica.nombreMedico");
    			add_location(span2, file$c, 61, 59, 2874);
    			attr_dev(span3, "class", "text-muted ml-3 small");
    			attr_dev(span3, "data-bind", "text: new Date(atencionMedica.fechaIngreso()).toLocaleString('es-DO')");
    			add_location(span3, file$c, 64, 40, 3076);
    			attr_dev(h60, "class", "mt-0 mb-1");
    			add_location(h60, file$c, 61, 36, 2851);
    			attr_dev(small0, "class", "mt-4 mb-4 text-primary");
    			add_location(small0, file$c, 67, 36, 3338);
    			attr_dev(pre, "data-bind", "text: atencionMedica.motivoConsulta");
    			add_location(pre, file$c, 68, 36, 3440);
    			attr_dev(small1, "class", "mt-4 mb-4 text-primary");
    			add_location(small1, file$c, 71, 36, 3639);
    			attr_dev(p0, "data-bind", "text: atencionMedica.historiaEnfermedad");
    			add_location(p0, file$c, 72, 36, 3748);
    			attr_dev(div8, "class", "media-body");
    			add_location(div8, file$c, 60, 32, 2789);
    			attr_dev(div9, "class", "media");
    			add_location(div9, file$c, 56, 28, 2483);
    			attr_dev(div10, "class", "list-unstyled");
    			add_location(div10, file$c, 55, 24, 2426);
    			attr_dev(img1, "class", "avatar-img rounded-circle");
    			if (img1.src !== (img1_src_value = "/atmosTemplate/assets/img/person.webp")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "imagen paciente");
    			add_location(img1, file$c, 81, 36, 4253);
    			attr_dev(div11, "class", "avatar mr-3  avatar-sm");
    			add_location(div11, file$c, 80, 32, 4179);
    			attr_dev(span4, "data-bind", "text: name");
    			add_location(span4, file$c, 84, 59, 4517);
    			attr_dev(span5, "class", "text-muted ml-3 small");
    			attr_dev(span5, "data-bind", "text: new Date(fechaHora).toLocaleString('es-DO')");
    			add_location(span5, file$c, 85, 40, 4610);
    			attr_dev(h61, "class", "mt-0 mb-1");
    			add_location(h61, file$c, 84, 36, 4494);
    			attr_dev(small2, "class", "mt-4 mb-4 text-primary");
    			attr_dev(small2, "data-bind", "text: TIPO_NOTA_MEDICA[tipoNota]");
    			add_location(small2, file$c, 87, 36, 4807);
    			attr_dev(p1, "data-bind", "text: nota");
    			add_location(p1, file$c, 89, 36, 4988);
    			attr_dev(div12, "class", "media-body");
    			add_location(div12, file$c, 83, 32, 4432);
    			attr_dev(div13, "class", "media");
    			add_location(div13, file$c, 79, 28, 4126);
    			attr_dev(div14, "class", "list-unstyled");
    			attr_dev(div14, "data-bind", "foreach: notas");
    			add_location(div14, file$c, 78, 24, 4042);
    			add_location(div15, file$c, 54, 20, 2395);
    			attr_dev(div16, "class", "card-body");
    			add_location(div16, file$c, 53, 16, 2350);
    			attr_dev(div17, "class", "card m-b-30");
    			add_location(div17, file$c, 38, 12, 1512);
    			attr_dev(h52, "class", "m-b-0");
    			add_location(h52, file$c, 102, 20, 5392);
    			attr_dev(div18, "class", "card-header");
    			add_location(div18, file$c, 101, 16, 5345);
    			add_location(th0, file$c, 113, 36, 5769);
    			add_location(th1, file$c, 114, 36, 5822);
    			add_location(th2, file$c, 115, 36, 5877);
    			add_location(th3, file$c, 116, 36, 5935);
    			add_location(th4, file$c, 117, 36, 5994);
    			add_location(tr0, file$c, 112, 32, 5727);
    			add_location(thead0, file$c, 111, 28, 5686);
    			attr_dev(td0, "data-bind", "text: codigo");
    			add_location(td0, file$c, 122, 36, 6237);
    			attr_dev(td1, "data-bind", "text: catalogo");
    			add_location(td1, file$c, 123, 36, 6318);
    			attr_dev(td2, "data-bind", "text: problemaMedico");
    			add_location(td2, file$c, 124, 36, 6403);
    			attr_dev(td3, "data-bind", "text: name");
    			add_location(td3, file$c, 125, 36, 6498);
    			attr_dev(td4, "data-bind", "text: comentario");
    			add_location(td4, file$c, 126, 36, 6584);
    			add_location(tr1, file$c, 121, 32, 6195);
    			attr_dev(tbody0, "data-bind", "foreach: diagnosticos");
    			add_location(tbody0, file$c, 120, 28, 6120);
    			attr_dev(table0, "class", "table table-hover ");
    			add_location(table0, file$c, 110, 24, 5622);
    			attr_dev(div19, "class", "table-responsive");
    			add_location(div19, file$c, 108, 20, 5564);
    			attr_dev(div20, "class", "card-body");
    			add_location(div20, file$c, 107, 16, 5519);
    			attr_dev(div21, "class", "card m-b-30");
    			add_location(div21, file$c, 100, 12, 5302);
    			attr_dev(h62, "class", "m-b-0");
    			add_location(h62, file$c, 135, 20, 6930);
    			attr_dev(div22, "class", "card-header");
    			add_location(div22, file$c, 134, 16, 6883);
    			add_location(th5, file$c, 146, 36, 7307);
    			add_location(th6, file$c, 147, 36, 7365);
    			add_location(th7, file$c, 148, 36, 7417);
    			add_location(th8, file$c, 149, 36, 7477);
    			add_location(th9, file$c, 150, 36, 7527);
    			add_location(th10, file$c, 151, 36, 7583);
    			add_location(tr2, file$c, 145, 32, 7265);
    			add_location(thead1, file$c, 144, 28, 7224);
    			add_location(td5, file$c, 156, 36, 7794);
    			add_location(td6, file$c, 157, 36, 7852);
    			add_location(td7, file$c, 158, 36, 7903);
    			add_location(td8, file$c, 159, 36, 7952);
    			add_location(td9, file$c, 160, 36, 8010);
    			add_location(th11, file$c, 161, 36, 8069);
    			add_location(tr3, file$c, 155, 32, 7752);
    			add_location(td10, file$c, 164, 36, 8204);
    			add_location(td11, file$c, 165, 36, 8257);
    			add_location(td12, file$c, 166, 36, 8306);
    			add_location(td13, file$c, 167, 36, 8355);
    			add_location(td14, file$c, 168, 36, 8413);
    			add_location(th12, file$c, 169, 36, 8473);
    			add_location(tr4, file$c, 163, 32, 8162);
    			add_location(tbody1, file$c, 154, 28, 7711);
    			attr_dev(table1, "class", "table table-hover ");
    			add_location(table1, file$c, 143, 24, 7160);
    			attr_dev(div23, "class", "table-responsive");
    			add_location(div23, file$c, 141, 20, 7102);
    			attr_dev(div24, "class", "card-body");
    			add_location(div24, file$c, 140, 16, 7057);
    			attr_dev(div25, "class", "card m-b-30 d-none");
    			add_location(div25, file$c, 133, 12, 6833);
    			attr_dev(h63, "class", "m-b-0");
    			add_location(h63, file$c, 180, 20, 8794);
    			attr_dev(div26, "class", "card-header");
    			add_location(div26, file$c, 179, 16, 8747);
    			add_location(th13, file$c, 191, 36, 9171);
    			add_location(th14, file$c, 192, 36, 9229);
    			add_location(th15, file$c, 193, 36, 9294);
    			add_location(tr5, file$c, 190, 32, 9129);
    			add_location(thead2, file$c, 189, 28, 9088);
    			add_location(td15, file$c, 198, 36, 9533);
    			attr_dev(span6, "class", "badge badge-danger");
    			add_location(span6, file$c, 199, 40, 9633);
    			add_location(td16, file$c, 199, 36, 9629);
    			add_location(td17, file$c, 200, 36, 9726);
    			attr_dev(tr6, "class", "bg-soft-danger");
    			add_location(tr6, file$c, 197, 32, 9468);
    			add_location(td18, file$c, 203, 36, 9897);
    			attr_dev(span7, "class", "badge badge-warning");
    			add_location(span7, file$c, 204, 40, 9991);
    			add_location(td19, file$c, 204, 36, 9987);
    			add_location(td20, file$c, 205, 36, 10085);
    			attr_dev(tr7, "class", "bg-soft-warning");
    			add_location(tr7, file$c, 202, 32, 9831);
    			add_location(td21, file$c, 208, 36, 10256);
    			attr_dev(span8, "class", "badge badge-success");
    			add_location(span8, file$c, 209, 40, 10348);
    			add_location(td22, file$c, 209, 36, 10344);
    			add_location(td23, file$c, 210, 36, 10442);
    			attr_dev(tr8, "class", "bg-soft-success");
    			add_location(tr8, file$c, 207, 32, 10190);
    			add_location(td24, file$c, 213, 36, 10613);
    			attr_dev(span9, "class", "badge badge-success");
    			add_location(span9, file$c, 214, 40, 10713);
    			add_location(td25, file$c, 214, 36, 10709);
    			add_location(td26, file$c, 215, 36, 10815);
    			attr_dev(tr9, "class", "bg-soft-success");
    			add_location(tr9, file$c, 212, 32, 10547);
    			add_location(tbody2, file$c, 196, 28, 9427);
    			attr_dev(table2, "class", "table table-hover ");
    			add_location(table2, file$c, 188, 24, 9024);
    			attr_dev(div27, "class", "table-responsive");
    			add_location(div27, file$c, 186, 20, 8966);
    			attr_dev(div28, "class", "card-body");
    			add_location(div28, file$c, 185, 16, 8921);
    			attr_dev(div29, "class", "card m-b-30 d-none");
    			add_location(div29, file$c, 178, 12, 8697);
    			attr_dev(h64, "class", "m-b-0");
    			add_location(h64, file$c, 226, 20, 11145);
    			attr_dev(div30, "class", "card-header");
    			add_location(div30, file$c, 225, 16, 11098);
    			add_location(th16, file$c, 237, 36, 11518);
    			add_location(th17, file$c, 238, 36, 11576);
    			add_location(th18, file$c, 239, 36, 11635);
    			add_location(th19, file$c, 240, 36, 11693);
    			add_location(tr10, file$c, 236, 32, 11476);
    			add_location(thead3, file$c, 235, 28, 11435);
    			add_location(td27, file$c, 245, 36, 11902);
    			add_location(td28, file$c, 246, 36, 11978);
    			attr_dev(span10, "class", "badge");
    			add_location(span10, file$c, 247, 40, 12040);
    			add_location(td29, file$c, 247, 36, 12036);
    			set_style(td30, "font-weight", "normal");
    			add_location(td30, file$c, 249, 36, 12192);
    			add_location(tr11, file$c, 244, 32, 11860);
    			add_location(td31, file$c, 252, 36, 12401);
    			add_location(td32, file$c, 253, 36, 12459);
    			attr_dev(span11, "class", "badge");
    			add_location(span11, file$c, 254, 40, 12522);
    			add_location(td33, file$c, 254, 36, 12518);
    			set_style(td34, "font-weight", "normal");
    			add_location(td34, file$c, 256, 36, 12674);
    			attr_dev(tr12, "class", "bg-soft-success");
    			add_location(tr12, file$c, 251, 32, 12335);
    			add_location(td35, file$c, 259, 36, 12883);
    			add_location(td36, file$c, 260, 36, 12941);
    			attr_dev(span12, "class", "badge");
    			add_location(span12, file$c, 261, 40, 13004);
    			add_location(td37, file$c, 261, 36, 13000);
    			set_style(td38, "font-weight", "normal");
    			add_location(td38, file$c, 263, 36, 13156);
    			attr_dev(tr13, "class", "bg-soft-success");
    			add_location(tr13, file$c, 258, 32, 12817);
    			add_location(td39, file$c, 266, 36, 13365);
    			add_location(td40, file$c, 267, 36, 13421);
    			attr_dev(span13, "class", "badge");
    			add_location(span13, file$c, 268, 40, 13484);
    			add_location(td41, file$c, 268, 36, 13480);
    			set_style(td42, "font-weight", "normal");
    			add_location(td42, file$c, 270, 36, 13636);
    			attr_dev(tr14, "class", "bg-soft-success");
    			add_location(tr14, file$c, 265, 32, 13299);
    			add_location(tbody3, file$c, 243, 28, 11819);
    			attr_dev(table3, "class", "table table-hover ");
    			add_location(table3, file$c, 234, 24, 11371);
    			attr_dev(div31, "class", "table-responsive");
    			add_location(div31, file$c, 232, 20, 11313);
    			attr_dev(div32, "class", "card-body");
    			add_location(div32, file$c, 231, 16, 11268);
    			attr_dev(div33, "class", "card m-b-30 d-none");
    			add_location(div33, file$c, 224, 12, 11048);
    			attr_dev(div34, "class", "col-lg-12");
    			set_style(div34, "margin-top", "130px");
    			add_location(div34, file$c, 37, 8, 1448);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$c, 36, 4, 1413);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asideatencion, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, h50);
    			append_dev(h50, span0);
    			append_dev(h50, t2);
    			append_dev(h50, span1);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    			append_dev(button, i);
    			append_dev(button, t6);
    			append_dev(button, sapn);
    			insert_dev(target, t8, anchor);
    			mount_component(header, target, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div34);
    			append_dev(div34, div17);
    			append_dev(div17, div6);
    			append_dev(div6, h51);
    			append_dev(div17, t11);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div7);
    			append_dev(div7, img0);
    			append_dev(div9, t12);
    			append_dev(div9, div8);
    			append_dev(div8, h60);
    			append_dev(h60, span2);
    			append_dev(h60, t14);
    			append_dev(h60, span3);
    			append_dev(div8, t16);
    			append_dev(div8, small0);
    			append_dev(div8, t18);
    			append_dev(div8, pre);
    			append_dev(div8, t20);
    			append_dev(div8, small1);
    			append_dev(div8, t22);
    			append_dev(div8, p0);
    			append_dev(div15, t24);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div11, img1);
    			append_dev(div13, t25);
    			append_dev(div13, div12);
    			append_dev(div12, h61);
    			append_dev(h61, span4);
    			append_dev(h61, t27);
    			append_dev(h61, span5);
    			append_dev(div12, t29);
    			append_dev(div12, small2);
    			append_dev(div12, t31);
    			append_dev(div12, p1);
    			append_dev(div34, t33);
    			append_dev(div34, div21);
    			append_dev(div21, div18);
    			append_dev(div18, h52);
    			append_dev(div21, t35);
    			append_dev(div21, div20);
    			append_dev(div20, div19);
    			append_dev(div19, table0);
    			append_dev(table0, thead0);
    			append_dev(thead0, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t37);
    			append_dev(tr0, th1);
    			append_dev(tr0, t39);
    			append_dev(tr0, th2);
    			append_dev(tr0, t41);
    			append_dev(tr0, th3);
    			append_dev(tr0, t43);
    			append_dev(tr0, th4);
    			append_dev(table0, t45);
    			append_dev(table0, tbody0);
    			append_dev(tbody0, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t47);
    			append_dev(tr1, td1);
    			append_dev(tr1, t49);
    			append_dev(tr1, td2);
    			append_dev(tr1, t51);
    			append_dev(tr1, td3);
    			append_dev(tr1, t53);
    			append_dev(tr1, td4);
    			append_dev(div34, t55);
    			append_dev(div34, div25);
    			append_dev(div25, div22);
    			append_dev(div22, h62);
    			append_dev(div25, t57);
    			append_dev(div25, div24);
    			append_dev(div24, div23);
    			append_dev(div23, table1);
    			append_dev(table1, thead1);
    			append_dev(thead1, tr2);
    			append_dev(tr2, th5);
    			append_dev(tr2, t59);
    			append_dev(tr2, th6);
    			append_dev(tr2, t61);
    			append_dev(tr2, th7);
    			append_dev(tr2, t63);
    			append_dev(tr2, th8);
    			append_dev(tr2, t65);
    			append_dev(tr2, th9);
    			append_dev(tr2, t67);
    			append_dev(tr2, th10);
    			append_dev(table1, t69);
    			append_dev(table1, tbody1);
    			append_dev(tbody1, tr3);
    			append_dev(tr3, td5);
    			append_dev(tr3, t71);
    			append_dev(tr3, td6);
    			append_dev(tr3, t73);
    			append_dev(tr3, td7);
    			append_dev(tr3, t75);
    			append_dev(tr3, td8);
    			append_dev(tr3, t77);
    			append_dev(tr3, td9);
    			append_dev(tr3, t79);
    			append_dev(tr3, th11);
    			append_dev(tbody1, t81);
    			append_dev(tbody1, tr4);
    			append_dev(tr4, td10);
    			append_dev(tr4, t83);
    			append_dev(tr4, td11);
    			append_dev(tr4, t85);
    			append_dev(tr4, td12);
    			append_dev(tr4, t87);
    			append_dev(tr4, td13);
    			append_dev(tr4, t89);
    			append_dev(tr4, td14);
    			append_dev(tr4, t91);
    			append_dev(tr4, th12);
    			append_dev(div34, t93);
    			append_dev(div34, div29);
    			append_dev(div29, div26);
    			append_dev(div26, h63);
    			append_dev(div29, t95);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, table2);
    			append_dev(table2, thead2);
    			append_dev(thead2, tr5);
    			append_dev(tr5, th13);
    			append_dev(tr5, t97);
    			append_dev(tr5, th14);
    			append_dev(tr5, t99);
    			append_dev(tr5, th15);
    			append_dev(table2, t101);
    			append_dev(table2, tbody2);
    			append_dev(tbody2, tr6);
    			append_dev(tr6, td15);
    			append_dev(tr6, t103);
    			append_dev(tr6, td16);
    			append_dev(td16, span6);
    			append_dev(tr6, t105);
    			append_dev(tr6, td17);
    			append_dev(tbody2, t107);
    			append_dev(tbody2, tr7);
    			append_dev(tr7, td18);
    			append_dev(tr7, t109);
    			append_dev(tr7, td19);
    			append_dev(td19, span7);
    			append_dev(tr7, t111);
    			append_dev(tr7, td20);
    			append_dev(tbody2, t113);
    			append_dev(tbody2, tr8);
    			append_dev(tr8, td21);
    			append_dev(tr8, t115);
    			append_dev(tr8, td22);
    			append_dev(td22, span8);
    			append_dev(tr8, t117);
    			append_dev(tr8, td23);
    			append_dev(tbody2, t119);
    			append_dev(tbody2, tr9);
    			append_dev(tr9, td24);
    			append_dev(tr9, t121);
    			append_dev(tr9, td25);
    			append_dev(td25, span9);
    			append_dev(tr9, t123);
    			append_dev(tr9, td26);
    			append_dev(div34, t125);
    			append_dev(div34, div33);
    			append_dev(div33, div30);
    			append_dev(div30, h64);
    			append_dev(div33, t127);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, table3);
    			append_dev(table3, thead3);
    			append_dev(thead3, tr10);
    			append_dev(tr10, th16);
    			append_dev(tr10, t129);
    			append_dev(tr10, th17);
    			append_dev(tr10, t131);
    			append_dev(tr10, th18);
    			append_dev(tr10, t133);
    			append_dev(tr10, th19);
    			append_dev(table3, t135);
    			append_dev(table3, tbody3);
    			append_dev(tbody3, tr11);
    			append_dev(tr11, td27);
    			append_dev(tr11, t137);
    			append_dev(tr11, td28);
    			append_dev(tr11, t139);
    			append_dev(tr11, td29);
    			append_dev(td29, span10);
    			append_dev(tr11, t141);
    			append_dev(tr11, td30);
    			append_dev(tbody3, t143);
    			append_dev(tbody3, tr12);
    			append_dev(tr12, td31);
    			append_dev(tr12, t145);
    			append_dev(tr12, td32);
    			append_dev(tr12, t147);
    			append_dev(tr12, td33);
    			append_dev(td33, span11);
    			append_dev(tr12, t149);
    			append_dev(tr12, td34);
    			append_dev(tbody3, t151);
    			append_dev(tbody3, tr13);
    			append_dev(tr13, td35);
    			append_dev(tr13, t153);
    			append_dev(tr13, td36);
    			append_dev(tr13, t155);
    			append_dev(tr13, td37);
    			append_dev(td37, span12);
    			append_dev(tr13, t157);
    			append_dev(tr13, td38);
    			append_dev(tbody3, t159);
    			append_dev(tbody3, tr14);
    			append_dev(tr14, td39);
    			append_dev(tr14, t161);
    			append_dev(tr14, td40);
    			append_dev(tr14, t163);
    			append_dev(tr14, td41);
    			append_dev(td41, span13);
    			append_dev(tr14, t165);
    			append_dev(tr14, td42);
    			insert_dev(target, t167, anchor);
    			mount_component(modaldatospaciente, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asideatencion.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(modaldatospaciente.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asideatencion.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(modaldatospaciente.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asideatencion, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t8);
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t167);
    			destroy_component(modaldatospaciente, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Resumen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Resumen> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		link,
    		Header,
    		AsideAtencion,
    		ModalDatosPaciente
    	});

    	return [];
    }

    class Resumen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Resumen",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src\Pages\AtencionMedica\EditarDatosAtencion.svelte generated by Svelte v3.29.0 */
    const file$d = "src\\Pages\\AtencionMedica\\EditarDatosAtencion.svelte";

    function create_fragment$e(ctx) {
    	let asideatencion;
    	let t0;
    	let div7;
    	let div6;
    	let div0;
    	let h50;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let div3;
    	let div2;
    	let div1;
    	let i0;
    	let t5;
    	let i1;
    	let t7;
    	let div5;
    	let div4;
    	let button0;
    	let i2;
    	let t8;
    	let sapn0;
    	let t10;
    	let button1;
    	let i3;
    	let t11;
    	let sapn1;
    	let t13;
    	let button2;
    	let i4;
    	let t14;
    	let sapn2;
    	let t16;
    	let header;
    	let t17;
    	let main;
    	let div19;
    	let div18;
    	let div8;
    	let h51;
    	let t19;
    	let div17;
    	let form0;
    	let div12;
    	let div9;
    	let label0;
    	let t21;
    	let input0;
    	let t22;
    	let div10;
    	let label1;
    	let t24;
    	let input1;
    	let t25;
    	let div11;
    	let label2;
    	let t27;
    	let input2;
    	let t28;
    	let br;
    	let t29;
    	let div16;
    	let div13;
    	let label3;
    	let t31;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let option9;
    	let t42;
    	let div14;
    	let label4;
    	let t44;
    	let select1;
    	let option10;
    	let option11;
    	let option12;
    	let option13;
    	let option14;
    	let option15;
    	let t51;
    	let div15;
    	let label5;
    	let t53;
    	let select2;
    	let option16;
    	let option17;
    	let t56;
    	let div26;
    	let div25;
    	let div20;
    	let h52;
    	let t58;
    	let div24;
    	let form1;
    	let div23;
    	let div21;
    	let label6;
    	let t60;
    	let input3;
    	let t61;
    	let div22;
    	let label7;
    	let t63;
    	let select3;
    	let option18;
    	let option19;
    	let t66;
    	let modaldatospaciente;
    	let current;
    	asideatencion = new AsideAtencion({ $$inline: true });
    	header = new Header({ $$inline: true });
    	modaldatospaciente = new ModalDatosPaciente({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asideatencion.$$.fragment);
    			t0 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			span0 = element("span");
    			span0.textContent = "Atención Ambulatoria";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "Fiordaliza De Jesus Herrera";
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			i0 = element("i");
    			t5 = space();
    			i1 = element("i");
    			i1.textContent = "listo y guardado";
    			t7 = space();
    			div5 = element("div");
    			div4 = element("div");
    			button0 = element("button");
    			i2 = element("i");
    			t8 = space();
    			sapn0 = element("sapn");
    			sapn0.textContent = "Datos del Paciente";
    			t10 = space();
    			button1 = element("button");
    			i3 = element("i");
    			t11 = space();
    			sapn1 = element("sapn");
    			sapn1.textContent = "Anular";
    			t13 = space();
    			button2 = element("button");
    			i4 = element("i");
    			t14 = space();
    			sapn2 = element("sapn");
    			sapn2.textContent = "Cerrar Atencion";
    			t16 = space();
    			create_component(header.$$.fragment);
    			t17 = space();
    			main = element("main");
    			div19 = element("div");
    			div18 = element("div");
    			div8 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Datos de la Atención";
    			t19 = space();
    			div17 = element("div");
    			form0 = element("form");
    			div12 = element("div");
    			div9 = element("div");
    			label0 = element("label");
    			label0.textContent = "Fecha de Ingreso";
    			t21 = space();
    			input0 = element("input");
    			t22 = space();
    			div10 = element("div");
    			label1 = element("label");
    			label1.textContent = "Hora de Ingreso";
    			t24 = space();
    			input1 = element("input");
    			t25 = space();
    			div11 = element("div");
    			label2 = element("label");
    			label2.textContent = "Edad del Paciente";
    			t27 = space();
    			input2 = element("input");
    			t28 = space();
    			br = element("br");
    			t29 = space();
    			div16 = element("div");
    			div13 = element("div");
    			label3 = element("label");
    			label3.textContent = "Médico de Cabecera";
    			t31 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "- Seleccionar Medico -";
    			option1 = element("option");
    			option1.textContent = "Alfredo Joel Mena";
    			option2 = element("option");
    			option2.textContent = "Vladimir Núñez";
    			option3 = element("option");
    			option3.textContent = "Verenice Gálvez";
    			option4 = element("option");
    			option4.textContent = "stephany maria nuñez moya";
    			option5 = element("option");
    			option5.textContent = "Pedro  Compres";
    			option6 = element("option");
    			option6.textContent = "Milagros Sierra";
    			option7 = element("option");
    			option7.textContent = "Marlena Taveras";
    			option8 = element("option");
    			option8.textContent = "Mariela Camilo";
    			option9 = element("option");
    			option9.textContent = "Emely Bidó García";
    			t42 = space();
    			div14 = element("div");
    			label4 = element("label");
    			label4.textContent = "Aseguradora";
    			t44 = space();
    			select1 = element("select");
    			option10 = element("option");
    			option10.textContent = "- Seleccionar Seguros -";
    			option11 = element("option");
    			option11.textContent = "ARS C.M.D";
    			option12 = element("option");
    			option12.textContent = "ARS UNIVERSAL";
    			option13 = element("option");
    			option13.textContent = "ARS COLONIAL";
    			option14 = element("option");
    			option14.textContent = "ARS MONUMENTAL";
    			option15 = element("option");
    			option15.textContent = "ARS CONSTITUCION";
    			t51 = space();
    			div15 = element("div");
    			label5 = element("label");
    			label5.textContent = "Cama";
    			t53 = space();
    			select2 = element("select");
    			option16 = element("option");
    			option16.textContent = "- Seleccionar Cama -";
    			option17 = element("option");
    			option17.textContent = "Cama 1";
    			t56 = space();
    			div26 = element("div");
    			div25 = element("div");
    			div20 = element("div");
    			h52 = element("h5");
    			h52.textContent = "Contacto financiero";
    			t58 = space();
    			div24 = element("div");
    			form1 = element("form");
    			div23 = element("div");
    			div21 = element("div");
    			label6 = element("label");
    			label6.textContent = "Nombre";
    			t60 = space();
    			input3 = element("input");
    			t61 = space();
    			div22 = element("div");
    			label7 = element("label");
    			label7.textContent = "Tipo de financiamiento";
    			t63 = space();
    			select3 = element("select");
    			option18 = element("option");
    			option18.textContent = "- Seleccionar tipo -";
    			option19 = element("option");
    			option19.textContent = "Efectivo";
    			t66 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			attr_dev(span0, "class", "badge badge-primary");
    			attr_dev(span0, "data-bind", "text: titulo");
    			add_location(span0, file$d, 12, 16, 433);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$d, 13, 16, 537);
    			add_location(h50, file$d, 11, 12, 411);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$d, 10, 8, 375);
    			attr_dev(i0, "class", "mdi mdi-check-all");
    			add_location(i0, file$d, 18, 104, 869);
    			add_location(i1, file$d, 19, 55, 928);
    			attr_dev(div1, "class", "guardando mr-2 text-success");
    			attr_dev(div1, "data-bind", "html: content, class: contentClass");
    			add_location(div1, file$d, 18, 16, 781);
    			attr_dev(div2, "class", "guardar-documento");
    			add_location(div2, file$d, 17, 12, 732);
    			attr_dev(div3, "class", "col-md-6");
    			set_style(div3, "text-align", "right");
    			add_location(div3, file$d, 16, 8, 669);
    			attr_dev(i2, "data-bind", "class: icon");
    			attr_dev(i2, "class", "mdi mdi-comment-eye");
    			add_location(i2, file$d, 26, 24, 1300);
    			attr_dev(sapn0, "data-bind", "text: text");
    			add_location(sapn0, file$d, 27, 24, 1385);
    			attr_dev(button0, "data-toggle", "modal");
    			attr_dev(button0, "data-target", "#modalDatosPersonales");
    			set_style(button0, "box-shadow", "none");
    			attr_dev(button0, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button0, file$d, 24, 20, 1119);
    			attr_dev(i3, "data-bind", "class: icon");
    			attr_dev(i3, "class", "mdi mdi-delete");
    			add_location(i3, file$d, 31, 24, 1662);
    			attr_dev(sapn1, "data-bind", "text: text");
    			add_location(sapn1, file$d, 32, 24, 1742);
    			attr_dev(button1, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button1, "box-shadow", "none");
    			attr_dev(button1, "class", "btn btn-outline-danger btn-sm");
    			add_location(button1, file$d, 29, 20, 1492);
    			attr_dev(i4, "data-bind", "class: icon");
    			attr_dev(i4, "class", "mdi mdi-checkbox-blank");
    			add_location(i4, file$d, 36, 24, 2008);
    			attr_dev(sapn2, "data-bind", "text: text");
    			add_location(sapn2, file$d, 37, 24, 2096);
    			attr_dev(button2, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button2, "box-shadow", "none");
    			attr_dev(button2, "class", "btn btn-outline-success btn-sm");
    			add_location(button2, file$d, 34, 20, 1837);
    			attr_dev(div4, "class", "dropdown");
    			attr_dev(div4, "data-bind", "foreach: actionButtons");
    			add_location(div4, file$d, 23, 12, 1040);
    			attr_dev(div5, "class", "col-lg-12");
    			add_location(div5, file$d, 22, 8, 1003);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$d, 9, 4, 348);
    			attr_dev(div7, "class", "contenedor-datos");
    			attr_dev(div7, "id", "divHeaderBar");
    			add_location(div7, file$d, 8, 0, 294);
    			attr_dev(h51, "class", "m-b-0");
    			add_location(h51, file$d, 49, 20, 2481);
    			attr_dev(div8, "class", "card-header");
    			add_location(div8, file$d, 48, 16, 2434);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$d, 58, 32, 2826);
    			attr_dev(input0, "type", "date");
    			attr_dev(input0, "data-bind", "value: fecha");
    			attr_dev(input0, "class", "form-control autosave");
    			add_location(input0, file$d, 59, 32, 2898);
    			attr_dev(div9, "class", "col-md-3 form-group");
    			add_location(div9, file$d, 57, 28, 2759);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$d, 62, 32, 3105);
    			attr_dev(input1, "type", "time");
    			attr_dev(input1, "data-bind", "value: hora");
    			attr_dev(input1, "class", "form-control autosave");
    			add_location(input1, file$d, 63, 32, 3176);
    			attr_dev(div10, "class", "col-md-3 form-group");
    			add_location(div10, file$d, 61, 28, 3038);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$d, 66, 32, 3382);
    			attr_dev(input2, "data-bind", "value: edadPaciente");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "form-control autosave");
    			add_location(input2, file$d, 67, 32, 3455);
    			attr_dev(div11, "class", "col-md-3 form-group");
    			add_location(div11, file$d, 65, 28, 3315);
    			attr_dev(div12, "class", "form-row");
    			add_location(div12, file$d, 56, 24, 2707);
    			add_location(br, file$d, 69, 30, 3604);
    			attr_dev(label3, "for", "");
    			attr_dev(label3, "class", "font-secondary");
    			add_location(label3, file$d, 72, 32, 3753);
    			option0.__value = "";
    			option0.value = option0.__value;
    			attr_dev(option0, "data-select2-id", "635");
    			add_location(option0, file$d, 74, 36, 4026);
    			option1.__value = "2";
    			option1.value = option1.__value;
    			attr_dev(option1, "data-select2-id", "636");
    			add_location(option1, file$d, 75, 36, 4134);
    			option2.__value = "3";
    			option2.value = option2.__value;
    			attr_dev(option2, "data-select2-id", "637");
    			add_location(option2, file$d, 76, 36, 4238);
    			option3.__value = "5";
    			option3.value = option3.__value;
    			attr_dev(option3, "data-select2-id", "638");
    			add_location(option3, file$d, 77, 36, 4339);
    			option4.__value = "8";
    			option4.value = option4.__value;
    			attr_dev(option4, "data-select2-id", "639");
    			add_location(option4, file$d, 78, 36, 4441);
    			option5.__value = "9";
    			option5.value = option5.__value;
    			attr_dev(option5, "data-select2-id", "640");
    			add_location(option5, file$d, 79, 36, 4553);
    			option6.__value = "10";
    			option6.value = option6.__value;
    			attr_dev(option6, "data-select2-id", "641");
    			add_location(option6, file$d, 80, 36, 4654);
    			option7.__value = "11";
    			option7.value = option7.__value;
    			attr_dev(option7, "data-select2-id", "642");
    			add_location(option7, file$d, 81, 36, 4757);
    			option8.__value = "12";
    			option8.value = option8.__value;
    			attr_dev(option8, "data-select2-id", "643");
    			add_location(option8, file$d, 82, 36, 4860);
    			option9.__value = "13";
    			option9.value = option9.__value;
    			attr_dev(option9, "data-select2-id", "644");
    			add_location(option9, file$d, 83, 36, 4962);
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "id", "sltMedico");
    			set_style(select0, "width", "100%");
    			attr_dev(select0, "tabindex", "-1");
    			attr_dev(select0, "aria-hidden", "true");
    			select0.required = "";
    			attr_dev(select0, "data-select2-id", "sltMedico");
    			add_location(select0, file$d, 73, 32, 3850);
    			attr_dev(div13, "class", "form-group col-md-3");
    			add_location(div13, file$d, 71, 28, 3686);
    			attr_dev(label4, "for", "");
    			attr_dev(label4, "class", "font-secondary");
    			add_location(label4, file$d, 87, 32, 5205);
    			option10.__value = "";
    			option10.value = option10.__value;
    			attr_dev(option10, "data-select2-id", "647");
    			add_location(option10, file$d, 89, 36, 5481);
    			option11.__value = "3";
    			option11.value = option11.__value;
    			attr_dev(option11, "data-select2-id", "648");
    			add_location(option11, file$d, 90, 36, 5590);
    			option12.__value = "4";
    			option12.value = option12.__value;
    			attr_dev(option12, "data-select2-id", "649");
    			add_location(option12, file$d, 91, 36, 5686);
    			option13.__value = "5";
    			option13.value = option13.__value;
    			attr_dev(option13, "data-select2-id", "650");
    			add_location(option13, file$d, 92, 36, 5786);
    			option14.__value = "6";
    			option14.value = option14.__value;
    			attr_dev(option14, "data-select2-id", "651");
    			add_location(option14, file$d, 93, 36, 5885);
    			option15.__value = "7";
    			option15.value = option15.__value;
    			attr_dev(option15, "data-select2-id", "652");
    			add_location(option15, file$d, 94, 36, 5986);
    			attr_dev(select1, "class", "form-control");
    			attr_dev(select1, "id", "sltAseguradora");
    			set_style(select1, "width", "100%");
    			attr_dev(select1, "tabindex", "-1");
    			attr_dev(select1, "aria-hidden", "true");
    			select1.required = "";
    			attr_dev(select1, "data-select2-id", "sltAseguradora");
    			add_location(select1, file$d, 88, 32, 5295);
    			attr_dev(div14, "class", "form-group col-md-3");
    			add_location(div14, file$d, 86, 28, 5138);
    			attr_dev(label5, "for", "");
    			attr_dev(label5, "class", "font-secondary");
    			add_location(label5, file$d, 98, 32, 6227);
    			option16.__value = "";
    			option16.value = option16.__value;
    			attr_dev(option16, "data-select2-id", "647");
    			add_location(option16, file$d, 100, 36, 6496);
    			option17.__value = "3";
    			option17.value = option17.__value;
    			attr_dev(option17, "data-select2-id", "648");
    			add_location(option17, file$d, 101, 36, 6602);
    			attr_dev(select2, "class", "form-control");
    			attr_dev(select2, "id", "sltAseguradora");
    			set_style(select2, "width", "100%");
    			attr_dev(select2, "tabindex", "-1");
    			attr_dev(select2, "aria-hidden", "true");
    			select2.required = "";
    			attr_dev(select2, "data-select2-id", "sltAseguradora");
    			add_location(select2, file$d, 99, 32, 6310);
    			attr_dev(div15, "class", "form-group col-md-3");
    			add_location(div15, file$d, 97, 28, 6160);
    			attr_dev(div16, "class", "form-row");
    			add_location(div16, file$d, 70, 24, 3634);
    			attr_dev(form0, "action", "");
    			add_location(form0, file$d, 55, 20, 2665);
    			attr_dev(div17, "class", "card-body");
    			add_location(div17, file$d, 54, 16, 2620);
    			attr_dev(div18, "class", "card m-b-30");
    			attr_dev(div18, "data-bind", "using: atencionMedica");
    			add_location(div18, file$d, 47, 12, 2357);
    			attr_dev(div19, "class", "col-lg-12");
    			set_style(div19, "margin-top", "120px");
    			add_location(div19, file$d, 46, 8, 2293);
    			attr_dev(h52, "class", "m-b-0");
    			add_location(h52, file$d, 113, 20, 7056);
    			attr_dev(div20, "class", "card-header");
    			add_location(div20, file$d, 112, 16, 7009);
    			attr_dev(label6, "for", "");
    			attr_dev(label6, "class", "font-secondary");
    			add_location(label6, file$d, 122, 32, 7400);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "form-control");
    			add_location(input3, file$d, 123, 32, 7485);
    			attr_dev(div21, "class", "form-group col-md-3");
    			add_location(div21, file$d, 121, 28, 7333);
    			attr_dev(label7, "for", "");
    			attr_dev(label7, "class", "font-secondary");
    			add_location(label7, file$d, 126, 32, 7658);
    			option18.__value = "";
    			option18.value = option18.__value;
    			attr_dev(option18, "data-select2-id", "647");
    			add_location(option18, file$d, 128, 36, 7945);
    			option19.__value = "3";
    			option19.value = option19.__value;
    			attr_dev(option19, "data-select2-id", "648");
    			add_location(option19, file$d, 129, 36, 8051);
    			attr_dev(select3, "class", "form-control");
    			attr_dev(select3, "id", "sltAseguradora");
    			set_style(select3, "width", "100%");
    			attr_dev(select3, "tabindex", "-1");
    			attr_dev(select3, "aria-hidden", "true");
    			select3.required = "";
    			attr_dev(select3, "data-select2-id", "sltAseguradora");
    			add_location(select3, file$d, 127, 32, 7759);
    			attr_dev(div22, "class", "form-group col-md-3");
    			add_location(div22, file$d, 125, 28, 7591);
    			attr_dev(div23, "class", "form-row");
    			add_location(div23, file$d, 120, 24, 7281);
    			attr_dev(form1, "action", "");
    			add_location(form1, file$d, 119, 20, 7239);
    			attr_dev(div24, "class", "card-body");
    			add_location(div24, file$d, 118, 16, 7194);
    			attr_dev(div25, "class", "card m-b-30");
    			attr_dev(div25, "data-bind", "using: atencionMedica");
    			add_location(div25, file$d, 111, 12, 6932);
    			attr_dev(div26, "class", "col-lg-12");
    			set_style(div26, "margin-top", "20px");
    			add_location(div26, file$d, 110, 8, 6869);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$d, 45, 4, 2258);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asideatencion, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, h50);
    			append_dev(h50, span0);
    			append_dev(h50, t2);
    			append_dev(h50, span1);
    			append_dev(div6, t4);
    			append_dev(div6, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, i0);
    			append_dev(div1, t5);
    			append_dev(div1, i1);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, button0);
    			append_dev(button0, i2);
    			append_dev(button0, t8);
    			append_dev(button0, sapn0);
    			append_dev(div4, t10);
    			append_dev(div4, button1);
    			append_dev(button1, i3);
    			append_dev(button1, t11);
    			append_dev(button1, sapn1);
    			append_dev(div4, t13);
    			append_dev(div4, button2);
    			append_dev(button2, i4);
    			append_dev(button2, t14);
    			append_dev(button2, sapn2);
    			insert_dev(target, t16, anchor);
    			mount_component(header, target, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div19);
    			append_dev(div19, div18);
    			append_dev(div18, div8);
    			append_dev(div8, h51);
    			append_dev(div18, t19);
    			append_dev(div18, div17);
    			append_dev(div17, form0);
    			append_dev(form0, div12);
    			append_dev(div12, div9);
    			append_dev(div9, label0);
    			append_dev(div9, t21);
    			append_dev(div9, input0);
    			append_dev(div12, t22);
    			append_dev(div12, div10);
    			append_dev(div10, label1);
    			append_dev(div10, t24);
    			append_dev(div10, input1);
    			append_dev(div12, t25);
    			append_dev(div12, div11);
    			append_dev(div11, label2);
    			append_dev(div11, t27);
    			append_dev(div11, input2);
    			append_dev(div12, t28);
    			append_dev(form0, br);
    			append_dev(form0, t29);
    			append_dev(form0, div16);
    			append_dev(div16, div13);
    			append_dev(div13, label3);
    			append_dev(div13, t31);
    			append_dev(div13, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(select0, option3);
    			append_dev(select0, option4);
    			append_dev(select0, option5);
    			append_dev(select0, option6);
    			append_dev(select0, option7);
    			append_dev(select0, option8);
    			append_dev(select0, option9);
    			append_dev(div16, t42);
    			append_dev(div16, div14);
    			append_dev(div14, label4);
    			append_dev(div14, t44);
    			append_dev(div14, select1);
    			append_dev(select1, option10);
    			append_dev(select1, option11);
    			append_dev(select1, option12);
    			append_dev(select1, option13);
    			append_dev(select1, option14);
    			append_dev(select1, option15);
    			append_dev(div16, t51);
    			append_dev(div16, div15);
    			append_dev(div15, label5);
    			append_dev(div15, t53);
    			append_dev(div15, select2);
    			append_dev(select2, option16);
    			append_dev(select2, option17);
    			append_dev(main, t56);
    			append_dev(main, div26);
    			append_dev(div26, div25);
    			append_dev(div25, div20);
    			append_dev(div20, h52);
    			append_dev(div25, t58);
    			append_dev(div25, div24);
    			append_dev(div24, form1);
    			append_dev(form1, div23);
    			append_dev(div23, div21);
    			append_dev(div21, label6);
    			append_dev(div21, t60);
    			append_dev(div21, input3);
    			append_dev(div23, t61);
    			append_dev(div23, div22);
    			append_dev(div22, label7);
    			append_dev(div22, t63);
    			append_dev(div22, select3);
    			append_dev(select3, option18);
    			append_dev(select3, option19);
    			insert_dev(target, t66, anchor);
    			mount_component(modaldatospaciente, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asideatencion.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(modaldatospaciente.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asideatencion.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(modaldatospaciente.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asideatencion, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t16);
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t66);
    			destroy_component(modaldatospaciente, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("EditarDatosAtencion", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditarDatosAtencion> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		link,
    		Header,
    		AsideAtencion,
    		ModalDatosPaciente
    	});

    	return [];
    }

    class EditarDatosAtencion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditarDatosAtencion",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src\componentes\ModalTratamientos.svelte generated by Svelte v3.29.0 */

    const file$e = "src\\componentes\\ModalTratamientos.svelte";

    function create_fragment$f(ctx) {
    	let div30;
    	let div29;
    	let div28;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span0;
    	let t3;
    	let form;
    	let div26;
    	let div3;
    	let div2;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let ul;
    	let div1;
    	let li0;
    	let a0;
    	let t7;
    	let li1;
    	let a1;
    	let i;
    	let t8;
    	let t9;
    	let div9;
    	let div8;
    	let div5;
    	let div4;
    	let input2;
    	let t10;
    	let div7;
    	let div6;
    	let select0;
    	let option0;
    	let t12;
    	let div15;
    	let div14;
    	let div11;
    	let div10;
    	let select1;
    	let option1;
    	let t14;
    	let div13;
    	let div12;
    	let label0;
    	let input3;
    	let t15;
    	let span1;
    	let t16;
    	let span2;
    	let t18;
    	let div21;
    	let div20;
    	let div17;
    	let div16;
    	let input4;
    	let t19;
    	let div19;
    	let div18;
    	let label1;
    	let input5;
    	let t20;
    	let span3;
    	let t21;
    	let span4;
    	let t23;
    	let label2;
    	let input6;
    	let t24;
    	let span5;
    	let t25;
    	let span6;
    	let t27;
    	let div23;
    	let div22;
    	let select2;
    	let option2;
    	let t29;
    	let div25;
    	let div24;
    	let textarea;
    	let t30;
    	let div27;
    	let button1;
    	let t32;
    	let button2;

    	const block = {
    		c: function create() {
    			div30 = element("div");
    			div29 = element("div");
    			div28 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Agregue el tratamiento";
    			t1 = space();
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			form = element("form");
    			div26 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			ul = element("ul");
    			div1 = element("div");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Acetaminofen";
    			t7 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i = element("i");
    			t8 = text(" Agregar nuevo medicamento");
    			t9 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			input2 = element("input");
    			t10 = space();
    			div7 = element("div");
    			div6 = element("div");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "- Unidad de dosis -";
    			t12 = space();
    			div15 = element("div");
    			div14 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			select1 = element("select");
    			option1 = element("option");
    			option1.textContent = "Via";
    			t14 = space();
    			div13 = element("div");
    			div12 = element("div");
    			label0 = element("label");
    			input3 = element("input");
    			t15 = space();
    			span1 = element("span");
    			t16 = space();
    			span2 = element("span");
    			span2.textContent = "Monodosis";
    			t18 = space();
    			div21 = element("div");
    			div20 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			input4 = element("input");
    			t19 = space();
    			div19 = element("div");
    			div18 = element("div");
    			label1 = element("label");
    			input5 = element("input");
    			t20 = space();
    			span3 = element("span");
    			t21 = space();
    			span4 = element("span");
    			span4.textContent = "Horas";
    			t23 = space();
    			label2 = element("label");
    			input6 = element("input");
    			t24 = space();
    			span5 = element("span");
    			t25 = space();
    			span6 = element("span");
    			span6.textContent = "Minutos";
    			t27 = space();
    			div23 = element("div");
    			div22 = element("div");
    			select2 = element("select");
    			option2 = element("option");
    			option2.textContent = "Diagnostico para el tratamiento";
    			t29 = space();
    			div25 = element("div");
    			div24 = element("div");
    			textarea = element("textarea");
    			t30 = space();
    			div27 = element("div");
    			button1 = element("button");
    			button1.textContent = "Cerrar";
    			t32 = space();
    			button2 = element("button");
    			button2.textContent = "Agregar";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "exampleModalLongTitle");
    			add_location(h5, file$e, 4, 16, 236);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$e, 6, 20, 430);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$e, 5, 16, 332);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$e, 3, 12, 192);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Medicamento");
    			attr_dev(input0, "data-toggle", "dropdown");
    			add_location(input0, file$e, 13, 28, 787);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control readonly");
    			input1.readOnly = true;
    			attr_dev(input1, "data-bind", "click: limpiarMedicamentoSeleccionado, \r\n                            class: (idMedicamentoSeleccionado() == '')? 'd-none': '',\r\n                            value: nombreMedicamentoSeleccionado");
    			add_location(input1, file$e, 16, 28, 941);
    			attr_dev(a0, "href", "#!");
    			attr_dev(a0, "data-bind", "text: descripcion, click: $parent.seleccionarMedicamento ");
    			add_location(a0, file$e, 23, 40, 1650);
    			add_location(li0, file$e, 22, 36, 1604);
    			attr_dev(div1, "class", "contenidoLista");
    			attr_dev(div1, "data-bind", "foreach: medicamentos");
    			add_location(div1, file$e, 21, 32, 1504);
    			attr_dev(i, "class", "mdi mdi-plus");
    			add_location(i, file$e, 28, 49, 1982);
    			attr_dev(a1, "href", "#!");
    			add_location(a1, file$e, 28, 36, 1969);
    			attr_dev(li1, "class", "defecto");
    			add_location(li1, file$e, 27, 32, 1911);
    			attr_dev(ul, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul, "x-placement", "bottom-start");
    			set_style(ul, "position", "absolute");
    			set_style(ul, "will-change", "transform");
    			set_style(ul, "border-radius", "5px");
    			set_style(ul, "top", "0px");
    			set_style(ul, "left", "0px");
    			set_style(ul, "transform", "translate3d(0px, 36px, 0px)");
    			add_location(ul, file$e, 19, 28, 1236);
    			attr_dev(div2, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div2, file$e, 12, 24, 701);
    			attr_dev(div3, "class", "col-12");
    			add_location(div3, file$e, 11, 20, 655);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "data-bind", "value: dosis");
    			input2.required = true;
    			attr_dev(input2, "placeholder", "Cantidad dosis");
    			attr_dev(input2, "name", "");
    			add_location(input2, file$e, 39, 36, 2427);
    			attr_dev(div4, "class", "form-group buscardor dropdown");
    			add_location(div4, file$e, 38, 32, 2346);
    			attr_dev(div5, "class", "col-6");
    			add_location(div5, file$e, 37, 28, 2293);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$e, 51, 40, 3173);
    			select0.required = true;
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "data-bind", "options: unidades, \r\n                                    optionsCaption: '- Unidad de dosis -',\r\n                                    optionsValue: 'id',\r\n                                    optionsText: 'nombre',\r\n                                    value: unidadSeleccionada");
    			add_location(select0, file$e, 46, 36, 2805);
    			attr_dev(div6, "class", "form-group ");
    			add_location(div6, file$e, 45, 32, 2742);
    			attr_dev(div7, "class", "col-6");
    			add_location(div7, file$e, 44, 28, 2689);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$e, 36, 24, 2246);
    			attr_dev(div9, "class", "col-12");
    			add_location(div9, file$e, 35, 20, 2200);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$e, 64, 40, 3828);
    			attr_dev(select1, "class", "form-control");
    			select1.required = true;
    			attr_dev(select1, "data-bind", "options: vias, value: viaSeleccionada, optionsCaption: 'Vía'");
    			add_location(select1, file$e, 62, 36, 3634);
    			attr_dev(div10, "class", "form-group ");
    			add_location(div10, file$e, 61, 32, 3571);
    			attr_dev(div11, "class", "col-6");
    			add_location(div11, file$e, 60, 28, 3518);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "name", "option");
    			attr_dev(input3, "data-bind", "checked: monodosis");
    			input3.value = "1";
    			attr_dev(input3, "class", "cstm-switch-input");
    			add_location(input3, file$e, 71, 40, 4196);
    			attr_dev(span1, "class", "cstm-switch-indicator bg-success ");
    			add_location(span1, file$e, 73, 40, 4387);
    			attr_dev(span2, "class", "cstm-switch-description");
    			add_location(span2, file$e, 74, 40, 4484);
    			attr_dev(label0, "class", "cstm-switch mt-2");
    			add_location(label0, file$e, 70, 36, 4122);
    			attr_dev(div12, "class", " m-b-10");
    			add_location(div12, file$e, 69, 32, 4063);
    			attr_dev(div13, "class", "col-6");
    			add_location(div13, file$e, 68, 28, 4010);
    			attr_dev(div14, "class", "row");
    			add_location(div14, file$e, 59, 24, 3471);
    			attr_dev(div15, "class", "col-12");
    			add_location(div15, file$e, 58, 20, 3425);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "form-control");
    			input4.required = true;
    			attr_dev(input4, "placeholder", "Intervalo (Tiempo)");
    			attr_dev(input4, "max", "100000");
    			attr_dev(input4, "name", "");
    			add_location(input4, file$e, 85, 36, 4971);
    			attr_dev(div16, "class", "form-group buscardor dropdown");
    			add_location(div16, file$e, 84, 32, 4890);
    			attr_dev(div17, "class", "col-6");
    			add_location(div17, file$e, 83, 28, 4837);
    			attr_dev(input5, "type", "radio");
    			attr_dev(input5, "name", "Tiempo");
    			input5.value = "H";
    			attr_dev(input5, "class", "cstm-switch-input");
    			input5.checked = "checked";
    			add_location(input5, file$e, 92, 40, 5409);
    			attr_dev(span3, "class", "cstm-switch-indicator ");
    			add_location(span3, file$e, 94, 40, 5584);
    			attr_dev(span4, "class", "cstm-switch-description");
    			add_location(span4, file$e, 95, 40, 5670);
    			attr_dev(label1, "class", "cstm-switch mt-2");
    			add_location(label1, file$e, 91, 36, 5335);
    			attr_dev(input6, "type", "radio");
    			input6.value = "M";
    			attr_dev(input6, "class", "cstm-switch-input");
    			add_location(input6, file$e, 98, 40, 5879);
    			attr_dev(span5, "class", "cstm-switch-indicator ");
    			add_location(span5, file$e, 100, 40, 6022);
    			attr_dev(span6, "class", "cstm-switch-description");
    			add_location(span6, file$e, 101, 40, 6108);
    			attr_dev(label2, "class", "cstm-switch mt-2");
    			add_location(label2, file$e, 97, 36, 5805);
    			attr_dev(div18, "class", "m-b-10");
    			add_location(div18, file$e, 90, 32, 5277);
    			attr_dev(div19, "class", "col-6");
    			add_location(div19, file$e, 89, 28, 5224);
    			attr_dev(div20, "class", "row");
    			add_location(div20, file$e, 82, 24, 4790);
    			attr_dev(div21, "class", "col-12");
    			add_location(div21, file$e, 81, 20, 4744);
    			option2.selected = true;
    			option2.disabled = true;
    			option2.__value = "Diagnostico para el tratamiento";
    			option2.value = option2.__value;
    			add_location(option2, file$e, 114, 32, 6783);
    			select2.required = true;
    			attr_dev(select2, "class", "form-control");
    			attr_dev(select2, "data-bind", "options: parent.diagnosticos, \r\n                                optionsCaption: 'Diagnostico para el tratamiento',\r\n                                optionsText: 'problemaMedico',\r\n                                value: diagnostico");
    			add_location(select2, file$e, 110, 28, 6468);
    			attr_dev(div22, "class", "form-group ");
    			add_location(div22, file$e, 109, 24, 6413);
    			attr_dev(div23, "class", "col-12");
    			add_location(div23, file$e, 108, 20, 6367);
    			attr_dev(textarea, "class", "form-control mt-2");
    			attr_dev(textarea, "data-bind", "value: comentario");
    			attr_dev(textarea, "placeholder", "Comentarios");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "Comentario");
    			add_location(textarea, file$e, 121, 28, 7072);
    			attr_dev(div24, "class", "form-group");
    			add_location(div24, file$e, 120, 24, 7018);
    			attr_dev(div25, "class", "col-12");
    			add_location(div25, file$e, 119, 20, 6972);
    			attr_dev(div26, "class", "modal-body");
    			add_location(div26, file$e, 10, 16, 609);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$e, 129, 20, 7457);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "btn btn-primary");
    			add_location(button2, file$e, 132, 20, 7611);
    			attr_dev(div27, "class", "modal-footer");
    			add_location(div27, file$e, 128, 16, 7409);
    			attr_dev(form, "data-bind", "submit: agregar");
    			attr_dev(form, "id", "formularioTratamiento");
    			add_location(form, file$e, 9, 12, 530);
    			attr_dev(div28, "class", "modal-content");
    			add_location(div28, file$e, 2, 8, 151);
    			attr_dev(div29, "class", "modal-dialog");
    			attr_dev(div29, "role", "document");
    			add_location(div29, file$e, 1, 4, 99);
    			attr_dev(div30, "class", "modal fade");
    			attr_dev(div30, "id", "modalTratamiento");
    			attr_dev(div30, "tabindex", "-1");
    			attr_dev(div30, "role", "dialog");
    			attr_dev(div30, "aria-hidden", "true");
    			add_location(div30, file$e, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div30, anchor);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div28, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span0);
    			append_dev(div28, t3);
    			append_dev(div28, form);
    			append_dev(form, div26);
    			append_dev(div26, div3);
    			append_dev(div3, div2);
    			append_dev(div2, input0);
    			append_dev(div2, t4);
    			append_dev(div2, input1);
    			append_dev(div2, t5);
    			append_dev(div2, ul);
    			append_dev(ul, div1);
    			append_dev(div1, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t7);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i);
    			append_dev(a1, t8);
    			append_dev(div26, t9);
    			append_dev(div26, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div5);
    			append_dev(div5, div4);
    			append_dev(div4, input2);
    			append_dev(div8, t10);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, select0);
    			append_dev(select0, option0);
    			append_dev(div26, t12);
    			append_dev(div26, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div11);
    			append_dev(div11, div10);
    			append_dev(div10, select1);
    			append_dev(select1, option1);
    			append_dev(div14, t14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, label0);
    			append_dev(label0, input3);
    			append_dev(label0, t15);
    			append_dev(label0, span1);
    			append_dev(label0, t16);
    			append_dev(label0, span2);
    			append_dev(div26, t18);
    			append_dev(div26, div21);
    			append_dev(div21, div20);
    			append_dev(div20, div17);
    			append_dev(div17, div16);
    			append_dev(div16, input4);
    			append_dev(div20, t19);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div18, label1);
    			append_dev(label1, input5);
    			append_dev(label1, t20);
    			append_dev(label1, span3);
    			append_dev(label1, t21);
    			append_dev(label1, span4);
    			append_dev(div18, t23);
    			append_dev(div18, label2);
    			append_dev(label2, input6);
    			append_dev(label2, t24);
    			append_dev(label2, span5);
    			append_dev(label2, t25);
    			append_dev(label2, span6);
    			append_dev(div26, t27);
    			append_dev(div26, div23);
    			append_dev(div23, div22);
    			append_dev(div22, select2);
    			append_dev(select2, option2);
    			append_dev(div26, t29);
    			append_dev(div26, div25);
    			append_dev(div25, div24);
    			append_dev(div24, textarea);
    			append_dev(form, t30);
    			append_dev(form, div27);
    			append_dev(div27, button1);
    			append_dev(div27, t32);
    			append_dev(div27, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div30);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalTratamientos", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalTratamientos> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalTratamientos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalTratamientos",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src\componentes\ModalInterconsulta.svelte generated by Svelte v3.29.0 */

    const file$f = "src\\componentes\\ModalInterconsulta.svelte";

    function create_fragment$g(ctx) {
    	let div15;
    	let div14;
    	let div13;
    	let div0;
    	let h5;
    	let t1;
    	let button;
    	let span;
    	let t3;
    	let div6;
    	let form;
    	let div5;
    	let div1;
    	let label0;
    	let t5;
    	let textarea0;
    	let t6;
    	let div2;
    	let label1;
    	let t8;
    	let textarea1;
    	let t9;
    	let div3;
    	let select0;
    	let option0;
    	let t11;
    	let div4;
    	let select1;
    	let option1;
    	let t13;
    	let div12;
    	let div11;
    	let div8;
    	let a0;
    	let h30;
    	let t14;
    	let div7;
    	let t16;
    	let div10;
    	let a1;
    	let h31;
    	let t17;
    	let div9;

    	const block = {
    		c: function create() {
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Nueva interconsulta";
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t3 = space();
    			div6 = element("div");
    			form = element("form");
    			div5 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Resumen";
    			t5 = space();
    			textarea0 = element("textarea");
    			t6 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Manejo / Recomendaciones";
    			t8 = space();
    			textarea1 = element("textarea");
    			t9 = space();
    			div3 = element("div");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "- Departamento -";
    			t11 = space();
    			div4 = element("div");
    			select1 = element("select");
    			option1 = element("option");
    			option1.textContent = "- Especialista sugerido -";
    			t13 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div8 = element("div");
    			a0 = element("a");
    			h30 = element("h3");
    			t14 = space();
    			div7 = element("div");
    			div7.textContent = "Cerrar";
    			t16 = space();
    			div10 = element("div");
    			a1 = element("a");
    			h31 = element("h3");
    			t17 = space();
    			div9 = element("div");
    			div9.textContent = "Solicitar";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "modalInterconsulta");
    			add_location(h5, file$f, 5, 20, 361);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$f, 7, 24, 557);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$f, 6, 20, 455);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$f, 4, 16, 313);
    			attr_dev(label0, "for", "");
    			attr_dev(label0, "class", "text-primary");
    			add_location(label0, file$f, 14, 32, 905);
    			attr_dev(textarea0, "class", "form-control");
    			attr_dev(textarea0, "data-bind", "value: resumen");
    			set_style(textarea0, "width", "100%");
    			set_style(textarea0, "display", "block");
    			set_style(textarea0, "height", "150px");
    			attr_dev(textarea0, "name", "Comentario");
    			add_location(textarea0, file$f, 15, 32, 989);
    			attr_dev(div1, "class", "form-group col-md-12");
    			add_location(div1, file$f, 13, 28, 837);
    			attr_dev(label1, "for", "");
    			attr_dev(label1, "class", "text-primary");
    			add_location(label1, file$f, 19, 32, 1299);
    			attr_dev(textarea1, "class", "form-control");
    			attr_dev(textarea1, "data-bind", "value: recomendaciones");
    			set_style(textarea1, "width", "100%");
    			set_style(textarea1, "display", "block");
    			set_style(textarea1, "height", "150px");
    			attr_dev(textarea1, "name", "Comentario");
    			add_location(textarea1, file$f, 20, 32, 1400);
    			attr_dev(div2, "class", "form-group col-md-12");
    			add_location(div2, file$f, 18, 28, 1231);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$f, 26, 36, 1839);
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "id", "sltDepartamentos");
    			set_style(select0, "width", "100%");
    			select0.required = true;
    			add_location(select0, file$f, 25, 32, 1720);
    			attr_dev(div3, "class", "form-group col-lg-12");
    			add_location(div3, file$f, 24, 28, 1652);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$f, 31, 36, 2189);
    			attr_dev(select1, "class", "form-control");
    			attr_dev(select1, "id", "sltEspecialistasDepartamento");
    			set_style(select1, "width", "100%");
    			select1.required = true;
    			add_location(select1, file$f, 30, 32, 2058);
    			attr_dev(div4, "class", "form-group col-lg-12");
    			add_location(div4, file$f, 29, 28, 1990);
    			attr_dev(div5, "class", "form-row");
    			add_location(div5, file$f, 12, 24, 785);
    			attr_dev(form, "class", "floating-label col-md-12 show-label");
    			add_location(form, file$f, 11, 20, 709);
    			attr_dev(div6, "class", "modal-body");
    			add_location(div6, file$f, 10, 16, 663);
    			attr_dev(h30, "class", "mdi mdi-close-outline");
    			add_location(h30, file$f, 43, 32, 2670);
    			attr_dev(div7, "class", "text-overline");
    			add_location(div7, file$f, 44, 32, 2743);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "text-danger");
    			attr_dev(a0, "data-dismiss", "modal");
    			add_location(a0, file$f, 42, 28, 2583);
    			attr_dev(div8, "class", "col");
    			add_location(div8, file$f, 41, 24, 2536);
    			attr_dev(h31, "class", "mdi mdi-send");
    			add_location(h31, file$f, 49, 32, 3014);
    			attr_dev(div9, "class", "text-overline");
    			add_location(div9, file$f, 50, 32, 3078);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "data-bind", "click: crear");
    			attr_dev(a1, "class", "text-success");
    			add_location(a1, file$f, 48, 28, 2921);
    			attr_dev(div10, "class", "col");
    			add_location(div10, file$f, 47, 24, 2874);
    			attr_dev(div11, "class", "row text-center p-b-10");
    			add_location(div11, file$f, 40, 20, 2474);
    			attr_dev(div12, "class", "modal-footer");
    			add_location(div12, file$f, 39, 16, 2426);
    			attr_dev(div13, "class", "modal-content");
    			add_location(div13, file$f, 3, 12, 268);
    			attr_dev(div14, "class", "modal-dialog");
    			attr_dev(div14, "role", "document");
    			add_location(div14, file$f, 2, 8, 212);
    			attr_dev(div15, "class", "modal fade modal-slide-right");
    			attr_dev(div15, "id", "modalInterconsulta");
    			attr_dev(div15, "tabindex", "-1");
    			attr_dev(div15, "role", "dialog");
    			attr_dev(div15, "aria-labelledby", "modalInterconsulta");
    			set_style(div15, "display", "none");
    			set_style(div15, "padding-right", "16px");
    			attr_dev(div15, "aria-modal", "true");
    			add_location(div15, file$f, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, span);
    			append_dev(div13, t3);
    			append_dev(div13, div6);
    			append_dev(div6, form);
    			append_dev(form, div5);
    			append_dev(div5, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t5);
    			append_dev(div1, textarea0);
    			append_dev(div5, t6);
    			append_dev(div5, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t8);
    			append_dev(div2, textarea1);
    			append_dev(div5, t9);
    			append_dev(div5, div3);
    			append_dev(div3, select0);
    			append_dev(select0, option0);
    			append_dev(div5, t11);
    			append_dev(div5, div4);
    			append_dev(div4, select1);
    			append_dev(select1, option1);
    			append_dev(div13, t13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div8);
    			append_dev(div8, a0);
    			append_dev(a0, h30);
    			append_dev(a0, t14);
    			append_dev(a0, div7);
    			append_dev(div11, t16);
    			append_dev(div11, div10);
    			append_dev(div10, a1);
    			append_dev(a1, h31);
    			append_dev(a1, t17);
    			append_dev(a1, div9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalInterconsulta", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalInterconsulta> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalInterconsulta extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalInterconsulta",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src\componentes\ModalAntecedentes.svelte generated by Svelte v3.29.0 */

    const file$g = "src\\componentes\\ModalAntecedentes.svelte";

    function create_fragment$h(ctx) {
    	let div43;
    	let div42;
    	let div41;
    	let div3;
    	let h5;
    	let t1;
    	let button0;
    	let span0;
    	let t3;
    	let div2;
    	let div1;
    	let div0;
    	let i0;
    	let t4;
    	let i1;
    	let t6;
    	let div40;
    	let div39;
    	let div38;
    	let div12;
    	let div5;
    	let div4;
    	let t8;
    	let div11;
    	let div6;
    	let button1;
    	let i2;
    	let t9;
    	let span1;
    	let t11;
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let t12;
    	let div21;
    	let div14;
    	let div13;
    	let t14;
    	let div20;
    	let div15;
    	let button2;
    	let i3;
    	let t15;
    	let span2;
    	let t17;
    	let div19;
    	let div18;
    	let div17;
    	let div16;
    	let t18;
    	let div37;
    	let div23;
    	let div22;
    	let t20;
    	let div36;
    	let div24;
    	let button3;
    	let i4;
    	let t21;
    	let span3;
    	let t23;
    	let div35;
    	let div34;
    	let div33;
    	let div32;
    	let div31;
    	let div26;
    	let div25;
    	let i5;
    	let t24;
    	let span4;
    	let t26;
    	let div29;
    	let div28;
    	let a;
    	let i6;
    	let t27;
    	let div27;
    	let button4;
    	let i7;
    	let t28;
    	let t29;
    	let div30;
    	let textarea;

    	const block = {
    		c: function create() {
    			div43 = element("div");
    			div42 = element("div");
    			div41 = element("div");
    			div3 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Antecedentes";
    			t1 = space();
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t4 = space();
    			i1 = element("i");
    			i1.textContent = "listo y guardado";
    			t6 = space();
    			div40 = element("div");
    			div39 = element("div");
    			div38 = element("div");
    			div12 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "Antecedentes Patologicos";
    			t8 = space();
    			div11 = element("div");
    			div6 = element("div");
    			button1 = element("button");
    			i2 = element("i");
    			t9 = space();
    			span1 = element("span");
    			span1.textContent = "Enfermedades Tiroideas";
    			t11 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			t12 = space();
    			div21 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div13.textContent = "Antecedentes no Patologicos";
    			t14 = space();
    			div20 = element("div");
    			div15 = element("div");
    			button2 = element("button");
    			i3 = element("i");
    			t15 = space();
    			span2 = element("span");
    			span2.textContent = "Actividad Fisica";
    			t17 = space();
    			div19 = element("div");
    			div18 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			t18 = space();
    			div37 = element("div");
    			div23 = element("div");
    			div22 = element("div");
    			div22.textContent = "Antecedentes Psiquiátricos";
    			t20 = space();
    			div36 = element("div");
    			div24 = element("div");
    			button3 = element("button");
    			i4 = element("i");
    			t21 = space();
    			span3 = element("span");
    			span3.textContent = "Historia Familiar";
    			t23 = space();
    			div35 = element("div");
    			div34 = element("div");
    			div33 = element("div");
    			div32 = element("div");
    			div31 = element("div");
    			div26 = element("div");
    			div25 = element("div");
    			i5 = element("i");
    			t24 = space();
    			span4 = element("span");
    			span4.textContent = "Historia Familiar";
    			t26 = space();
    			div29 = element("div");
    			div28 = element("div");
    			a = element("a");
    			i6 = element("i");
    			t27 = space();
    			div27 = element("div");
    			button4 = element("button");
    			i7 = element("i");
    			t28 = text("\r\n                                                                    Eliminar");
    			t29 = space();
    			div30 = element("div");
    			textarea = element("textarea");
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "modalAntecedentes");
    			add_location(h5, file$g, 5, 16, 319);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$g, 7, 20, 499);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$g, 6, 16, 401);
    			attr_dev(i0, "class", "mdi mdi-check-all");
    			add_location(i0, file$g, 11, 112, 777);
    			add_location(i1, file$g, 12, 63, 844);
    			attr_dev(div0, "class", "guardando mr-2 text-success");
    			attr_dev(div0, "data-bind", "html: content, class: contentClass");
    			add_location(div0, file$g, 11, 24, 689);
    			attr_dev(div1, "class", "guardar-documento");
    			add_location(div1, file$g, 10, 20, 632);
    			set_style(div2, "margin-right", "40px");
    			add_location(div2, file$g, 9, 16, 577);
    			attr_dev(div3, "class", "modal-header");
    			add_location(div3, file$g, 4, 12, 275);
    			attr_dev(div4, "class", "card-title");
    			attr_dev(div4, "data-bind", "text: nombre");
    			add_location(div4, file$g, 22, 32, 1299);
    			attr_dev(div5, "class", "card-header");
    			add_location(div5, file$g, 21, 28, 1240);
    			attr_dev(i2, "class", "mdi mdi-plus");
    			add_location(i2, file$g, 27, 101, 1794);
    			attr_dev(span1, "data-bind", "text: nombre");
    			add_location(span1, file$g, 29, 40, 1909);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-outline-primary btn-sm mb-1 mr-2");
    			set_style(button1, "box-shadow", "none");
    			attr_dev(button1, "data-bind", "click: $parent.agregar");
    			add_location(button1, file$g, 26, 36, 1621);
    			attr_dev(div6, "class", "botones-antecedentes");
    			attr_dev(div6, "data-bind", "foreach: tiposAntecedentesFiltrados");
    			add_location(div6, file$g, 25, 32, 1501);
    			attr_dev(div7, "class", "col-lg-12");
    			attr_dev(div7, "data-bind", "foreach: antecedentesFiltrados");
    			add_location(div7, file$g, 36, 44, 2272);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$g, 35, 40, 2209);
    			attr_dev(div9, "class", "col-12");
    			add_location(div9, file$g, 34, 36, 2147);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$g, 33, 32, 2092);
    			attr_dev(div11, "class", "card-body");
    			add_location(div11, file$g, 24, 28, 1444);
    			attr_dev(div12, "class", "card  m-b-30");
    			set_style(div12, "box-shadow", "none");
    			set_style(div12, "border", "#32325d solid 1px");
    			add_location(div12, file$g, 20, 24, 1131);
    			attr_dev(div13, "class", "card-title");
    			attr_dev(div13, "data-bind", "text: nombre");
    			add_location(div13, file$g, 45, 32, 2740);
    			attr_dev(div14, "class", "card-header");
    			add_location(div14, file$g, 44, 28, 2681);
    			attr_dev(i3, "class", "mdi mdi-plus");
    			add_location(i3, file$g, 50, 101, 3238);
    			attr_dev(span2, "data-bind", "text: nombre");
    			add_location(span2, file$g, 52, 40, 3353);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-outline-primary btn-sm mb-1 mr-2");
    			set_style(button2, "box-shadow", "none");
    			attr_dev(button2, "data-bind", "click: $parent.agregar");
    			add_location(button2, file$g, 49, 36, 3065);
    			attr_dev(div15, "class", "botones-antecedentes");
    			attr_dev(div15, "data-bind", "foreach: tiposAntecedentesFiltrados");
    			add_location(div15, file$g, 48, 32, 2945);
    			attr_dev(div16, "class", "col-lg-12");
    			attr_dev(div16, "data-bind", "foreach: antecedentesFiltrados");
    			add_location(div16, file$g, 59, 44, 3710);
    			attr_dev(div17, "class", "row");
    			add_location(div17, file$g, 58, 40, 3647);
    			attr_dev(div18, "class", "col-12");
    			add_location(div18, file$g, 57, 36, 3585);
    			attr_dev(div19, "class", "row");
    			add_location(div19, file$g, 56, 32, 3530);
    			attr_dev(div20, "class", "card-body");
    			add_location(div20, file$g, 47, 28, 2888);
    			attr_dev(div21, "class", "card  m-b-30");
    			set_style(div21, "box-shadow", "none");
    			set_style(div21, "border", "#32325d solid 1px");
    			add_location(div21, file$g, 43, 24, 2572);
    			attr_dev(div22, "class", "card-title");
    			attr_dev(div22, "data-bind", "text: nombre");
    			add_location(div22, file$g, 69, 32, 4180);
    			attr_dev(div23, "class", "card-header");
    			add_location(div23, file$g, 68, 28, 4121);
    			attr_dev(i4, "class", "mdi mdi-plus");
    			add_location(i4, file$g, 74, 101, 4677);
    			attr_dev(span3, "data-bind", "text: nombre");
    			add_location(span3, file$g, 76, 40, 4792);
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "class", "btn btn-outline-primary btn-sm mb-1 mr-2");
    			set_style(button3, "box-shadow", "none");
    			attr_dev(button3, "data-bind", "click: $parent.agregar");
    			add_location(button3, file$g, 73, 36, 4504);
    			attr_dev(div24, "class", "botones-antecedentes");
    			attr_dev(div24, "data-bind", "foreach: tiposAntecedentesFiltrados");
    			add_location(div24, file$g, 72, 32, 4384);
    			attr_dev(i5, "class", "mdi mdi-history mdi-18px");
    			add_location(i5, file$g, 86, 80, 5507);
    			attr_dev(span4, "data-bind", "text: nombre");
    			add_location(span4, file$g, 86, 121, 5548);
    			attr_dev(div25, "class", "card-title");
    			add_location(div25, file$g, 86, 56, 5483);
    			attr_dev(div26, "class", "card-header");
    			add_location(div26, file$g, 85, 52, 5400);
    			attr_dev(i6, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i6, file$g, 92, 64, 6094);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "data-toggle", "dropdown");
    			attr_dev(a, "aria-haspopup", "true");
    			attr_dev(a, "aria-expanded", "false");
    			add_location(a, file$g, 91, 60, 5950);
    			attr_dev(i7, "class", "mdi mdi-trash-can-outline");
    			add_location(i7, file$g, 95, 148, 6462);
    			attr_dev(button4, "class", "dropdown-item text-danger");
    			attr_dev(button4, "data-bind", "click: eliminar");
    			attr_dev(button4, "type", "button");
    			add_location(button4, file$g, 95, 64, 6378);
    			attr_dev(div27, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div27, file$g, 94, 60, 6265);
    			attr_dev(div28, "class", "dropdown");
    			add_location(div28, file$g, 90, 56, 5866);
    			attr_dev(div29, "class", "card-controls");
    			add_location(div29, file$g, 89, 52, 5781);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "data-bind", "value: descripcion");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			set_style(textarea, "height", "100px");
    			attr_dev(textarea, "id", "exampleFormControlTextarea1");
    			attr_dev(textarea, "rows", "5");
    			attr_dev(textarea, "name", "Comentario");
    			add_location(textarea, file$g, 101, 56, 6917);
    			attr_dev(div30, "class", "card-body");
    			add_location(div30, file$g, 100, 52, 6836);
    			attr_dev(div31, "class", "card m-b-20 mt-3");
    			set_style(div31, "box-shadow", "none");
    			set_style(div31, "border", "1px grey solid");
    			add_location(div31, file$g, 84, 48, 5266);
    			attr_dev(div32, "class", "col-lg-12");
    			attr_dev(div32, "data-bind", "foreach: antecedentesFiltrados");
    			add_location(div32, file$g, 83, 44, 5150);
    			attr_dev(div33, "class", "row");
    			add_location(div33, file$g, 82, 40, 5087);
    			attr_dev(div34, "class", "col-12");
    			add_location(div34, file$g, 81, 36, 5025);
    			attr_dev(div35, "class", "row");
    			add_location(div35, file$g, 80, 32, 4970);
    			attr_dev(div36, "class", "card-body");
    			add_location(div36, file$g, 71, 28, 4327);
    			attr_dev(div37, "class", "card  m-b-30");
    			set_style(div37, "box-shadow", "none");
    			set_style(div37, "border", "#32325d solid 1px");
    			add_location(div37, file$g, 67, 24, 4012);
    			attr_dev(div38, "class", "col-lg-12");
    			attr_dev(div38, "data-bind", "foreach: gruposAntecedentes");
    			add_location(div38, file$g, 18, 20, 1040);
    			attr_dev(div39, "class", "row");
    			add_location(div39, file$g, 17, 16, 1001);
    			attr_dev(div40, "class", "modal-body");
    			add_location(div40, file$g, 16, 12, 959);
    			attr_dev(div41, "class", "modal-content");
    			add_location(div41, file$g, 3, 8, 234);
    			attr_dev(div42, "class", "modal-dialog");
    			attr_dev(div42, "role", "document");
    			add_location(div42, file$g, 2, 4, 182);
    			attr_dev(div43, "class", "modal fade modal-slide-right");
    			attr_dev(div43, "id", "modalAntecedentes");
    			attr_dev(div43, "tabindex", "-1");
    			attr_dev(div43, "role", "dialog");
    			attr_dev(div43, "aria-labelledby", "modalAntecedentes");
    			set_style(div43, "display", "none");
    			attr_dev(div43, "aria-hidden", "true");
    			add_location(div43, file$g, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div43, anchor);
    			append_dev(div43, div42);
    			append_dev(div42, div41);
    			append_dev(div41, div3);
    			append_dev(div3, h5);
    			append_dev(div3, t1);
    			append_dev(div3, button0);
    			append_dev(button0, span0);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, i0);
    			append_dev(div0, t4);
    			append_dev(div0, i1);
    			append_dev(div41, t6);
    			append_dev(div41, div40);
    			append_dev(div40, div39);
    			append_dev(div39, div38);
    			append_dev(div38, div12);
    			append_dev(div12, div5);
    			append_dev(div5, div4);
    			append_dev(div12, t8);
    			append_dev(div12, div11);
    			append_dev(div11, div6);
    			append_dev(div6, button1);
    			append_dev(button1, i2);
    			append_dev(button1, t9);
    			append_dev(button1, span1);
    			append_dev(div11, t11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div38, t12);
    			append_dev(div38, div21);
    			append_dev(div21, div14);
    			append_dev(div14, div13);
    			append_dev(div21, t14);
    			append_dev(div21, div20);
    			append_dev(div20, div15);
    			append_dev(div15, button2);
    			append_dev(button2, i3);
    			append_dev(button2, t15);
    			append_dev(button2, span2);
    			append_dev(div20, t17);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div38, t18);
    			append_dev(div38, div37);
    			append_dev(div37, div23);
    			append_dev(div23, div22);
    			append_dev(div37, t20);
    			append_dev(div37, div36);
    			append_dev(div36, div24);
    			append_dev(div24, button3);
    			append_dev(button3, i4);
    			append_dev(button3, t21);
    			append_dev(button3, span3);
    			append_dev(div36, t23);
    			append_dev(div36, div35);
    			append_dev(div35, div34);
    			append_dev(div34, div33);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, div26);
    			append_dev(div26, div25);
    			append_dev(div25, i5);
    			append_dev(div25, t24);
    			append_dev(div25, span4);
    			append_dev(div31, t26);
    			append_dev(div31, div29);
    			append_dev(div29, div28);
    			append_dev(div28, a);
    			append_dev(a, i6);
    			append_dev(div28, t27);
    			append_dev(div28, div27);
    			append_dev(div27, button4);
    			append_dev(button4, i7);
    			append_dev(button4, t28);
    			append_dev(div31, t29);
    			append_dev(div31, div30);
    			append_dev(div30, textarea);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div43);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalAntecedentes", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalAntecedentes> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalAntecedentes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalAntecedentes",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src\componentes\OrdenesMedicas.svelte generated by Svelte v3.29.0 */

    const file$h = "src\\componentes\\OrdenesMedicas.svelte";

    function create_fragment$i(ctx) {
    	let div41;
    	let h4;
    	let t1;
    	let div12;
    	let div1;
    	let div0;
    	let t3;
    	let div4;
    	let div3;
    	let a0;
    	let i0;
    	let t4;
    	let t5;
    	let a1;
    	let i1;
    	let t6;
    	let div2;
    	let button0;
    	let i2;
    	let t7;
    	let t8;
    	let button1;
    	let i3;
    	let t9;
    	let t10;
    	let div11;
    	let div10;
    	let div9;
    	let ul0;
    	let li0;
    	let span0;
    	let t12;
    	let span1;
    	let t14;
    	let span2;
    	let t16;
    	let span3;
    	let t18;
    	let div6;
    	let div5;
    	let input0;
    	let t19;
    	let div7;
    	let a2;
    	let i4;
    	let t20;
    	let a3;
    	let i5;
    	let t21;
    	let li1;
    	let span4;
    	let t23;
    	let span5;
    	let t25;
    	let span6;
    	let t27;
    	let span7;
    	let t29;
    	let div8;
    	let a4;
    	let i6;
    	let t30;
    	let a5;
    	let i7;
    	let t31;
    	let div29;
    	let div14;
    	let div13;
    	let t33;
    	let div17;
    	let div16;
    	let a6;
    	let i8;
    	let t34;
    	let div15;
    	let button2;
    	let i9;
    	let t35;
    	let t36;
    	let button3;
    	let i10;
    	let t37;
    	let t38;
    	let div28;
    	let div27;
    	let div24;
    	let form0;
    	let div20;
    	let div19;
    	let input1;
    	let t39;
    	let input2;
    	let t40;
    	let ul1;
    	let div18;
    	let t41;
    	let li2;
    	let a7;
    	let i11;
    	let t42;
    	let t43;
    	let div22;
    	let div21;
    	let select;
    	let option0;
    	let option1;
    	let t46;
    	let div23;
    	let button4;
    	let i12;
    	let t47;
    	let div26;
    	let div25;
    	let p0;
    	let t49;
    	let ul2;
    	let t50;
    	let div40;
    	let div31;
    	let div30;
    	let t52;
    	let div39;
    	let div38;
    	let div35;
    	let form1;
    	let div33;
    	let div32;
    	let input3;
    	let t53;
    	let input4;
    	let t54;
    	let div34;
    	let button5;
    	let i13;
    	let t55;
    	let div37;
    	let div36;
    	let p1;
    	let t57;
    	let ul3;

    	const block = {
    		c: function create() {
    			div41 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Ordenes Medicas";
    			t1 = space();
    			div12 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Tratamientos";
    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");
    			a0 = element("a");
    			i0 = element("i");
    			t4 = text(" Agregar\r\n                    tratamientos");
    			t5 = space();
    			a1 = element("a");
    			i1 = element("i");
    			t6 = space();
    			div2 = element("div");
    			button0 = element("button");
    			i2 = element("i");
    			t7 = text("\r\n                        Imprimir estudios");
    			t8 = space();
    			button1 = element("button");
    			i3 = element("i");
    			t9 = text("\r\n                        Agregar nuevo estudio");
    			t10 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			span0 = element("span");
    			span0.textContent = "10MG de: OLANZAPINA DE 20MG";
    			t12 = text(" |\r\n                                ");
    			span1 = element("span");
    			span1.textContent = "Una sola vez";
    			t14 = text(" |\r\n                                ");
    			span2 = element("span");
    			span2.textContent = "Vía: Oral";
    			t16 = text(" |\r\n                                ");
    			span3 = element("span");
    			span3.textContent = "Por diagnostico de: TRASTORNO AFECTIVO BIPOLAR, EPISODIO MIXTO PRESENTE";
    			t18 = space();
    			div6 = element("div");
    			div5 = element("div");
    			input0 = element("input");
    			t19 = space();
    			div7 = element("div");
    			a2 = element("a");
    			i4 = element("i");
    			t20 = space();
    			a3 = element("a");
    			i5 = element("i");
    			t21 = space();
    			li1 = element("li");
    			span4 = element("span");
    			span4.textContent = "400MG de: LITIO 300MG, 50 TAB.";
    			t23 = text(" |\r\n                                ");
    			span5 = element("span");
    			span5.textContent = "Cada 12 Horas/s";
    			t25 = text(" |\r\n                                ");
    			span6 = element("span");
    			span6.textContent = "Vía: Oral";
    			t27 = text(" |\r\n                                ");
    			span7 = element("span");
    			span7.textContent = "Por diagnostico de: TRASTORNO AFECTIVO BIPOLAR, EPISODIO MIXTO PRESENTE";
    			t29 = space();
    			div8 = element("div");
    			a4 = element("a");
    			i6 = element("i");
    			t30 = space();
    			a5 = element("a");
    			i7 = element("i");
    			t31 = space();
    			div29 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div13.textContent = "Estudios";
    			t33 = space();
    			div17 = element("div");
    			div16 = element("div");
    			a6 = element("a");
    			i8 = element("i");
    			t34 = space();
    			div15 = element("div");
    			button2 = element("button");
    			i9 = element("i");
    			t35 = text("\r\n                        Imprimir estudios");
    			t36 = space();
    			button3 = element("button");
    			i10 = element("i");
    			t37 = text("\r\n                        Agregar nuevo estudio");
    			t38 = space();
    			div28 = element("div");
    			div27 = element("div");
    			div24 = element("div");
    			form0 = element("form");
    			div20 = element("div");
    			div19 = element("div");
    			input1 = element("input");
    			t39 = space();
    			input2 = element("input");
    			t40 = space();
    			ul1 = element("ul");
    			div18 = element("div");
    			t41 = space();
    			li2 = element("li");
    			a7 = element("a");
    			i11 = element("i");
    			t42 = text(" Agregar manualmente");
    			t43 = space();
    			div22 = element("div");
    			div21 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "- Diagnostico para el tratamiento -";
    			option1 = element("option");
    			option1.textContent = "TRASTORNO AFECTIVO BIPOLAR, EPISODIO MIXTO PRESENTE";
    			t46 = space();
    			div23 = element("div");
    			button4 = element("button");
    			i12 = element("i");
    			t47 = space();
    			div26 = element("div");
    			div25 = element("div");
    			p0 = element("p");
    			p0.textContent = "No tienes agregado ningún estudio";
    			t49 = space();
    			ul2 = element("ul");
    			t50 = space();
    			div40 = element("div");
    			div31 = element("div");
    			div30 = element("div");
    			div30.textContent = "Intrucciones";
    			t52 = space();
    			div39 = element("div");
    			div38 = element("div");
    			div35 = element("div");
    			form1 = element("form");
    			div33 = element("div");
    			div32 = element("div");
    			input3 = element("input");
    			t53 = space();
    			input4 = element("input");
    			t54 = space();
    			div34 = element("div");
    			button5 = element("button");
    			i13 = element("i");
    			t55 = space();
    			div37 = element("div");
    			div36 = element("div");
    			p1 = element("p");
    			p1.textContent = "No tienes agregado ningún estudio";
    			t57 = space();
    			ul3 = element("ul");
    			attr_dev(h4, "class", "alert-heading");
    			add_location(h4, file$h, 1, 4, 54);
    			attr_dev(div0, "class", "card-title");
    			add_location(div0, file$h, 4, 12, 185);
    			attr_dev(div1, "class", "card-header");
    			add_location(div1, file$h, 3, 8, 146);
    			attr_dev(i0, "class", "mdi mdi-plus-box");
    			add_location(i0, file$h, 8, 112, 430);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "btn  btn-success btn-sm");
    			attr_dev(a0, "data-toggle", "modal");
    			attr_dev(a0, "data-target", "#modalTratamiento");
    			add_location(a0, file$h, 8, 16, 334);
    			attr_dev(i1, "class", "mdi mdi-printer");
    			add_location(i1, file$h, 11, 123, 658);
    			attr_dev(a1, "type", "button");
    			attr_dev(a1, "data-original-title", "Imprimir tratamientos");
    			attr_dev(a1, "href", "/Reporte/NotaMedica/110?idAtencion=115");
    			add_location(a1, file$h, 11, 16, 551);
    			attr_dev(i2, "class", "mdi mdi-printer");
    			add_location(i2, file$h, 14, 77, 862);
    			attr_dev(button0, "class", "dropdown-item text-primary");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$h, 14, 20, 805);
    			attr_dev(i3, "class", "mdi mdi-plus");
    			add_location(i3, file$h, 16, 77, 1024);
    			attr_dev(button1, "class", "dropdown-item text-success");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$h, 16, 20, 967);
    			attr_dev(div2, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div2, file$h, 13, 16, 736);
    			attr_dev(div3, "class", "dropdown");
    			add_location(div3, file$h, 7, 12, 294);
    			attr_dev(div4, "class", "card-controls");
    			add_location(div4, file$h, 6, 8, 253);
    			attr_dev(span0, "data-bind", "text: disificacion");
    			add_location(span0, file$h, 26, 32, 1420);
    			attr_dev(span1, "data-bind", "text: periodicidad");
    			add_location(span1, file$h, 27, 32, 1527);
    			attr_dev(span2, "data-bind", "text: 'Vía: ' + via()");
    			add_location(span2, file$h, 28, 32, 1619);
    			attr_dev(span3, "class", "badge");
    			set_style(span3, "line-height", "1.7");
    			attr_dev(span3, "data-bind", "text: diagnostico");
    			add_location(span3, file$h, 29, 32, 1711);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			add_location(input0, file$h, 33, 40, 2037);
    			attr_dev(div5, "class", "form-group col-md-12");
    			add_location(div5, file$h, 32, 36, 1961);
    			attr_dev(div6, "class", "row mt-3");
    			add_location(div6, file$h, 31, 32, 1901);
    			attr_dev(i4, "class", "mdi-18px mdi mdi-comment-plus-outline");
    			add_location(i4, file$h, 40, 68, 2529);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "text-primary");
    			attr_dev(a2, "data-bind", "click: modoEditarOn");
    			attr_dev(a2, "title", "Agregar comentarios");
    			add_location(a2, file$h, 39, 36, 2394);
    			attr_dev(i5, "class", "mdi-18px mdi mdi-trash-can-outline");
    			add_location(i5, file$h, 43, 111, 2856);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "text-danger");
    			attr_dev(a3, "data-toggle", "tooltip");
    			attr_dev(a3, "data-placement", "top");
    			attr_dev(a3, "data-original-title", "Eliminar tratamiento");
    			attr_dev(a3, "data-bind", "click: eliminar");
    			add_location(a3, file$h, 42, 36, 2669);
    			set_style(div7, "position", "absolute");
    			set_style(div7, "top", "0");
    			set_style(div7, "right", "0");
    			set_style(div7, "padding", "10px");
    			set_style(div7, "background-color", "white");
    			set_style(div7, "border-bottom-left-radius", "5px");
    			add_location(div7, file$h, 37, 32, 2197);
    			add_location(li0, file$h, 25, 24, 1382);
    			attr_dev(span4, "data-bind", "text: disificacion");
    			add_location(span4, file$h, 49, 32, 3092);
    			attr_dev(span5, "data-bind", "text: periodicidad");
    			add_location(span5, file$h, 50, 32, 3202);
    			attr_dev(span6, "data-bind", "text: 'Vía: ' + via()");
    			add_location(span6, file$h, 51, 32, 3297);
    			attr_dev(span7, "class", "badge");
    			set_style(span7, "line-height", "1.7");
    			attr_dev(span7, "data-bind", "text: diagnostico");
    			add_location(span7, file$h, 52, 32, 3389);
    			attr_dev(i6, "class", "mdi-18px mdi mdi-comment-plus-outline");
    			add_location(i6, file$h, 55, 40, 3873);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "class", "text-primary");
    			attr_dev(a4, "data-bind", "click: modoEditarOn");
    			attr_dev(a4, "title", "Agregar comentarios");
    			add_location(a4, file$h, 54, 36, 3737);
    			attr_dev(i7, "class", "mdi-18px mdi mdi-trash-can-outline");
    			add_location(i7, file$h, 58, 40, 4194);
    			attr_dev(a5, "href", "/");
    			attr_dev(a5, "class", "text-danger");
    			attr_dev(a5, "data-toggle", "tooltip");
    			attr_dev(a5, "data-placement", "top");
    			attr_dev(a5, "data-original-title", "Eliminar tratamiento");
    			attr_dev(a5, "data-bind", "click: eliminar");
    			add_location(a5, file$h, 57, 36, 4006);
    			set_style(div8, "position", "absolute");
    			set_style(div8, "top", "0");
    			set_style(div8, "right", "0");
    			set_style(div8, "padding", "10px");
    			set_style(div8, "background-color", "white");
    			set_style(div8, "border-bottom-left-radius", "5px");
    			add_location(div8, file$h, 53, 32, 3577);
    			add_location(li1, file$h, 48, 24, 3054);
    			attr_dev(ul0, "class", "list-info");
    			attr_dev(ul0, "data-bind", "foreach: tratamientos");
    			add_location(ul0, file$h, 24, 20, 1300);
    			attr_dev(div9, "class", "col-md-12 mb-2");
    			add_location(div9, file$h, 23, 16, 1250);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$h, 22, 12, 1215);
    			attr_dev(div11, "class", "card-body");
    			add_location(div11, file$h, 21, 8, 1178);
    			attr_dev(div12, "class", "card m-b-20 mt-3");
    			add_location(div12, file$h, 2, 4, 106);
    			attr_dev(div13, "class", "card-title");
    			add_location(div13, file$h, 70, 12, 4538);
    			attr_dev(div14, "class", "card-header");
    			add_location(div14, file$h, 69, 8, 4499);
    			attr_dev(i8, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i8, file$h, 74, 95, 4775);
    			attr_dev(a6, "href", "/");
    			attr_dev(a6, "data-toggle", "dropdown");
    			attr_dev(a6, "aria-haspopup", "true");
    			attr_dev(a6, "aria-expanded", "false");
    			add_location(a6, file$h, 74, 16, 4696);
    			attr_dev(i9, "class", "mdi mdi-printer");
    			add_location(i9, file$h, 76, 77, 4967);
    			attr_dev(button2, "class", "dropdown-item text-primary");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file$h, 76, 20, 4910);
    			attr_dev(i10, "class", "mdi mdi-plus");
    			add_location(i10, file$h, 78, 77, 5129);
    			attr_dev(button3, "class", "dropdown-item text-success");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file$h, 78, 20, 5072);
    			attr_dev(div15, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div15, file$h, 75, 16, 4841);
    			attr_dev(div16, "class", "dropdown dropdown-vnc");
    			add_location(div16, file$h, 73, 12, 4643);
    			attr_dev(div17, "class", "card-controls");
    			add_location(div17, file$h, 72, 8, 4602);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "name", "");
    			attr_dev(input1, "data-toggle", "dropdown");
    			attr_dev(input1, "aria-haspopup", "true");
    			attr_dev(input1, "aria-expanded", "false");
    			input1.required = "true";
    			add_location(input1, file$h, 90, 32, 5623);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "form-control readonly d-none");
    			attr_dev(input2, "name", "");
    			input2.readOnly = "";
    			attr_dev(input2, "aria-haspopup", "true");
    			attr_dev(input2, "aria-expanded", "true");
    			attr_dev(input2, "data-bind", "click: limpiar, value: nombreEstudioSeleccionado, class: (nombreEstudioSeleccionado() =='')? 'd-none' : ''");
    			add_location(input2, file$h, 91, 32, 5787);
    			attr_dev(div18, "class", "contenidoLista");
    			attr_dev(div18, "data-bind", "foreach: listado");
    			add_location(div18, file$h, 93, 36, 6311);
    			attr_dev(i11, "class", "mdi mdi-plus");
    			add_location(i11, file$h, 95, 90, 6524);
    			attr_dev(a7, "href", "/");
    			attr_dev(a7, "data-bind", "click: agregarManualmente");
    			add_location(a7, file$h, 95, 40, 6474);
    			attr_dev(li2, "class", "defecto");
    			add_location(li2, file$h, 94, 36, 6412);
    			attr_dev(ul1, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul1, "id", "buscador");
    			attr_dev(ul1, "x-placement", "bottom-start");
    			set_style(ul1, "position", "absolute");
    			set_style(ul1, "will-change", "transform");
    			set_style(ul1, "border-radius", "5px");
    			set_style(ul1, "top", "0px");
    			set_style(ul1, "left", "0px");
    			set_style(ul1, "transform", "translate3d(0px, 36px, 0px)");
    			add_location(ul1, file$h, 92, 32, 6058);
    			attr_dev(div19, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div19, file$h, 89, 28, 5533);
    			attr_dev(div20, "class", "col-lg-6 col-md-12");
    			add_location(div20, file$h, 88, 24, 5471);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$h, 105, 56, 7166);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$h, 105, 117, 7227);
    			attr_dev(select, "class", "form-control");
    			select.required = "";
    			attr_dev(select, "data-bind", "options: diagnosticos, \r\n                                    optionsCaption: '- Diagnostico para el tratamiento -',\r\n                                    optionsText: 'problemaMedico',\r\n                                    value: diagnostico");
    			add_location(select, file$h, 102, 32, 6873);
    			attr_dev(div21, "class", "form-group ");
    			add_location(div21, file$h, 101, 28, 6814);
    			attr_dev(div22, "class", "col-lg-5 col-md-12");
    			add_location(div22, file$h, 100, 24, 6752);
    			attr_dev(i12, "class", "mdi mdi-plus");
    			add_location(i12, file$h, 110, 181, 7656);
    			attr_dev(button4, "type", "submit");
    			attr_dev(button4, "class", "btn btn-success btn-block mb-3");
    			attr_dev(button4, "data-toggle", "tooltip");
    			attr_dev(button4, "data-placement", "right");
    			attr_dev(button4, "title", "");
    			attr_dev(button4, "data-original-title", "Agregar estudio");
    			add_location(button4, file$h, 110, 28, 7503);
    			attr_dev(div23, "class", "col-lg-1 col-md-12");
    			add_location(div23, file$h, 109, 24, 7441);
    			attr_dev(form0, "class", "row");
    			attr_dev(form0, "data-bind", "submit: agregar");
    			add_location(form0, file$h, 87, 20, 5399);
    			attr_dev(div24, "class", "col-12");
    			add_location(div24, file$h, 86, 16, 5357);
    			attr_dev(p0, "class", "alert-body text-center mt-3");
    			add_location(p0, file$h, 117, 24, 7920);
    			attr_dev(div25, "class", "alert border alert-light");
    			attr_dev(div25, "role", "alert");
    			add_location(div25, file$h, 116, 20, 7843);
    			attr_dev(ul2, "class", "list-info");
    			attr_dev(ul2, "data-bind", "foreach: estudios");
    			add_location(ul2, file$h, 120, 20, 8072);
    			attr_dev(div26, "class", "col-md-12");
    			add_location(div26, file$h, 115, 16, 7798);
    			attr_dev(div27, "class", "row");
    			add_location(div27, file$h, 85, 12, 5322);
    			attr_dev(div28, "class", "card-body");
    			add_location(div28, file$h, 84, 8, 5285);
    			attr_dev(div29, "class", "card m-b-20");
    			add_location(div29, file$h, 68, 4, 4464);
    			attr_dev(div30, "class", "card-title");
    			add_location(div30, file$h, 128, 12, 8283);
    			attr_dev(div31, "class", "card-header");
    			add_location(div31, file$h, 127, 8, 8244);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "name", "");
    			attr_dev(input3, "data-toggle", "dropdown");
    			attr_dev(input3, "aria-haspopup", "true");
    			attr_dev(input3, "aria-expanded", "false");
    			input3.required = "true";
    			add_location(input3, file$h, 136, 32, 8690);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "class", "form-control readonly d-none");
    			attr_dev(input4, "name", "");
    			input4.readOnly = "";
    			attr_dev(input4, "aria-haspopup", "true");
    			attr_dev(input4, "aria-expanded", "true");
    			attr_dev(input4, "data-bind", "click: limpiar, value: nombreEstudioSeleccionado, class: (nombreEstudioSeleccionado() =='')? 'd-none' : ''");
    			add_location(input4, file$h, 137, 32, 8854);
    			attr_dev(div32, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div32, file$h, 135, 28, 8600);
    			attr_dev(div33, "class", "col-lg-11 col-md-12");
    			add_location(div33, file$h, 134, 24, 8537);
    			attr_dev(i13, "class", "mdi mdi-plus");
    			add_location(i13, file$h, 141, 181, 9400);
    			attr_dev(button5, "type", "submit");
    			attr_dev(button5, "class", "btn btn-success btn-block mb-3");
    			attr_dev(button5, "data-toggle", "tooltip");
    			attr_dev(button5, "data-placement", "right");
    			attr_dev(button5, "title", "");
    			attr_dev(button5, "data-original-title", "Agregar estudio");
    			add_location(button5, file$h, 141, 28, 9247);
    			attr_dev(div34, "class", "col-lg-1 col-md-12");
    			add_location(div34, file$h, 140, 24, 9185);
    			attr_dev(form1, "class", "row");
    			attr_dev(form1, "data-bind", "submit: agregar");
    			add_location(form1, file$h, 133, 20, 8465);
    			attr_dev(div35, "class", "col-12");
    			add_location(div35, file$h, 132, 16, 8423);
    			attr_dev(p1, "class", "alert-body text-center mt-3");
    			add_location(p1, file$h, 148, 24, 9664);
    			attr_dev(div36, "class", "alert border alert-light");
    			attr_dev(div36, "role", "alert");
    			add_location(div36, file$h, 147, 20, 9587);
    			attr_dev(ul3, "class", "list-info");
    			attr_dev(ul3, "data-bind", "foreach: estudios");
    			add_location(ul3, file$h, 151, 20, 9816);
    			attr_dev(div37, "class", "col-md-12");
    			add_location(div37, file$h, 146, 16, 9542);
    			attr_dev(div38, "class", "row");
    			add_location(div38, file$h, 131, 12, 8388);
    			attr_dev(div39, "class", "card-body");
    			add_location(div39, file$h, 130, 8, 8351);
    			attr_dev(div40, "class", "card m-b-20");
    			add_location(div40, file$h, 126, 4, 8209);
    			attr_dev(div41, "class", "alert alert-secondary");
    			attr_dev(div41, "role", "alert");
    			add_location(div41, file$h, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div41, anchor);
    			append_dev(div41, h4);
    			append_dev(div41, t1);
    			append_dev(div41, div12);
    			append_dev(div12, div1);
    			append_dev(div1, div0);
    			append_dev(div12, t3);
    			append_dev(div12, div4);
    			append_dev(div4, div3);
    			append_dev(div3, a0);
    			append_dev(a0, i0);
    			append_dev(a0, t4);
    			append_dev(div3, t5);
    			append_dev(div3, a1);
    			append_dev(a1, i1);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(button0, i2);
    			append_dev(button0, t7);
    			append_dev(div2, t8);
    			append_dev(div2, button1);
    			append_dev(button1, i3);
    			append_dev(button1, t9);
    			append_dev(div12, t10);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, span0);
    			append_dev(li0, t12);
    			append_dev(li0, span1);
    			append_dev(li0, t14);
    			append_dev(li0, span2);
    			append_dev(li0, t16);
    			append_dev(li0, span3);
    			append_dev(li0, t18);
    			append_dev(li0, div6);
    			append_dev(div6, div5);
    			append_dev(div5, input0);
    			append_dev(li0, t19);
    			append_dev(li0, div7);
    			append_dev(div7, a2);
    			append_dev(a2, i4);
    			append_dev(div7, t20);
    			append_dev(div7, a3);
    			append_dev(a3, i5);
    			append_dev(ul0, t21);
    			append_dev(ul0, li1);
    			append_dev(li1, span4);
    			append_dev(li1, t23);
    			append_dev(li1, span5);
    			append_dev(li1, t25);
    			append_dev(li1, span6);
    			append_dev(li1, t27);
    			append_dev(li1, span7);
    			append_dev(li1, t29);
    			append_dev(li1, div8);
    			append_dev(div8, a4);
    			append_dev(a4, i6);
    			append_dev(div8, t30);
    			append_dev(div8, a5);
    			append_dev(a5, i7);
    			append_dev(div41, t31);
    			append_dev(div41, div29);
    			append_dev(div29, div14);
    			append_dev(div14, div13);
    			append_dev(div29, t33);
    			append_dev(div29, div17);
    			append_dev(div17, div16);
    			append_dev(div16, a6);
    			append_dev(a6, i8);
    			append_dev(div16, t34);
    			append_dev(div16, div15);
    			append_dev(div15, button2);
    			append_dev(button2, i9);
    			append_dev(button2, t35);
    			append_dev(div15, t36);
    			append_dev(div15, button3);
    			append_dev(button3, i10);
    			append_dev(button3, t37);
    			append_dev(div29, t38);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, div24);
    			append_dev(div24, form0);
    			append_dev(form0, div20);
    			append_dev(div20, div19);
    			append_dev(div19, input1);
    			append_dev(div19, t39);
    			append_dev(div19, input2);
    			append_dev(div19, t40);
    			append_dev(div19, ul1);
    			append_dev(ul1, div18);
    			append_dev(ul1, t41);
    			append_dev(ul1, li2);
    			append_dev(li2, a7);
    			append_dev(a7, i11);
    			append_dev(a7, t42);
    			append_dev(form0, t43);
    			append_dev(form0, div22);
    			append_dev(div22, div21);
    			append_dev(div21, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(form0, t46);
    			append_dev(form0, div23);
    			append_dev(div23, button4);
    			append_dev(button4, i12);
    			append_dev(div27, t47);
    			append_dev(div27, div26);
    			append_dev(div26, div25);
    			append_dev(div25, p0);
    			append_dev(div26, t49);
    			append_dev(div26, ul2);
    			append_dev(div41, t50);
    			append_dev(div41, div40);
    			append_dev(div40, div31);
    			append_dev(div31, div30);
    			append_dev(div40, t52);
    			append_dev(div40, div39);
    			append_dev(div39, div38);
    			append_dev(div38, div35);
    			append_dev(div35, form1);
    			append_dev(form1, div33);
    			append_dev(div33, div32);
    			append_dev(div32, input3);
    			append_dev(div32, t53);
    			append_dev(div32, input4);
    			append_dev(form1, t54);
    			append_dev(form1, div34);
    			append_dev(div34, button5);
    			append_dev(button5, i13);
    			append_dev(div38, t55);
    			append_dev(div38, div37);
    			append_dev(div37, div36);
    			append_dev(div36, p1);
    			append_dev(div37, t57);
    			append_dev(div37, ul3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div41);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("OrdenesMedicas", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<OrdenesMedicas> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class OrdenesMedicas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OrdenesMedicas",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src\Pages\AtencionMedica\HistoriaClinica.svelte generated by Svelte v3.29.0 */
    const file$i = "src\\Pages\\AtencionMedica\\HistoriaClinica.svelte";

    function create_fragment$j(ctx) {
    	let asideatencion;
    	let t0;
    	let div7;
    	let div6;
    	let div0;
    	let h5;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let div3;
    	let div2;
    	let div1;
    	let i0;
    	let t5;
    	let i1;
    	let t7;
    	let div5;
    	let div4;
    	let button0;
    	let i2;
    	let t8;
    	let sapn0;
    	let t10;
    	let button1;
    	let i3;
    	let t11;
    	let sapn1;
    	let t13;
    	let button2;
    	let i4;
    	let t14;
    	let sapn2;
    	let t16;
    	let button3;
    	let i5;
    	let t17;
    	let sapn3;
    	let t19;
    	let button4;
    	let i6;
    	let t20;
    	let sapn4;
    	let t22;
    	let button5;
    	let i7;
    	let t23;
    	let sapn5;
    	let t25;
    	let header;
    	let t26;
    	let main;
    	let div119;
    	let div118;
    	let div11;
    	let div9;
    	let div8;
    	let t28;
    	let div10;
    	let textarea0;
    	let t29;
    	let div15;
    	let div13;
    	let div12;
    	let t31;
    	let div14;
    	let textarea1;
    	let t32;
    	let div19;
    	let div17;
    	let div16;
    	let t34;
    	let div18;
    	let textarea2;
    	let t35;
    	let div42;
    	let div21;
    	let div20;
    	let t37;
    	let div41;
    	let div40;
    	let div26;
    	let div25;
    	let label0;
    	let i8;
    	let t38;
    	let t39;
    	let div24;
    	let div22;
    	let input0;
    	let t40;
    	let div23;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t44;
    	let div30;
    	let div29;
    	let label1;
    	let i9;
    	let t45;
    	let t46;
    	let div28;
    	let div27;
    	let input1;
    	let t47;
    	let div34;
    	let div33;
    	let label2;
    	let i10;
    	let t48;
    	let t49;
    	let div32;
    	let div31;
    	let input2;
    	let t50;
    	let div39;
    	let div38;
    	let label3;
    	let i11;
    	let t51;
    	let t52;
    	let div37;
    	let div35;
    	let input3;
    	let t53;
    	let div36;
    	let input4;
    	let t54;
    	let div72;
    	let div44;
    	let div43;
    	let t56;
    	let div71;
    	let div70;
    	let div49;
    	let div48;
    	let label4;
    	let i12;
    	let t57;
    	let t58;
    	let div47;
    	let div45;
    	let input5;
    	let t59;
    	let div46;
    	let select1;
    	let option3;
    	let option4;
    	let t62;
    	let div55;
    	let div54;
    	let label5;
    	let i13;
    	let t63;
    	let t64;
    	let div53;
    	let div52;
    	let div51;
    	let input6;
    	let t65;
    	let div50;
    	let span2;
    	let t67;
    	let div61;
    	let div60;
    	let label6;
    	let i14;
    	let t68;
    	let t69;
    	let div59;
    	let div58;
    	let div57;
    	let input7;
    	let t70;
    	let div56;
    	let span3;
    	let t72;
    	let div65;
    	let div64;
    	let label7;
    	let i15;
    	let t73;
    	let t74;
    	let div63;
    	let div62;
    	let input8;
    	let t75;
    	let div69;
    	let div68;
    	let label8;
    	let t77;
    	let div67;
    	let div66;
    	let input9;
    	let t78;
    	let div79;
    	let div74;
    	let div73;
    	let t80;
    	let div77;
    	let div76;
    	let a0;
    	let i16;
    	let t81;
    	let div75;
    	let button6;
    	let t83;
    	let button7;
    	let t85;
    	let button8;
    	let t87;
    	let div78;
    	let textarea3;
    	let t88;
    	let div92;
    	let div81;
    	let div80;
    	let t90;
    	let div84;
    	let div83;
    	let a1;
    	let i17;
    	let t91;
    	let div82;
    	let button9;
    	let i18;
    	let t92;
    	let t93;
    	let div91;
    	let div90;
    	let div87;
    	let div86;
    	let input10;
    	let t94;
    	let ul0;
    	let div85;
    	let t95;
    	let li0;
    	let a2;
    	let i19;
    	let t96;
    	let t97;
    	let div89;
    	let ul1;
    	let li1;
    	let span4;
    	let t99;
    	let span5;
    	let t101;
    	let div88;
    	let a3;
    	let i20;
    	let t102;
    	let a4;
    	let i21;
    	let t103;
    	let ordenesmedicas;
    	let t104;
    	let div96;
    	let div94;
    	let div93;
    	let t106;
    	let div95;
    	let textarea4;
    	let t107;
    	let div117;
    	let div102;
    	let div101;
    	let div98;
    	let div97;
    	let t109;
    	let div100;
    	let div99;
    	let select2;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let option9;
    	let t115;
    	let div110;
    	let div109;
    	let div104;
    	let div103;
    	let t117;
    	let div108;
    	let div107;
    	let div105;
    	let label9;
    	let t119;
    	let input11;
    	let t120;
    	let div106;
    	let label10;
    	let t122;
    	let input12;
    	let t123;
    	let div116;
    	let div115;
    	let div112;
    	let div111;
    	let t125;
    	let div114;
    	let div113;
    	let select3;
    	let option10;
    	let option11;
    	let option12;
    	let option13;
    	let option14;
    	let option15;
    	let option16;
    	let option17;
    	let option18;
    	let t135;
    	let modaldatospaciente;
    	let t136;
    	let modaltratamientos;
    	let t137;
    	let modalinterconsulta;
    	let t138;
    	let modalantecedentes;
    	let current;
    	asideatencion = new AsideAtencion({ $$inline: true });
    	header = new Header({ $$inline: true });
    	ordenesmedicas = new OrdenesMedicas({ $$inline: true });
    	modaldatospaciente = new ModalDatosPaciente({ $$inline: true });
    	modaltratamientos = new ModalTratamientos({ $$inline: true });
    	modalinterconsulta = new ModalInterconsulta({ $$inline: true });
    	modalantecedentes = new ModalAntecedentes({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asideatencion.$$.fragment);
    			t0 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			span0 = element("span");
    			span0.textContent = "Historia Clinica";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "Fiordaliza De Jesus Herrera";
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			i0 = element("i");
    			t5 = space();
    			i1 = element("i");
    			i1.textContent = "listo y guardado";
    			t7 = space();
    			div5 = element("div");
    			div4 = element("div");
    			button0 = element("button");
    			i2 = element("i");
    			t8 = space();
    			sapn0 = element("sapn");
    			sapn0.textContent = "Datos del Paciente";
    			t10 = space();
    			button1 = element("button");
    			i3 = element("i");
    			t11 = space();
    			sapn1 = element("sapn");
    			sapn1.textContent = "Agregar Campo";
    			t13 = space();
    			button2 = element("button");
    			i4 = element("i");
    			t14 = space();
    			sapn2 = element("sapn");
    			sapn2.textContent = "Registrar Interconsulta";
    			t16 = space();
    			button3 = element("button");
    			i5 = element("i");
    			t17 = space();
    			sapn3 = element("sapn");
    			sapn3.textContent = "Imprimir";
    			t19 = space();
    			button4 = element("button");
    			i6 = element("i");
    			t20 = space();
    			sapn4 = element("sapn");
    			sapn4.textContent = "Antecedentes";
    			t22 = space();
    			button5 = element("button");
    			i7 = element("i");
    			t23 = space();
    			sapn5 = element("sapn");
    			sapn5.textContent = "Anular";
    			t25 = space();
    			create_component(header.$$.fragment);
    			t26 = space();
    			main = element("main");
    			div119 = element("div");
    			div118 = element("div");
    			div11 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div8.textContent = "Motivo de consulta";
    			t28 = space();
    			div10 = element("div");
    			textarea0 = element("textarea");
    			t29 = space();
    			div15 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div12.textContent = "Historia de la enfermedad";
    			t31 = space();
    			div14 = element("div");
    			textarea1 = element("textarea");
    			t32 = space();
    			div19 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			div16.textContent = "Examen mental";
    			t34 = space();
    			div18 = element("div");
    			textarea2 = element("textarea");
    			t35 = space();
    			div42 = element("div");
    			div21 = element("div");
    			div20 = element("div");
    			div20.textContent = "Signos vitales";
    			t37 = space();
    			div41 = element("div");
    			div40 = element("div");
    			div26 = element("div");
    			div25 = element("div");
    			label0 = element("label");
    			i8 = element("i");
    			t38 = text(" Temperatura");
    			t39 = space();
    			div24 = element("div");
    			div22 = element("div");
    			input0 = element("input");
    			t40 = space();
    			div23 = element("div");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "°C";
    			option1 = element("option");
    			option1.textContent = "°K";
    			option2 = element("option");
    			option2.textContent = "°F";
    			t44 = space();
    			div30 = element("div");
    			div29 = element("div");
    			label1 = element("label");
    			i9 = element("i");
    			t45 = text(" Frecuencia respiratoria");
    			t46 = space();
    			div28 = element("div");
    			div27 = element("div");
    			input1 = element("input");
    			t47 = space();
    			div34 = element("div");
    			div33 = element("div");
    			label2 = element("label");
    			i10 = element("i");
    			t48 = text(" Frecuencia cardiaca");
    			t49 = space();
    			div32 = element("div");
    			div31 = element("div");
    			input2 = element("input");
    			t50 = space();
    			div39 = element("div");
    			div38 = element("div");
    			label3 = element("label");
    			i11 = element("i");
    			t51 = text(" Presion alterial (mmHg)");
    			t52 = space();
    			div37 = element("div");
    			div35 = element("div");
    			input3 = element("input");
    			t53 = space();
    			div36 = element("div");
    			input4 = element("input");
    			t54 = space();
    			div72 = element("div");
    			div44 = element("div");
    			div43 = element("div");
    			div43.textContent = "Otros parametros";
    			t56 = space();
    			div71 = element("div");
    			div70 = element("div");
    			div49 = element("div");
    			div48 = element("div");
    			label4 = element("label");
    			i12 = element("i");
    			t57 = text(" Peso");
    			t58 = space();
    			div47 = element("div");
    			div45 = element("div");
    			input5 = element("input");
    			t59 = space();
    			div46 = element("div");
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Lb";
    			option4 = element("option");
    			option4.textContent = "Kg";
    			t62 = space();
    			div55 = element("div");
    			div54 = element("div");
    			label5 = element("label");
    			i13 = element("i");
    			t63 = text(" Escala de glasgow");
    			t64 = space();
    			div53 = element("div");
    			div52 = element("div");
    			div51 = element("div");
    			input6 = element("input");
    			t65 = space();
    			div50 = element("div");
    			span2 = element("span");
    			span2.textContent = "/ 15";
    			t67 = space();
    			div61 = element("div");
    			div60 = element("div");
    			label6 = element("label");
    			i14 = element("i");
    			t68 = text(" Escala de dolor");
    			t69 = space();
    			div59 = element("div");
    			div58 = element("div");
    			div57 = element("div");
    			input7 = element("input");
    			t70 = space();
    			div56 = element("div");
    			span3 = element("span");
    			span3.textContent = "/ 10";
    			t72 = space();
    			div65 = element("div");
    			div64 = element("div");
    			label7 = element("label");
    			i15 = element("i");
    			t73 = text(" Saturación de oxigeno");
    			t74 = space();
    			div63 = element("div");
    			div62 = element("div");
    			input8 = element("input");
    			t75 = space();
    			div69 = element("div");
    			div68 = element("div");
    			label8 = element("label");
    			label8.textContent = "Otros";
    			t77 = space();
    			div67 = element("div");
    			div66 = element("div");
    			input9 = element("input");
    			t78 = space();
    			div79 = element("div");
    			div74 = element("div");
    			div73 = element("div");
    			div73.textContent = "Examen Fisico";
    			t80 = space();
    			div77 = element("div");
    			div76 = element("div");
    			a0 = element("a");
    			i16 = element("i");
    			t81 = space();
    			div75 = element("div");
    			button6 = element("button");
    			button6.textContent = "Action";
    			t83 = space();
    			button7 = element("button");
    			button7.textContent = "Another action";
    			t85 = space();
    			button8 = element("button");
    			button8.textContent = "Something else here";
    			t87 = space();
    			div78 = element("div");
    			textarea3 = element("textarea");
    			t88 = space();
    			div92 = element("div");
    			div81 = element("div");
    			div80 = element("div");
    			div80.textContent = "Diagnosticos";
    			t90 = space();
    			div84 = element("div");
    			div83 = element("div");
    			a1 = element("a");
    			i17 = element("i");
    			t91 = space();
    			div82 = element("div");
    			button9 = element("button");
    			i18 = element("i");
    			t92 = text("\r\n                                    Agregar nuevo diagnostico");
    			t93 = space();
    			div91 = element("div");
    			div90 = element("div");
    			div87 = element("div");
    			div86 = element("div");
    			input10 = element("input");
    			t94 = space();
    			ul0 = element("ul");
    			div85 = element("div");
    			t95 = space();
    			li0 = element("li");
    			a2 = element("a");
    			i19 = element("i");
    			t96 = text("Agregar manualmente");
    			t97 = space();
    			div89 = element("div");
    			ul1 = element("ul");
    			li1 = element("li");
    			span4 = element("span");
    			span4.textContent = "F316";
    			t99 = text(" ");
    			span5 = element("span");
    			span5.textContent = "TRASTORNO AFECTIVO BIPOLAR, EPISODIO MIXTO PRESENTE";
    			t101 = space();
    			div88 = element("div");
    			a3 = element("a");
    			i20 = element("i");
    			t102 = space();
    			a4 = element("a");
    			i21 = element("i");
    			t103 = space();
    			create_component(ordenesmedicas.$$.fragment);
    			t104 = space();
    			div96 = element("div");
    			div94 = element("div");
    			div93 = element("div");
    			div93.textContent = "Observaciones";
    			t106 = space();
    			div95 = element("div");
    			textarea4 = element("textarea");
    			t107 = space();
    			div117 = element("div");
    			div102 = element("div");
    			div101 = element("div");
    			div98 = element("div");
    			div97 = element("div");
    			div97.textContent = "Pronostico";
    			t109 = space();
    			div100 = element("div");
    			div99 = element("div");
    			select2 = element("select");
    			option5 = element("option");
    			option5.textContent = "- Seleccionar -";
    			option6 = element("option");
    			option6.textContent = "Favorable o Bueno";
    			option7 = element("option");
    			option7.textContent = "Moderado o Intermedio";
    			option8 = element("option");
    			option8.textContent = "Grave";
    			option9 = element("option");
    			option9.textContent = "Reservado";
    			t115 = space();
    			div110 = element("div");
    			div109 = element("div");
    			div104 = element("div");
    			div103 = element("div");
    			div103.textContent = "Fecha y hora";
    			t117 = space();
    			div108 = element("div");
    			div107 = element("div");
    			div105 = element("div");
    			label9 = element("label");
    			label9.textContent = "Fecha";
    			t119 = space();
    			input11 = element("input");
    			t120 = space();
    			div106 = element("div");
    			label10 = element("label");
    			label10.textContent = "Hora";
    			t122 = space();
    			input12 = element("input");
    			t123 = space();
    			div116 = element("div");
    			div115 = element("div");
    			div112 = element("div");
    			div111 = element("div");
    			div111.textContent = "Especialista";
    			t125 = space();
    			div114 = element("div");
    			div113 = element("div");
    			select3 = element("select");
    			option10 = element("option");
    			option10.textContent = "Alfredo Joel Mena";
    			option11 = element("option");
    			option11.textContent = "Vladimir Núñez";
    			option12 = element("option");
    			option12.textContent = "Verenice Gálvez";
    			option13 = element("option");
    			option13.textContent = "stephany maria nuñez moya";
    			option14 = element("option");
    			option14.textContent = "Pedro  Compres";
    			option15 = element("option");
    			option15.textContent = "Milagros Sierra";
    			option16 = element("option");
    			option16.textContent = "Marlena Taveras";
    			option17 = element("option");
    			option17.textContent = "Mariela Camilo";
    			option18 = element("option");
    			option18.textContent = "Emely Bidó García";
    			t135 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			t136 = space();
    			create_component(modaltratamientos.$$.fragment);
    			t137 = space();
    			create_component(modalinterconsulta.$$.fragment);
    			t138 = space();
    			create_component(modalantecedentes.$$.fragment);
    			attr_dev(span0, "class", "badge badge-primary");
    			attr_dev(span0, "data-bind", "text: titulo");
    			add_location(span0, file$i, 16, 16, 752);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$i, 17, 16, 852);
    			add_location(h5, file$i, 15, 12, 730);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$i, 14, 8, 694);
    			attr_dev(i0, "class", "mdi mdi-check-all");
    			add_location(i0, file$i, 22, 108, 1192);
    			add_location(i1, file$i, 23, 59, 1255);
    			attr_dev(div1, "class", "guardando mr-2 text-success");
    			attr_dev(div1, "data-bind", "html: content, class: contentClass");
    			add_location(div1, file$i, 22, 20, 1104);
    			attr_dev(div2, "class", "guardar-documento");
    			add_location(div2, file$i, 21, 16, 1051);
    			attr_dev(div3, "class", "col-md-6");
    			set_style(div3, "text-align", "right");
    			add_location(div3, file$i, 20, 8, 984);
    			attr_dev(i2, "data-bind", "class: icon");
    			attr_dev(i2, "class", "mdi mdi-comment-eye");
    			add_location(i2, file$i, 31, 24, 1633);
    			attr_dev(sapn0, "data-bind", "text: text");
    			add_location(sapn0, file$i, 32, 24, 1718);
    			attr_dev(button0, "data-toggle", "modal");
    			attr_dev(button0, "data-target", "#modalDatosPersonales");
    			set_style(button0, "box-shadow", "none");
    			attr_dev(button0, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button0, file$i, 29, 20, 1452);
    			attr_dev(i3, "data-bind", "class: icon");
    			attr_dev(i3, "class", "mdi mdi-text");
    			add_location(i3, file$i, 37, 24, 1995);
    			attr_dev(sapn1, "data-bind", "text: text");
    			add_location(sapn1, file$i, 38, 24, 2073);
    			attr_dev(button1, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button1, "box-shadow", "none");
    			attr_dev(button1, "class", "btn btn-outline-dark btn-sm");
    			add_location(button1, file$i, 35, 20, 1827);
    			attr_dev(i4, "data-bind", "class: icon");
    			attr_dev(i4, "class", "mdi mdi-repeat");
    			add_location(i4, file$i, 43, 24, 2351);
    			attr_dev(sapn2, "data-bind", "text: text");
    			add_location(sapn2, file$i, 44, 24, 2431);
    			attr_dev(button2, "data-toggle", "modal");
    			attr_dev(button2, "data-target", "#modalInterconsulta");
    			set_style(button2, "box-shadow", "none");
    			attr_dev(button2, "class", "btn btn-outline-dark btn-sm");
    			add_location(button2, file$i, 41, 20, 2177);
    			attr_dev(i5, "data-bind", "class: icon");
    			attr_dev(i5, "class", "mdi mdi-printer");
    			add_location(i5, file$i, 49, 24, 2729);
    			attr_dev(sapn3, "data-bind", "text: text");
    			add_location(sapn3, file$i, 50, 24, 2810);
    			attr_dev(button3, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button3, "box-shadow", "none");
    			attr_dev(button3, "class", "btn btn-outline-dark btn-sm btn-hover-white");
    			add_location(button3, file$i, 47, 20, 2545);
    			attr_dev(i6, "data-bind", "class: icon");
    			attr_dev(i6, "class", "mdi mdi-account-clock");
    			add_location(i6, file$i, 55, 24, 3082);
    			attr_dev(sapn4, "data-bind", "text: text");
    			add_location(sapn4, file$i, 56, 24, 3169);
    			attr_dev(button4, "data-toggle", "modal");
    			attr_dev(button4, "data-target", "#modalAntecedentes");
    			set_style(button4, "box-shadow", "none");
    			attr_dev(button4, "class", "btn btn-outline-dark btn-sm");
    			add_location(button4, file$i, 53, 20, 2909);
    			attr_dev(i7, "data-bind", "class: icon");
    			attr_dev(i7, "class", "mdi mdi-delete");
    			add_location(i7, file$i, 61, 24, 3442);
    			attr_dev(sapn5, "data-bind", "text: text");
    			add_location(sapn5, file$i, 62, 24, 3522);
    			attr_dev(button5, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button5, "box-shadow", "none");
    			attr_dev(button5, "class", "btn btn-outline-danger btn-sm");
    			add_location(button5, file$i, 59, 20, 3272);
    			attr_dev(div4, "class", "dropdown");
    			attr_dev(div4, "data-bind", "foreach: actionButtons");
    			add_location(div4, file$i, 27, 12, 1371);
    			attr_dev(div5, "class", "col-lg-12");
    			add_location(div5, file$i, 26, 8, 1334);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$i, 13, 4, 667);
    			attr_dev(div7, "class", "contenedor-datos");
    			attr_dev(div7, "id", "divHeaderBar");
    			add_location(div7, file$i, 12, 0, 613);
    			attr_dev(div8, "class", "card-title");
    			add_location(div8, file$i, 75, 24, 3973);
    			attr_dev(div9, "class", "card-header");
    			add_location(div9, file$i, 74, 20, 3922);
    			attr_dev(textarea0, "class", "form-control");
    			set_style(textarea0, "width", "100%");
    			set_style(textarea0, "display", "block");
    			set_style(textarea0, "height", "150px");
    			attr_dev(textarea0, "rows", "3");
    			attr_dev(textarea0, "name", "Comentario");
    			attr_dev(textarea0, "data-bind", "value: atencionMedica.motivoConsulta");
    			add_location(textarea0, file$i, 78, 24, 4120);
    			attr_dev(div10, "class", "card-body");
    			add_location(div10, file$i, 77, 20, 4071);
    			attr_dev(div11, "data-bind", "if: perfil().motivoConsulta");
    			attr_dev(div11, "class", "card m-b-20 margen-mobile");
    			add_location(div11, file$i, 73, 16, 3821);
    			attr_dev(div12, "class", "card-title");
    			add_location(div12, file$i, 83, 24, 4511);
    			attr_dev(div13, "class", "card-header");
    			add_location(div13, file$i, 82, 20, 4460);
    			attr_dev(textarea1, "class", "form-control");
    			attr_dev(textarea1, "data-bind", "value: atencionMedica.historiaEnfermedad");
    			set_style(textarea1, "width", "100%");
    			set_style(textarea1, "display", "block");
    			set_style(textarea1, "height", "150px");
    			attr_dev(textarea1, "rows", "3");
    			attr_dev(textarea1, "name", "Comentario");
    			add_location(textarea1, file$i, 86, 24, 4665);
    			attr_dev(div14, "class", "card-body");
    			add_location(div14, file$i, 85, 20, 4616);
    			attr_dev(div15, "data-bind", "if: perfil().historiaEnfermedad");
    			attr_dev(div15, "class", "card m-b-20 autosave");
    			add_location(div15, file$i, 81, 16, 4360);
    			attr_dev(div16, "class", "card-title");
    			add_location(div16, file$i, 91, 24, 5054);
    			attr_dev(div17, "class", "card-header");
    			add_location(div17, file$i, 90, 20, 5003);
    			attr_dev(textarea2, "class", "form-control");
    			attr_dev(textarea2, "data-bind", "value: notaMedica.examenMental");
    			set_style(textarea2, "width", "100%");
    			set_style(textarea2, "display", "block");
    			set_style(textarea2, "height", "150px");
    			attr_dev(textarea2, "rows", "3");
    			attr_dev(textarea2, "name", "Comentario");
    			add_location(textarea2, file$i, 94, 24, 5196);
    			attr_dev(div18, "class", "card-body");
    			add_location(div18, file$i, 93, 20, 5147);
    			attr_dev(div19, "class", "card m-b-20 autosave");
    			attr_dev(div19, "data-bind", "if: perfil().examenMental");
    			add_location(div19, file$i, 89, 16, 4909);
    			attr_dev(div20, "class", "card-title");
    			add_location(div20, file$i, 100, 24, 5569);
    			attr_dev(div21, "class", "card-header");
    			add_location(div21, file$i, 99, 20, 5518);
    			attr_dev(i8, "class", "mdi mdi-thermometer mdi-18px");
    			add_location(i8, file$i, 106, 50, 5891);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$i, 106, 36, 5877);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "form-control");
    			add_location(input0, file$i, 109, 44, 6120);
    			attr_dev(div22, "class", "col-lg-7");
    			add_location(div22, file$i, 108, 40, 6052);
    			option0.__value = "°C";
    			option0.value = option0.__value;
    			add_location(option0, file$i, 113, 48, 6399);
    			option1.__value = "°K";
    			option1.value = option1.__value;
    			add_location(option1, file$i, 114, 48, 6479);
    			option2.__value = "°F";
    			option2.value = option2.__value;
    			add_location(option2, file$i, 115, 48, 6559);
    			attr_dev(select0, "class", "form-control");
    			add_location(select0, file$i, 112, 44, 6320);
    			attr_dev(div23, "class", "col-lg-5");
    			add_location(div23, file$i, 111, 40, 6252);
    			attr_dev(div24, "class", "row");
    			add_location(div24, file$i, 107, 36, 5993);
    			attr_dev(div25, "class", "form-group");
    			add_location(div25, file$i, 105, 32, 5815);
    			attr_dev(div26, "class", "col-lg-3");
    			add_location(div26, file$i, 104, 28, 5759);
    			attr_dev(i9, "class", "mdi mdi-chart-line mdi-18px");
    			add_location(i9, file$i, 123, 50, 6976);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$i, 123, 36, 6962);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "form-control");
    			add_location(input1, file$i, 126, 44, 7217);
    			attr_dev(div27, "class", "col-lg-12");
    			add_location(div27, file$i, 125, 40, 7148);
    			attr_dev(div28, "class", "row");
    			add_location(div28, file$i, 124, 36, 7089);
    			attr_dev(div29, "class", "form-group");
    			add_location(div29, file$i, 122, 32, 6900);
    			attr_dev(div30, "class", "col-lg-3");
    			add_location(div30, file$i, 121, 28, 6844);
    			attr_dev(i10, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i10, file$i, 133, 50, 7589);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$i, 133, 36, 7575);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "form-control");
    			add_location(input2, file$i, 136, 44, 7827);
    			attr_dev(div31, "class", "col-lg-12");
    			add_location(div31, file$i, 135, 40, 7758);
    			attr_dev(div32, "class", "row");
    			add_location(div32, file$i, 134, 36, 7699);
    			attr_dev(div33, "class", "form-group");
    			add_location(div33, file$i, 132, 32, 7513);
    			attr_dev(div34, "class", "col-lg-3");
    			add_location(div34, file$i, 131, 28, 7457);
    			attr_dev(i11, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i11, file$i, 143, 50, 8199);
    			attr_dev(label3, "for", "");
    			add_location(label3, file$i, 143, 36, 8185);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "class", "form-control");
    			add_location(input3, file$i, 146, 44, 8440);
    			attr_dev(div35, "class", "col-lg-6");
    			add_location(div35, file$i, 145, 40, 8372);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "form-control");
    			add_location(input4, file$i, 149, 44, 8640);
    			attr_dev(div36, "class", "col-lg-6");
    			add_location(div36, file$i, 148, 40, 8572);
    			attr_dev(div37, "class", "row");
    			add_location(div37, file$i, 144, 36, 8313);
    			attr_dev(div38, "class", "form-group");
    			add_location(div38, file$i, 142, 32, 8123);
    			attr_dev(div39, "class", "col-lg-3");
    			add_location(div39, file$i, 141, 28, 8067);
    			attr_dev(div40, "class", "row");
    			add_location(div40, file$i, 103, 24, 5712);
    			attr_dev(div41, "class", "card-body");
    			add_location(div41, file$i, 102, 20, 5663);
    			attr_dev(div42, "class", "card m-b-20 margen-mobile autosave");
    			add_location(div42, file$i, 98, 16, 5448);
    			attr_dev(div43, "class", "card-title");
    			add_location(div43, file$i, 161, 24, 9077);
    			attr_dev(div44, "class", "card-header");
    			add_location(div44, file$i, 160, 20, 9026);
    			attr_dev(i12, "class", "mdi mdi-weight-pound");
    			add_location(i12, file$i, 167, 50, 9401);
    			attr_dev(label4, "for", "");
    			add_location(label4, file$i, 167, 36, 9387);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "class", "form-control");
    			add_location(input5, file$i, 170, 44, 9615);
    			attr_dev(div45, "class", "col-lg-7");
    			add_location(div45, file$i, 169, 40, 9547);
    			option3.__value = "°C";
    			option3.value = option3.__value;
    			add_location(option3, file$i, 174, 48, 9894);
    			option4.__value = "°K";
    			option4.value = option4.__value;
    			add_location(option4, file$i, 175, 48, 9974);
    			attr_dev(select1, "class", "form-control");
    			add_location(select1, file$i, 173, 44, 9815);
    			attr_dev(div46, "class", "col-lg-5");
    			add_location(div46, file$i, 172, 40, 9747);
    			attr_dev(div47, "class", "row");
    			add_location(div47, file$i, 168, 36, 9488);
    			attr_dev(div48, "class", "form-group");
    			add_location(div48, file$i, 166, 32, 9325);
    			attr_dev(div49, "class", "col-lg-3");
    			add_location(div49, file$i, 165, 28, 9269);
    			attr_dev(i13, "class", "mdi mdi-human");
    			add_location(i13, file$i, 183, 50, 10391);
    			attr_dev(label5, "for", "");
    			add_location(label5, file$i, 183, 36, 10377);
    			attr_dev(input6, "type", "number");
    			attr_dev(input6, "class", "form-control");
    			attr_dev(input6, "max", "15");
    			attr_dev(input6, "maxlength", "2");
    			attr_dev(input6, "data-bind", "value: notaMedica.escalaGlasgow");
    			attr_dev(input6, "aria-label", "Recipient's username");
    			attr_dev(input6, "aria-describedby", "basic-addon2");
    			add_location(input6, file$i, 187, 48, 10733);
    			attr_dev(span2, "class", "input-group-text");
    			attr_dev(span2, "id", "basic-addon2");
    			add_location(span2, file$i, 189, 52, 11044);
    			attr_dev(div50, "class", "input-group-append");
    			add_location(div50, file$i, 188, 48, 10958);
    			attr_dev(div51, "class", "input-group");
    			set_style(div51, "width", "100%", 1);
    			set_style(div51, "float", "right");
    			add_location(div51, file$i, 186, 44, 10612);
    			attr_dev(div52, "class", "col-lg-12");
    			add_location(div52, file$i, 185, 40, 10543);
    			attr_dev(div53, "class", "row");
    			add_location(div53, file$i, 184, 36, 10484);
    			attr_dev(div54, "class", "form-group");
    			add_location(div54, file$i, 182, 32, 10315);
    			attr_dev(div55, "class", "col-lg-3");
    			add_location(div55, file$i, 181, 28, 10259);
    			attr_dev(i14, "class", "mdi mdi-emoticon-happy");
    			add_location(i14, file$i, 198, 50, 11542);
    			attr_dev(label6, "for", "");
    			add_location(label6, file$i, 198, 36, 11528);
    			attr_dev(input7, "type", "number");
    			attr_dev(input7, "class", "form-control");
    			attr_dev(input7, "max", "10");
    			attr_dev(input7, "maxlength", "2");
    			attr_dev(input7, "data-bind", "value: notaMedica.escalaGlasgow");
    			attr_dev(input7, "aria-label", "Recipient's username");
    			attr_dev(input7, "aria-describedby", "basic-addon2");
    			add_location(input7, file$i, 202, 48, 11891);
    			attr_dev(span3, "class", "input-group-text");
    			attr_dev(span3, "id", "basic-addon2");
    			add_location(span3, file$i, 204, 52, 12202);
    			attr_dev(div56, "class", "input-group-append");
    			add_location(div56, file$i, 203, 48, 12116);
    			attr_dev(div57, "class", "input-group");
    			set_style(div57, "width", "100%", 1);
    			set_style(div57, "float", "right");
    			add_location(div57, file$i, 201, 44, 11770);
    			attr_dev(div58, "class", "col-lg-12");
    			add_location(div58, file$i, 200, 40, 11701);
    			attr_dev(div59, "class", "row");
    			add_location(div59, file$i, 199, 36, 11642);
    			attr_dev(div60, "class", "form-group");
    			add_location(div60, file$i, 197, 32, 11466);
    			attr_dev(div61, "class", "col-lg-3");
    			add_location(div61, file$i, 196, 28, 11410);
    			attr_dev(i15, "class", "mdi mdi-opacity");
    			add_location(i15, file$i, 213, 50, 12700);
    			attr_dev(label7, "for", "");
    			add_location(label7, file$i, 213, 36, 12686);
    			attr_dev(input8, "type", "number");
    			attr_dev(input8, "class", "form-control");
    			add_location(input8, file$i, 216, 44, 12934);
    			attr_dev(div62, "class", "col-lg-12");
    			add_location(div62, file$i, 215, 40, 12865);
    			attr_dev(div63, "class", "row");
    			add_location(div63, file$i, 214, 36, 12806);
    			attr_dev(div64, "class", "form-group");
    			add_location(div64, file$i, 212, 32, 12624);
    			attr_dev(div65, "class", "col-lg-3");
    			add_location(div65, file$i, 211, 28, 12568);
    			attr_dev(label8, "for", "");
    			add_location(label8, file$i, 223, 36, 13293);
    			attr_dev(input9, "type", "text");
    			attr_dev(input9, "class", "form-control");
    			add_location(input9, file$i, 226, 44, 13486);
    			attr_dev(div66, "class", "col-lg-12");
    			add_location(div66, file$i, 225, 40, 13417);
    			attr_dev(div67, "class", "row");
    			add_location(div67, file$i, 224, 36, 13358);
    			attr_dev(div68, "class", "form-group");
    			add_location(div68, file$i, 222, 32, 13231);
    			attr_dev(div69, "class", "col-lg-12");
    			add_location(div69, file$i, 221, 28, 13174);
    			attr_dev(div70, "class", "row");
    			add_location(div70, file$i, 164, 24, 9222);
    			attr_dev(div71, "class", "card-body");
    			add_location(div71, file$i, 163, 20, 9173);
    			attr_dev(div72, "class", "card m-b-20 margen-mobile autosave");
    			add_location(div72, file$i, 159, 16, 8956);
    			attr_dev(div73, "class", "card-title");
    			add_location(div73, file$i, 238, 24, 13961);
    			attr_dev(div74, "class", "card-header");
    			add_location(div74, file$i, 237, 20, 13910);
    			attr_dev(i16, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i16, file$i, 242, 107, 14238);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "data-toggle", "dropdown");
    			attr_dev(a0, "aria-haspopup", "true");
    			attr_dev(a0, "aria-expanded", "false");
    			add_location(a0, file$i, 242, 28, 14159);
    			attr_dev(button6, "class", "dropdown-item");
    			attr_dev(button6, "type", "button");
    			add_location(button6, file$i, 244, 32, 14397);
    			attr_dev(button7, "class", "dropdown-item");
    			attr_dev(button7, "type", "button");
    			add_location(button7, file$i, 245, 32, 14490);
    			attr_dev(button8, "class", "dropdown-item");
    			attr_dev(button8, "type", "button");
    			add_location(button8, file$i, 246, 32, 14591);
    			attr_dev(div75, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div75, file$i, 243, 28, 14316);
    			attr_dev(div76, "class", "dropdown");
    			add_location(div76, file$i, 241, 24, 14107);
    			attr_dev(div77, "class", "card-controls");
    			add_location(div77, file$i, 240, 20, 14054);
    			attr_dev(textarea3, "class", "form-control");
    			set_style(textarea3, "width", "100%");
    			set_style(textarea3, "display", "block");
    			attr_dev(textarea3, "data-bind", "value: notaMedica.exploracionFisica");
    			attr_dev(textarea3, "rows", "5");
    			attr_dev(textarea3, "name", "Comentario");
    			add_location(textarea3, file$i, 251, 24, 14830);
    			attr_dev(div78, "class", "card-body");
    			add_location(div78, file$i, 250, 20, 14781);
    			attr_dev(div79, "data-bind", "if: perfil().examenFisico");
    			attr_dev(div79, "class", "card m-b-20 autosave");
    			add_location(div79, file$i, 236, 16, 13816);
    			attr_dev(div80, "class", "card-title");
    			add_location(div80, file$i, 256, 24, 15152);
    			attr_dev(div81, "class", "card-header");
    			add_location(div81, file$i, 255, 20, 15101);
    			attr_dev(i17, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i17, file$i, 260, 107, 15428);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "data-toggle", "dropdown");
    			attr_dev(a1, "aria-haspopup", "true");
    			attr_dev(a1, "aria-expanded", "false");
    			add_location(a1, file$i, 260, 28, 15349);
    			attr_dev(i18, "class", "mdi mdi-plus");
    			add_location(i18, file$i, 262, 89, 15644);
    			attr_dev(button9, "class", "dropdown-item text-success");
    			attr_dev(button9, "type", "button");
    			add_location(button9, file$i, 262, 32, 15587);
    			attr_dev(div82, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div82, file$i, 261, 28, 15506);
    			attr_dev(div83, "class", "dropdown");
    			add_location(div83, file$i, 259, 24, 15297);
    			attr_dev(div84, "class", "card-controls");
    			add_location(div84, file$i, 258, 20, 15244);
    			attr_dev(input10, "type", "text");
    			attr_dev(input10, "class", "form-control");
    			attr_dev(input10, "name", "");
    			attr_dev(input10, "data-bind", "textInput: busqueda");
    			attr_dev(input10, "id", "txtBusquedaProblemaMedico");
    			attr_dev(input10, "data-toggle", "dropdown");
    			attr_dev(input10, "aria-haspopup", "true");
    			attr_dev(input10, "aria-expanded", "true");
    			add_location(input10, file$i, 271, 36, 16106);
    			attr_dev(div85, "class", "contenidoLista");
    			attr_dev(div85, "data-bind", "foreach: problemasMedicos");
    			add_location(div85, file$i, 273, 40, 16576);
    			attr_dev(i19, "class", "mdi mdi-plus");
    			add_location(i19, file$i, 275, 95, 16807);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "data-bind", "click: agregarDiagnostico");
    			add_location(a2, file$i, 275, 44, 16756);
    			attr_dev(li0, "class", "defecto");
    			add_location(li0, file$i, 274, 40, 16690);
    			attr_dev(ul0, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul0, "id", "buscador");
    			attr_dev(ul0, "x-placement", "top-start");
    			set_style(ul0, "position", "absolute");
    			set_style(ul0, "will-change", "transform");
    			set_style(ul0, "top", "0px");
    			set_style(ul0, "left", "0px");
    			set_style(ul0, "transform", "translate3d(0px, -128px, 0px)");
    			set_style(ul0, "border-radius", "5px");
    			add_location(ul0, file$i, 272, 36, 16320);
    			attr_dev(div86, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div86, file$i, 270, 32, 16012);
    			attr_dev(div87, "class", "col-12");
    			add_location(div87, file$i, 269, 28, 15958);
    			attr_dev(span4, "class", "badge badge-primary");
    			attr_dev(span4, "data-bind", "text: codigo");
    			add_location(span4, file$i, 285, 40, 17271);
    			attr_dev(span5, "data-bind", "text: nombre");
    			add_location(span5, file$i, 285, 116, 17347);
    			attr_dev(i20, "class", "mdi-18px mdi mdi-comment-plus-outline");
    			add_location(i20, file$i, 287, 138, 17740);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "text-primary");
    			attr_dev(a3, "data-bind", "click: modoEditarOn");
    			attr_dev(a3, "title", "Agregar comentarios");
    			add_location(a3, file$i, 287, 44, 17646);
    			attr_dev(i21, "class", "mdi-18px mdi mdi-trash-can-outline");
    			add_location(i21, file$i, 288, 191, 17990);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "data-bind", "click: eliminar");
    			attr_dev(a4, "class", "text-danger");
    			attr_dev(a4, "data-toggle", "tooltip");
    			attr_dev(a4, "data-placement", "top");
    			attr_dev(a4, "data-original-title", "Eliminar diagnostico");
    			add_location(a4, file$i, 288, 44, 17843);
    			set_style(div88, "position", "absolute");
    			set_style(div88, "top", "0");
    			set_style(div88, "right", "0");
    			set_style(div88, "padding", "10px");
    			set_style(div88, "background-color", "white");
    			set_style(div88, "border-bottom-left-radius", "5px");
    			add_location(div88, file$i, 286, 40, 17478);
    			add_location(li1, file$i, 284, 36, 17225);
    			attr_dev(ul1, "class", "list-info");
    			attr_dev(ul1, "data-bind", "foreach: diagnosticos");
    			add_location(ul1, file$i, 283, 32, 17131);
    			attr_dev(div89, "class", "col-md-12");
    			add_location(div89, file$i, 282, 28, 17074);
    			attr_dev(div90, "class", "row");
    			add_location(div90, file$i, 268, 24, 15911);
    			attr_dev(div91, "class", "card-body");
    			add_location(div91, file$i, 267, 20, 15862);
    			attr_dev(div92, "class", "card m-b-20");
    			add_location(div92, file$i, 254, 16, 15054);
    			attr_dev(div93, "class", "card-title");
    			add_location(div93, file$i, 301, 24, 18489);
    			attr_dev(div94, "class", "card-header");
    			add_location(div94, file$i, 300, 20, 18438);
    			attr_dev(textarea4, "class", "form-control");
    			set_style(textarea4, "width", "100%");
    			set_style(textarea4, "display", "block");
    			set_style(textarea4, "height", "150px");
    			attr_dev(textarea4, "data-bind", "value: notaMedica.observaciones");
    			attr_dev(textarea4, "rows", "3");
    			add_location(textarea4, file$i, 304, 24, 18631);
    			attr_dev(div95, "class", "card-body");
    			add_location(div95, file$i, 303, 20, 18582);
    			attr_dev(div96, "class", "card m-b-20 margen-mobile autosave");
    			add_location(div96, file$i, 299, 16, 18368);
    			attr_dev(div97, "class", "card-title");
    			add_location(div97, file$i, 313, 32, 19053);
    			attr_dev(div98, "class", "card-header");
    			add_location(div98, file$i, 312, 28, 18994);
    			option5.__value = "";
    			option5.value = option5.__value;
    			add_location(option5, file$i, 320, 40, 19556);
    			option6.__value = "Favorable o Bueno";
    			option6.value = option6.__value;
    			add_location(option6, file$i, 321, 40, 19639);
    			option7.__value = "Moderado o Intermedio";
    			option7.value = option7.__value;
    			add_location(option7, file$i, 322, 40, 19741);
    			option8.__value = "Grave";
    			option8.value = option8.__value;
    			add_location(option8, file$i, 323, 40, 19851);
    			option9.__value = "Reservado";
    			option9.value = option9.__value;
    			add_location(option9, file$i, 324, 40, 19929);
    			attr_dev(select2, "name", "");
    			attr_dev(select2, "class", "form-control form-control-lg");
    			attr_dev(select2, "data-bind", "options: pronosticos, \r\n                                        value: notaMedica.pronostico, \r\n                                        optionsCaption : '- Seleccionar -'");
    			add_location(select2, file$i, 317, 36, 19278);
    			attr_dev(div99, "class", "form-group");
    			add_location(div99, file$i, 316, 32, 19216);
    			attr_dev(div100, "class", "card-body");
    			add_location(div100, file$i, 315, 28, 19159);
    			attr_dev(div101, "class", "card m-b-20");
    			add_location(div101, file$i, 311, 24, 18939);
    			attr_dev(div102, "class", "col-lg-6");
    			add_location(div102, file$i, 310, 20, 18891);
    			attr_dev(div103, "class", "card-title");
    			add_location(div103, file$i, 334, 32, 20342);
    			attr_dev(div104, "class", "card-header");
    			add_location(div104, file$i, 333, 28, 20283);
    			attr_dev(label9, "for", "");
    			add_location(label9, file$i, 339, 40, 20668);
    			attr_dev(input11, "type", "date");
    			attr_dev(input11, "class", "form-control");
    			attr_dev(input11, "data-bind", "value: notaMedica.fecha");
    			attr_dev(input11, "placeholder", "Fecha");
    			add_location(input11, file$i, 340, 40, 20737);
    			attr_dev(div105, "class", "form-group floating-label col-md-6 show-label");
    			add_location(div105, file$i, 338, 36, 20567);
    			attr_dev(label10, "for", "");
    			add_location(label10, file$i, 343, 40, 21016);
    			attr_dev(input12, "type", "time");
    			attr_dev(input12, "placeholder", "Hora");
    			attr_dev(input12, "class", "form-control");
    			attr_dev(input12, "max", "23:59:59");
    			attr_dev(input12, "data-bind", "value: notaMedica.hora");
    			add_location(input12, file$i, 344, 40, 21084);
    			attr_dev(div106, "class", "form-group floating-label col-md-6 show-label");
    			add_location(div106, file$i, 342, 36, 20915);
    			attr_dev(div107, "class", "form-row");
    			add_location(div107, file$i, 337, 32, 20507);
    			attr_dev(div108, "class", "card-body");
    			add_location(div108, file$i, 336, 28, 20450);
    			attr_dev(div109, "class", "card m-b-20");
    			add_location(div109, file$i, 332, 24, 20228);
    			attr_dev(div110, "class", "col-lg-6");
    			add_location(div110, file$i, 331, 20, 20180);
    			attr_dev(div111, "class", "card-title");
    			add_location(div111, file$i, 354, 32, 21597);
    			attr_dev(div112, "class", "card-header");
    			add_location(div112, file$i, 353, 28, 21538);
    			option10.__value = "2";
    			option10.value = option10.__value;
    			attr_dev(option10, "data-select2-id", "1009");
    			add_location(option10, file$i, 359, 36, 22048);
    			option11.__value = "3";
    			option11.value = option11.__value;
    			attr_dev(option11, "data-select2-id", "1010");
    			add_location(option11, file$i, 360, 36, 22153);
    			option12.__value = "5";
    			option12.value = option12.__value;
    			attr_dev(option12, "data-select2-id", "1011");
    			add_location(option12, file$i, 361, 36, 22255);
    			option13.__value = "8";
    			option13.value = option13.__value;
    			attr_dev(option13, "data-select2-id", "1012");
    			add_location(option13, file$i, 362, 36, 22358);
    			option14.__value = "9";
    			option14.value = option14.__value;
    			attr_dev(option14, "data-select2-id", "1013");
    			add_location(option14, file$i, 363, 36, 22471);
    			option15.__value = "10";
    			option15.value = option15.__value;
    			attr_dev(option15, "data-select2-id", "1014");
    			add_location(option15, file$i, 364, 36, 22573);
    			option16.__value = "11";
    			option16.value = option16.__value;
    			attr_dev(option16, "data-select2-id", "1015");
    			add_location(option16, file$i, 365, 36, 22677);
    			option17.__value = "12";
    			option17.value = option17.__value;
    			attr_dev(option17, "data-select2-id", "1016");
    			add_location(option17, file$i, 366, 36, 22781);
    			option18.__value = "13";
    			option18.value = option18.__value;
    			attr_dev(option18, "data-select2-id", "1017");
    			add_location(option18, file$i, 367, 36, 22884);
    			attr_dev(select3, "class", "form-control form-control-lg");
    			attr_dev(select3, "id", "sltEspecialistas");
    			set_style(select3, "width", "100%");
    			set_style(select3, "padding-top", "5px");
    			attr_dev(select3, "tabindex", "-1");
    			attr_dev(select3, "aria-hidden", "true");
    			select3.required = "";
    			attr_dev(select3, "data-select2-id", "sltEspecialistas");
    			add_location(select3, file$i, 358, 36, 21824);
    			attr_dev(div113, "class", "form-group");
    			add_location(div113, file$i, 357, 32, 21762);
    			attr_dev(div114, "class", "card-body");
    			add_location(div114, file$i, 356, 28, 21705);
    			attr_dev(div115, "class", "card m-b-20");
    			add_location(div115, file$i, 352, 24, 21483);
    			attr_dev(div116, "class", "col-lg-6");
    			attr_dev(div116, "data-bindx", "if: notaMedica.deOrden()");
    			add_location(div116, file$i, 351, 20, 21397);
    			attr_dev(div117, "class", "row");
    			add_location(div117, file$i, 308, 16, 18850);
    			attr_dev(div118, "class", "col-lg-12");
    			set_style(div118, "margin-top", "150px");
    			add_location(div118, file$i, 72, 12, 3754);
    			attr_dev(div119, "class", "container m-b-30");
    			add_location(div119, file$i, 71, 8, 3710);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$i, 70, 4, 3675);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asideatencion, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, h5);
    			append_dev(h5, span0);
    			append_dev(h5, t2);
    			append_dev(h5, span1);
    			append_dev(div6, t4);
    			append_dev(div6, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, i0);
    			append_dev(div1, t5);
    			append_dev(div1, i1);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, button0);
    			append_dev(button0, i2);
    			append_dev(button0, t8);
    			append_dev(button0, sapn0);
    			append_dev(div4, t10);
    			append_dev(div4, button1);
    			append_dev(button1, i3);
    			append_dev(button1, t11);
    			append_dev(button1, sapn1);
    			append_dev(div4, t13);
    			append_dev(div4, button2);
    			append_dev(button2, i4);
    			append_dev(button2, t14);
    			append_dev(button2, sapn2);
    			append_dev(div4, t16);
    			append_dev(div4, button3);
    			append_dev(button3, i5);
    			append_dev(button3, t17);
    			append_dev(button3, sapn3);
    			append_dev(div4, t19);
    			append_dev(div4, button4);
    			append_dev(button4, i6);
    			append_dev(button4, t20);
    			append_dev(button4, sapn4);
    			append_dev(div4, t22);
    			append_dev(div4, button5);
    			append_dev(button5, i7);
    			append_dev(button5, t23);
    			append_dev(button5, sapn5);
    			insert_dev(target, t25, anchor);
    			mount_component(header, target, anchor);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div119);
    			append_dev(div119, div118);
    			append_dev(div118, div11);
    			append_dev(div11, div9);
    			append_dev(div9, div8);
    			append_dev(div11, t28);
    			append_dev(div11, div10);
    			append_dev(div10, textarea0);
    			append_dev(div118, t29);
    			append_dev(div118, div15);
    			append_dev(div15, div13);
    			append_dev(div13, div12);
    			append_dev(div15, t31);
    			append_dev(div15, div14);
    			append_dev(div14, textarea1);
    			append_dev(div118, t32);
    			append_dev(div118, div19);
    			append_dev(div19, div17);
    			append_dev(div17, div16);
    			append_dev(div19, t34);
    			append_dev(div19, div18);
    			append_dev(div18, textarea2);
    			append_dev(div118, t35);
    			append_dev(div118, div42);
    			append_dev(div42, div21);
    			append_dev(div21, div20);
    			append_dev(div42, t37);
    			append_dev(div42, div41);
    			append_dev(div41, div40);
    			append_dev(div40, div26);
    			append_dev(div26, div25);
    			append_dev(div25, label0);
    			append_dev(label0, i8);
    			append_dev(label0, t38);
    			append_dev(div25, t39);
    			append_dev(div25, div24);
    			append_dev(div24, div22);
    			append_dev(div22, input0);
    			append_dev(div24, t40);
    			append_dev(div24, div23);
    			append_dev(div23, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(div40, t44);
    			append_dev(div40, div30);
    			append_dev(div30, div29);
    			append_dev(div29, label1);
    			append_dev(label1, i9);
    			append_dev(label1, t45);
    			append_dev(div29, t46);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, input1);
    			append_dev(div40, t47);
    			append_dev(div40, div34);
    			append_dev(div34, div33);
    			append_dev(div33, label2);
    			append_dev(label2, i10);
    			append_dev(label2, t48);
    			append_dev(div33, t49);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, input2);
    			append_dev(div40, t50);
    			append_dev(div40, div39);
    			append_dev(div39, div38);
    			append_dev(div38, label3);
    			append_dev(label3, i11);
    			append_dev(label3, t51);
    			append_dev(div38, t52);
    			append_dev(div38, div37);
    			append_dev(div37, div35);
    			append_dev(div35, input3);
    			append_dev(div37, t53);
    			append_dev(div37, div36);
    			append_dev(div36, input4);
    			append_dev(div118, t54);
    			append_dev(div118, div72);
    			append_dev(div72, div44);
    			append_dev(div44, div43);
    			append_dev(div72, t56);
    			append_dev(div72, div71);
    			append_dev(div71, div70);
    			append_dev(div70, div49);
    			append_dev(div49, div48);
    			append_dev(div48, label4);
    			append_dev(label4, i12);
    			append_dev(label4, t57);
    			append_dev(div48, t58);
    			append_dev(div48, div47);
    			append_dev(div47, div45);
    			append_dev(div45, input5);
    			append_dev(div47, t59);
    			append_dev(div47, div46);
    			append_dev(div46, select1);
    			append_dev(select1, option3);
    			append_dev(select1, option4);
    			append_dev(div70, t62);
    			append_dev(div70, div55);
    			append_dev(div55, div54);
    			append_dev(div54, label5);
    			append_dev(label5, i13);
    			append_dev(label5, t63);
    			append_dev(div54, t64);
    			append_dev(div54, div53);
    			append_dev(div53, div52);
    			append_dev(div52, div51);
    			append_dev(div51, input6);
    			append_dev(div51, t65);
    			append_dev(div51, div50);
    			append_dev(div50, span2);
    			append_dev(div70, t67);
    			append_dev(div70, div61);
    			append_dev(div61, div60);
    			append_dev(div60, label6);
    			append_dev(label6, i14);
    			append_dev(label6, t68);
    			append_dev(div60, t69);
    			append_dev(div60, div59);
    			append_dev(div59, div58);
    			append_dev(div58, div57);
    			append_dev(div57, input7);
    			append_dev(div57, t70);
    			append_dev(div57, div56);
    			append_dev(div56, span3);
    			append_dev(div70, t72);
    			append_dev(div70, div65);
    			append_dev(div65, div64);
    			append_dev(div64, label7);
    			append_dev(label7, i15);
    			append_dev(label7, t73);
    			append_dev(div64, t74);
    			append_dev(div64, div63);
    			append_dev(div63, div62);
    			append_dev(div62, input8);
    			append_dev(div70, t75);
    			append_dev(div70, div69);
    			append_dev(div69, div68);
    			append_dev(div68, label8);
    			append_dev(div68, t77);
    			append_dev(div68, div67);
    			append_dev(div67, div66);
    			append_dev(div66, input9);
    			append_dev(div118, t78);
    			append_dev(div118, div79);
    			append_dev(div79, div74);
    			append_dev(div74, div73);
    			append_dev(div79, t80);
    			append_dev(div79, div77);
    			append_dev(div77, div76);
    			append_dev(div76, a0);
    			append_dev(a0, i16);
    			append_dev(div76, t81);
    			append_dev(div76, div75);
    			append_dev(div75, button6);
    			append_dev(div75, t83);
    			append_dev(div75, button7);
    			append_dev(div75, t85);
    			append_dev(div75, button8);
    			append_dev(div79, t87);
    			append_dev(div79, div78);
    			append_dev(div78, textarea3);
    			append_dev(div118, t88);
    			append_dev(div118, div92);
    			append_dev(div92, div81);
    			append_dev(div81, div80);
    			append_dev(div92, t90);
    			append_dev(div92, div84);
    			append_dev(div84, div83);
    			append_dev(div83, a1);
    			append_dev(a1, i17);
    			append_dev(div83, t91);
    			append_dev(div83, div82);
    			append_dev(div82, button9);
    			append_dev(button9, i18);
    			append_dev(button9, t92);
    			append_dev(div92, t93);
    			append_dev(div92, div91);
    			append_dev(div91, div90);
    			append_dev(div90, div87);
    			append_dev(div87, div86);
    			append_dev(div86, input10);
    			append_dev(div86, t94);
    			append_dev(div86, ul0);
    			append_dev(ul0, div85);
    			append_dev(ul0, t95);
    			append_dev(ul0, li0);
    			append_dev(li0, a2);
    			append_dev(a2, i19);
    			append_dev(a2, t96);
    			append_dev(div90, t97);
    			append_dev(div90, div89);
    			append_dev(div89, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, span4);
    			append_dev(li1, t99);
    			append_dev(li1, span5);
    			append_dev(li1, t101);
    			append_dev(li1, div88);
    			append_dev(div88, a3);
    			append_dev(a3, i20);
    			append_dev(div88, t102);
    			append_dev(div88, a4);
    			append_dev(a4, i21);
    			append_dev(div118, t103);
    			mount_component(ordenesmedicas, div118, null);
    			append_dev(div118, t104);
    			append_dev(div118, div96);
    			append_dev(div96, div94);
    			append_dev(div94, div93);
    			append_dev(div96, t106);
    			append_dev(div96, div95);
    			append_dev(div95, textarea4);
    			append_dev(div118, t107);
    			append_dev(div118, div117);
    			append_dev(div117, div102);
    			append_dev(div102, div101);
    			append_dev(div101, div98);
    			append_dev(div98, div97);
    			append_dev(div101, t109);
    			append_dev(div101, div100);
    			append_dev(div100, div99);
    			append_dev(div99, select2);
    			append_dev(select2, option5);
    			append_dev(select2, option6);
    			append_dev(select2, option7);
    			append_dev(select2, option8);
    			append_dev(select2, option9);
    			append_dev(div117, t115);
    			append_dev(div117, div110);
    			append_dev(div110, div109);
    			append_dev(div109, div104);
    			append_dev(div104, div103);
    			append_dev(div109, t117);
    			append_dev(div109, div108);
    			append_dev(div108, div107);
    			append_dev(div107, div105);
    			append_dev(div105, label9);
    			append_dev(div105, t119);
    			append_dev(div105, input11);
    			append_dev(div107, t120);
    			append_dev(div107, div106);
    			append_dev(div106, label10);
    			append_dev(div106, t122);
    			append_dev(div106, input12);
    			append_dev(div117, t123);
    			append_dev(div117, div116);
    			append_dev(div116, div115);
    			append_dev(div115, div112);
    			append_dev(div112, div111);
    			append_dev(div115, t125);
    			append_dev(div115, div114);
    			append_dev(div114, div113);
    			append_dev(div113, select3);
    			append_dev(select3, option10);
    			append_dev(select3, option11);
    			append_dev(select3, option12);
    			append_dev(select3, option13);
    			append_dev(select3, option14);
    			append_dev(select3, option15);
    			append_dev(select3, option16);
    			append_dev(select3, option17);
    			append_dev(select3, option18);
    			insert_dev(target, t135, anchor);
    			mount_component(modaldatospaciente, target, anchor);
    			insert_dev(target, t136, anchor);
    			mount_component(modaltratamientos, target, anchor);
    			insert_dev(target, t137, anchor);
    			mount_component(modalinterconsulta, target, anchor);
    			insert_dev(target, t138, anchor);
    			mount_component(modalantecedentes, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asideatencion.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(ordenesmedicas.$$.fragment, local);
    			transition_in(modaldatospaciente.$$.fragment, local);
    			transition_in(modaltratamientos.$$.fragment, local);
    			transition_in(modalinterconsulta.$$.fragment, local);
    			transition_in(modalantecedentes.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asideatencion.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(ordenesmedicas.$$.fragment, local);
    			transition_out(modaldatospaciente.$$.fragment, local);
    			transition_out(modaltratamientos.$$.fragment, local);
    			transition_out(modalinterconsulta.$$.fragment, local);
    			transition_out(modalantecedentes.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asideatencion, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t25);
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t26);
    			if (detaching) detach_dev(main);
    			destroy_component(ordenesmedicas);
    			if (detaching) detach_dev(t135);
    			destroy_component(modaldatospaciente, detaching);
    			if (detaching) detach_dev(t136);
    			destroy_component(modaltratamientos, detaching);
    			if (detaching) detach_dev(t137);
    			destroy_component(modalinterconsulta, detaching);
    			if (detaching) detach_dev(t138);
    			destroy_component(modalantecedentes, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("HistoriaClinica", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HistoriaClinica> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		link,
    		Header,
    		AsideAtencion,
    		ModalDatosPaciente,
    		ModalTratamientos,
    		ModalInterconsulta,
    		ModalAntecedentes,
    		OrdenesMedicas
    	});

    	return [];
    }

    class HistoriaClinica extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HistoriaClinica",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src\componentes\ModalCrearNota.svelte generated by Svelte v3.29.0 */

    const file$j = "src\\componentes\\ModalCrearNota.svelte";

    function create_fragment$k(ctx) {
    	let div6;
    	let div5;
    	let div4;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span0;
    	let t3;
    	let div2;
    	let div1;
    	let label0;
    	let input0;
    	let t4;
    	let span1;
    	let t5;
    	let span2;
    	let t7;
    	let label1;
    	let input1;
    	let t8;
    	let span3;
    	let t9;
    	let span4;
    	let t11;
    	let div3;
    	let button1;
    	let t13;
    	let button2;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Crear nota médica";
    			t1 = space();
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t4 = space();
    			span1 = element("span");
    			t5 = space();
    			span2 = element("span");
    			span2.textContent = "Nota de Evolución";
    			t7 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t8 = space();
    			span3 = element("span");
    			t9 = space();
    			span4 = element("span");
    			span4.textContent = "Nota de Egreso";
    			t11 = space();
    			div3 = element("div");
    			button1 = element("button");
    			button1.textContent = "Cancelar";
    			t13 = space();
    			button2 = element("button");
    			button2.textContent = "Crear";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "exampleModalLabel");
    			add_location(h5, file$j, 4, 16, 351);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$j, 6, 20, 536);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$j, 5, 16, 438);
    			attr_dev(div0, "class", "modal-header");
    			set_style(div0, "border-bottom", "none");
    			add_location(div0, file$j, 3, 12, 278);
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "name", "TipoNota");
    			input0.value = "NE";
    			input0.checked = "";
    			attr_dev(input0, "data-bind", "checked: tipoNotaSeleccionado");
    			attr_dev(input0, "class", "cstm-switch-input");
    			add_location(input0, file$j, 12, 24, 823);
    			attr_dev(span1, "class", "cstm-switch-indicator ");
    			add_location(span1, file$j, 13, 24, 975);
    			attr_dev(span2, "class", "cstm-switch-description");
    			add_location(span2, file$j, 14, 24, 1045);
    			attr_dev(label0, "class", "cstm-switch mr-3");
    			add_location(label0, file$j, 11, 20, 765);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "name", "TipoNota");
    			input1.value = "EG";
    			attr_dev(input1, "data-bind", "checked: tipoNotaSeleccionado");
    			attr_dev(input1, "class", "cstm-switch-input");
    			add_location(input1, file$j, 17, 24, 1213);
    			attr_dev(span3, "class", "cstm-switch-indicator ");
    			add_location(span3, file$j, 18, 24, 1354);
    			attr_dev(span4, "class", "cstm-switch-description");
    			add_location(span4, file$j, 19, 24, 1424);
    			attr_dev(label1, "class", "cstm-switch");
    			add_location(label1, file$j, 16, 20, 1160);
    			attr_dev(div1, "class", "m-b-10 mt-2");
    			set_style(div1, "text-align", "center");
    			add_location(div1, file$j, 10, 16, 690);
    			attr_dev(div2, "class", "modal-body");
    			attr_dev(div2, "id", "divNuevaNota");
    			add_location(div2, file$j, 9, 12, 630);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$j, 24, 16, 1642);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "data-bind", "click: crearNota");
    			attr_dev(button2, "class", "btn btn-primary");
    			add_location(button2, file$j, 27, 16, 1786);
    			attr_dev(div3, "class", "modal-footer");
    			set_style(div3, "border-top", "none");
    			add_location(div3, file$j, 23, 12, 1572);
    			attr_dev(div4, "class", "modal-content");
    			add_location(div4, file$j, 2, 8, 237);
    			attr_dev(div5, "class", "modal-dialog  modal-dialog-align-top-left");
    			attr_dev(div5, "role", "document");
    			add_location(div5, file$j, 1, 4, 156);
    			attr_dev(div6, "class", "modal fade");
    			attr_dev(div6, "id", "modalNuevaNota");
    			attr_dev(div6, "tabindex", "-1");
    			attr_dev(div6, "role", "dialog");
    			attr_dev(div6, "aria-labelledby", "exampleModalLabel");
    			set_style(div6, "display", "none");
    			attr_dev(div6, "aria-hidden", "true");
    			add_location(div6, file$j, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span0);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div2, div1);
    			append_dev(div1, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t4);
    			append_dev(label0, span1);
    			append_dev(label0, t5);
    			append_dev(label0, span2);
    			append_dev(div1, t7);
    			append_dev(div1, label1);
    			append_dev(label1, input1);
    			append_dev(label1, t8);
    			append_dev(label1, span3);
    			append_dev(label1, t9);
    			append_dev(label1, span4);
    			append_dev(div4, t11);
    			append_dev(div4, div3);
    			append_dev(div3, button1);
    			append_dev(div3, t13);
    			append_dev(div3, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalCrearNota", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalCrearNota> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalCrearNota extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalCrearNota",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src\Pages\AtencionMedica\NotasMedicas.svelte generated by Svelte v3.29.0 */
    const file$k = "src\\Pages\\AtencionMedica\\NotasMedicas.svelte";

    function create_fragment$l(ctx) {
    	let asideatencion;
    	let t0;
    	let div5;
    	let div4;
    	let div0;
    	let h5;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let div1;
    	let t5;
    	let div3;
    	let div2;
    	let button;
    	let i0;
    	let t6;
    	let sapn;
    	let t8;
    	let header;
    	let t9;
    	let main;
    	let div17;
    	let div14;
    	let div13;
    	let div12;
    	let div9;
    	let div8;
    	let input0;
    	let t10;
    	let div7;
    	let div6;
    	let span2;
    	let t11;
    	let div10;
    	let label;
    	let input1;
    	let t12;
    	let span3;
    	let t13;
    	let span4;
    	let t15;
    	let div11;
    	let a;
    	let i1;
    	let t16;
    	let t17;
    	let div16;
    	let div15;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t19;
    	let th1;
    	let t21;
    	let th2;
    	let t23;
    	let th3;
    	let t24;
    	let tbody;
    	let t25;
    	let modaldatospaciente;
    	let t26;
    	let modalcrearnota;
    	let current;
    	asideatencion = new AsideAtencion({ $$inline: true });
    	header = new Header({ $$inline: true });
    	modaldatospaciente = new ModalDatosPaciente({ $$inline: true });
    	modalcrearnota = new ModalCrearNota({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asideatencion.$$.fragment);
    			t0 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			span0 = element("span");
    			span0.textContent = "Resumen general";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "Fiordaliza\r\n                        De Jesus Herrera";
    			t4 = space();
    			div1 = element("div");
    			t5 = space();
    			div3 = element("div");
    			div2 = element("div");
    			button = element("button");
    			i0 = element("i");
    			t6 = space();
    			sapn = element("sapn");
    			sapn.textContent = "Datos del Paciente";
    			t8 = space();
    			create_component(header.$$.fragment);
    			t9 = space();
    			main = element("main");
    			div17 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			input0 = element("input");
    			t10 = space();
    			div7 = element("div");
    			div6 = element("div");
    			span2 = element("span");
    			t11 = space();
    			div10 = element("div");
    			label = element("label");
    			input1 = element("input");
    			t12 = space();
    			span3 = element("span");
    			t13 = space();
    			span4 = element("span");
    			span4.textContent = "Solo mis notas";
    			t15 = space();
    			div11 = element("div");
    			a = element("a");
    			i1 = element("i");
    			t16 = text(" NUEVA NOTA");
    			t17 = space();
    			div16 = element("div");
    			div15 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Especialista";
    			t19 = space();
    			th1 = element("th");
    			th1.textContent = "Tipo de nota";
    			t21 = space();
    			th2 = element("th");
    			th2.textContent = "Fecha";
    			t23 = space();
    			th3 = element("th");
    			t24 = space();
    			tbody = element("tbody");
    			t25 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			t26 = space();
    			create_component(modalcrearnota.$$.fragment);
    			attr_dev(span0, "class", "badge badge-primary");
    			attr_dev(span0, "data-bind", "text: titulo");
    			add_location(span0, file$k, 13, 20, 528);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$k, 16, 20, 681);
    			add_location(h5, file$k, 12, 16, 502);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$k, 11, 12, 462);
    			attr_dev(div1, "class", "col-md-6");
    			set_style(div1, "text-align", "right");
    			add_location(div1, file$k, 20, 12, 850);
    			attr_dev(i0, "data-bind", "class: icon");
    			attr_dev(i0, "class", "mdi mdi-comment-eye");
    			add_location(i0, file$k, 26, 24, 1176);
    			attr_dev(sapn, "data-bind", "text: text");
    			add_location(sapn, file$k, 27, 28, 1263);
    			attr_dev(button, "data-toggle", "modal");
    			attr_dev(button, "data-target", "#modalDatosPersonales");
    			set_style(button, "box-shadow", "none");
    			attr_dev(button, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button, file$k, 25, 20, 1020);
    			attr_dev(div2, "class", "dropdown");
    			add_location(div2, file$k, 24, 16, 976);
    			attr_dev(div3, "class", "col-lg-12");
    			add_location(div3, file$k, 23, 12, 935);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$k, 10, 8, 431);
    			attr_dev(div5, "class", "contenedor-datos");
    			attr_dev(div5, "id", "divHeaderBar");
    			add_location(div5, file$k, 9, 4, 373);
    			attr_dev(input0, "data-bind", "textInput: busqueda");
    			attr_dev(input0, "type", "search");
    			attr_dev(input0, "class", "form-control form-control-appended");
    			attr_dev(input0, "placeholder", "Buscar por medico");
    			add_location(input0, file$k, 44, 32, 1838);
    			attr_dev(span2, "class", "mdi mdi-magnify");
    			add_location(span2, file$k, 47, 40, 2142);
    			attr_dev(div6, "class", "input-group-text");
    			add_location(div6, file$k, 46, 36, 2070);
    			attr_dev(div7, "class", "input-group-append");
    			add_location(div7, file$k, 45, 32, 2000);
    			attr_dev(div8, "class", "input-group input-group-flush mb-3");
    			add_location(div8, file$k, 43, 28, 1756);
    			attr_dev(div9, "class", "col-lg-5 col-md-4");
    			add_location(div9, file$k, 42, 24, 1695);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "name", "option");
    			attr_dev(input1, "data-bind", "checked: filtrar");
    			attr_dev(input1, "class", "cstm-switch-input");
    			add_location(input1, file$k, 54, 32, 2487);
    			attr_dev(span3, "class", "cstm-switch-indicator");
    			add_location(span3, file$k, 55, 32, 2613);
    			attr_dev(span4, "class", "cstm-switch-description");
    			add_location(span4, file$k, 56, 32, 2690);
    			attr_dev(label, "class", "cstm-switch");
    			add_location(label, file$k, 53, 28, 2426);
    			attr_dev(div10, "class", "mt-md-2 col-lg-2 col-md-4");
    			add_location(div10, file$k, 52, 24, 2357);
    			attr_dev(i1, "class", "mdi mdi-plus");
    			add_location(i1, file$k, 60, 162, 3032);
    			attr_dev(a, "href", "#!");
    			attr_dev(a, "type", "button");
    			set_style(a, "height", "35px", 1);
    			attr_dev(a, "data-toggle", "modal");
    			attr_dev(a, "data-target", "#modalNuevaNota");
    			attr_dev(a, "class", "btn btn-primary");
    			add_location(a, file$k, 60, 28, 2898);
    			attr_dev(div11, "class", "col-lg-4");
    			add_location(div11, file$k, 59, 24, 2846);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$k, 41, 20, 1652);
    			attr_dev(div13, "class", "m-3 col-md-12");
    			add_location(div13, file$k, 40, 16, 1603);
    			attr_dev(div14, "class", "row");
    			add_location(div14, file$k, 39, 12, 1568);
    			add_location(th0, file$k, 72, 32, 3478);
    			add_location(th1, file$k, 73, 32, 3533);
    			add_location(th2, file$k, 74, 32, 3588);
    			add_location(th3, file$k, 75, 32, 3636);
    			add_location(tr, file$k, 71, 28, 3440);
    			add_location(thead, file$k, 70, 24, 3403);
    			attr_dev(tbody, "data-bind", "foreach: notasFiltradas");
    			add_location(tbody, file$k, 78, 24, 3740);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$k, 69, 20, 3329);
    			attr_dev(div15, "class", "table-responsive");
    			add_location(div15, file$k, 68, 16, 3277);
    			attr_dev(div16, "class", "col-md-12 m-b-30");
    			add_location(div16, file$k, 67, 12, 3229);
    			set_style(div17, "margin-top", "100px");
    			add_location(div17, file$k, 38, 8, 1523);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$k, 37, 4, 1488);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asideatencion, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, h5);
    			append_dev(h5, span0);
    			append_dev(h5, t2);
    			append_dev(h5, span1);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    			append_dev(button, i0);
    			append_dev(button, t6);
    			append_dev(button, sapn);
    			insert_dev(target, t8, anchor);
    			mount_component(header, target, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div17);
    			append_dev(div17, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div9);
    			append_dev(div9, div8);
    			append_dev(div8, input0);
    			append_dev(div8, t10);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, span2);
    			append_dev(div12, t11);
    			append_dev(div12, div10);
    			append_dev(div10, label);
    			append_dev(label, input1);
    			append_dev(label, t12);
    			append_dev(label, span3);
    			append_dev(label, t13);
    			append_dev(label, span4);
    			append_dev(div12, t15);
    			append_dev(div12, div11);
    			append_dev(div11, a);
    			append_dev(a, i1);
    			append_dev(a, t16);
    			append_dev(div17, t17);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t19);
    			append_dev(tr, th1);
    			append_dev(tr, t21);
    			append_dev(tr, th2);
    			append_dev(tr, t23);
    			append_dev(tr, th3);
    			append_dev(table, t24);
    			append_dev(table, tbody);
    			insert_dev(target, t25, anchor);
    			mount_component(modaldatospaciente, target, anchor);
    			insert_dev(target, t26, anchor);
    			mount_component(modalcrearnota, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asideatencion.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(modaldatospaciente.$$.fragment, local);
    			transition_in(modalcrearnota.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asideatencion.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(modaldatospaciente.$$.fragment, local);
    			transition_out(modalcrearnota.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asideatencion, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t8);
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t25);
    			destroy_component(modaldatospaciente, detaching);
    			if (detaching) detach_dev(t26);
    			destroy_component(modalcrearnota, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NotasMedicas", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotasMedicas> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		link,
    		Header,
    		AsideAtencion,
    		ModalDatosPaciente,
    		ModalCrearNota
    	});

    	return [];
    }

    class NotasMedicas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotasMedicas",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src\Pages\AtencionMedica\Atenciones.svelte generated by Svelte v3.29.0 */
    const file$l = "src\\Pages\\AtencionMedica\\Atenciones.svelte";

    function create_fragment$m(ctx) {
    	let aside;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div18;
    	let h4;
    	let t3;
    	let div17;
    	let div0;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t7;
    	let div1;
    	let label0;
    	let input0;
    	let t8;
    	let span0;
    	let t9;
    	let span1;
    	let t11;
    	let div6;
    	let div5;
    	let input1;
    	let t12;
    	let div4;
    	let div2;
    	let span2;
    	let t13;
    	let div3;
    	let span3;
    	let t14;
    	let a0;
    	let i0;
    	let t15;
    	let t16;
    	let div16;
    	let div15;
    	let div14;
    	let div13;
    	let div7;
    	let label1;
    	let t18;
    	let input2;
    	let t19;
    	let div8;
    	let label2;
    	let t21;
    	let input3;
    	let t22;
    	let div12;
    	let div9;
    	let input4;
    	let t23;
    	let label3;
    	let span5;
    	let span4;
    	let t25;
    	let div10;
    	let input5;
    	let t26;
    	let label4;
    	let span7;
    	let span6;
    	let t28;
    	let div11;
    	let input6;
    	let t29;
    	let label5;
    	let span9;
    	let span8;
    	let t31;
    	let div23;
    	let div22;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t33;
    	let th1;
    	let t35;
    	let th2;
    	let t37;
    	let th3;
    	let t39;
    	let th4;
    	let t40;
    	let tbody;
    	let tr1;
    	let td0;
    	let div20;
    	let div19;
    	let span10;
    	let t42;
    	let span11;
    	let t44;
    	let td1;
    	let t46;
    	let td2;
    	let t48;
    	let td3;
    	let t50;
    	let td4;
    	let div21;
    	let a1;
    	let i1;
    	let current;
    	aside = new Aside({ $$inline: true });
    	header = new Header({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(aside.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div18 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Atenciones";
    			t3 = space();
    			div17 = element("div");
    			div0 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Ambulatorio";
    			option1 = element("option");
    			option1.textContent = "Emergencias";
    			option2 = element("option");
    			option2.textContent = "Hospiitalizaciones";
    			t7 = space();
    			div1 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t8 = space();
    			span0 = element("span");
    			t9 = space();
    			span1 = element("span");
    			span1.textContent = "Solo mis notas";
    			t11 = space();
    			div6 = element("div");
    			div5 = element("div");
    			input1 = element("input");
    			t12 = space();
    			div4 = element("div");
    			div2 = element("div");
    			span2 = element("span");
    			t13 = space();
    			div3 = element("div");
    			span3 = element("span");
    			t14 = space();
    			a0 = element("a");
    			i0 = element("i");
    			t15 = text(" Filtrar");
    			t16 = space();
    			div16 = element("div");
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div7 = element("div");
    			label1 = element("label");
    			label1.textContent = "Desde";
    			t18 = space();
    			input2 = element("input");
    			t19 = space();
    			div8 = element("div");
    			label2 = element("label");
    			label2.textContent = "Hasta";
    			t21 = space();
    			input3 = element("input");
    			t22 = space();
    			div12 = element("div");
    			div9 = element("div");
    			input4 = element("input");
    			t23 = space();
    			label3 = element("label");
    			span5 = element("span");
    			span4 = element("span");
    			span4.textContent = "Atenciones activas";
    			t25 = space();
    			div10 = element("div");
    			input5 = element("input");
    			t26 = space();
    			label4 = element("label");
    			span7 = element("span");
    			span6 = element("span");
    			span6.textContent = "Atenciones cerradas";
    			t28 = space();
    			div11 = element("div");
    			input6 = element("input");
    			t29 = space();
    			label5 = element("label");
    			span9 = element("span");
    			span8 = element("span");
    			span8.textContent = "Todas";
    			t31 = space();
    			div23 = element("div");
    			div22 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Paciente";
    			t33 = space();
    			th1 = element("th");
    			th1.textContent = "Edad";
    			t35 = space();
    			th2 = element("th");
    			th2.textContent = "Sexo";
    			t37 = space();
    			th3 = element("th");
    			th3.textContent = "Fecha de Ingreso";
    			t39 = space();
    			th4 = element("th");
    			t40 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			div20 = element("div");
    			div19 = element("div");
    			span10 = element("span");
    			span10.textContent = "FD";
    			t42 = space();
    			span11 = element("span");
    			span11.textContent = "Fiordaliza De Jesus";
    			t44 = space();
    			td1 = element("td");
    			td1.textContent = "49 años";
    			t46 = space();
    			td2 = element("td");
    			td2.textContent = "F";
    			t48 = space();
    			td3 = element("td");
    			td3.textContent = "4/5/2020 1:31:00 p. m.";
    			t50 = space();
    			td4 = element("td");
    			div21 = element("div");
    			a1 = element("a");
    			i1 = element("i");
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$l, 10, 12, 294);
    			option0.__value = "A";
    			option0.value = option0.__value;
    			add_location(option0, file$l, 17, 28, 721);
    			option1.__value = "E";
    			option1.value = option1.__value;
    			add_location(option1, file$l, 18, 28, 789);
    			option2.__value = "H";
    			option2.value = option2.__value;
    			add_location(option2, file$l, 19, 28, 857);
    			attr_dev(select, "class", "custom-select");
    			attr_dev(select, "title", "Tipo de Atención");
    			attr_dev(select, "data-bind", "options: $parent.tiposAtencion, \r\n                            optionsValue: 'id', \r\n                            optionsText: 'nombre', \r\n                            value: tipoAtencion");
    			add_location(select, file$l, 13, 24, 439);
    			attr_dev(div0, "class", "input-group col-md-3");
    			add_location(div0, file$l, 12, 20, 379);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "name", "option");
    			attr_dev(input0, "data-bind", "checked: filtrar");
    			attr_dev(input0, "class", "cstm-switch-input");
    			add_location(input0, file$l, 24, 28, 1109);
    			attr_dev(span0, "class", "cstm-switch-indicator");
    			add_location(span0, file$l, 25, 28, 1231);
    			attr_dev(span1, "class", "cstm-switch-description");
    			add_location(span1, file$l, 26, 28, 1304);
    			attr_dev(label0, "class", "cstm-switch");
    			add_location(label0, file$l, 23, 24, 1052);
    			attr_dev(div1, "class", "mt-md-2 col-lg-2 col-md-4");
    			add_location(div1, file$l, 22, 20, 987);
    			attr_dev(input1, "data-bind", "textInput: busqueda");
    			attr_dev(input1, "type", "search");
    			attr_dev(input1, "class", "form-control form-control-appended");
    			attr_dev(input1, "placeholder", "Buscar");
    			add_location(input1, file$l, 31, 28, 1574);
    			attr_dev(span2, "class", "mdi mdi-magnify");
    			add_location(span2, file$l, 34, 36, 1919);
    			attr_dev(div2, "class", "input-group-text");
    			attr_dev(div2, "data-bind", "class: ($root.estado() == 'loading') ? 'd-none': ''");
    			add_location(div2, file$l, 33, 32, 1787);
    			attr_dev(span3, "class", "mdi mdi-spin mdi-loading");
    			add_location(span3, file$l, 37, 36, 2169);
    			attr_dev(div3, "class", "input-group-text d-none");
    			attr_dev(div3, "data-bind", "class: ($root.estado() != 'loading') ? 'd-none': ''");
    			add_location(div3, file$l, 36, 32, 2030);
    			attr_dev(div4, "class", "input-group-append");
    			add_location(div4, file$l, 32, 28, 1721);
    			attr_dev(div5, "class", "input-group input-group-flush mb-3");
    			add_location(div5, file$l, 30, 24, 1496);
    			attr_dev(div6, "class", "col-md-5");
    			add_location(div6, file$l, 29, 20, 1448);
    			attr_dev(i0, "class", "mdi mdi-filter");
    			add_location(i0, file$l, 44, 24, 2584);
    			attr_dev(a0, "class", "btn ml-2 mr-2 ml-3 btn-primary");
    			set_style(a0, "height", "35px");
    			attr_dev(a0, "data-toggle", "collapse");
    			attr_dev(a0, "href", "#collapseExample");
    			attr_dev(a0, "role", "button");
    			attr_dev(a0, "aria-expanded", "false");
    			attr_dev(a0, "aria-controls", "collapseExample");
    			add_location(a0, file$l, 43, 20, 2379);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$l, 51, 40, 3046);
    			attr_dev(input2, "type", "date");
    			attr_dev(input2, "data-bind", "textInput: desde");
    			attr_dev(input2, "class", "form-control");
    			add_location(input2, file$l, 52, 40, 3115);
    			attr_dev(div7, "class", "form-group  col-lg-3");
    			add_location(div7, file$l, 50, 36, 2970);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$l, 55, 40, 3342);
    			attr_dev(input3, "type", "date");
    			attr_dev(input3, "data-bind", "textInput: hasta");
    			attr_dev(input3, "class", "form-control");
    			add_location(input3, file$l, 56, 40, 3411);
    			attr_dev(div8, "class", "form-group  col-lg-3");
    			add_location(div8, file$l, 54, 36, 3266);
    			attr_dev(input4, "id", "radio-new1");
    			attr_dev(input4, "name", "bigradios");
    			input4.value = "A";
    			attr_dev(input4, "data-bind", "checked: estado");
    			attr_dev(input4, "type", "radio");
    			add_location(input4, file$l, 60, 44, 3696);
    			attr_dev(span4, "class", "d-block");
    			add_location(span4, file$l, 63, 52, 3989);
    			attr_dev(span5, "class", "radio-content");
    			add_location(span5, file$l, 62, 48, 3907);
    			attr_dev(label3, "for", "radio-new1");
    			add_location(label3, file$l, 61, 44, 3833);
    			attr_dev(div9, "class", "option-box");
    			add_location(div9, file$l, 59, 40, 3626);
    			attr_dev(input5, "id", "radio-new2");
    			attr_dev(input5, "name", "bigradios");
    			input5.value = "E";
    			attr_dev(input5, "data-bind", "checked: estado");
    			attr_dev(input5, "type", "radio");
    			add_location(input5, file$l, 68, 44, 4312);
    			attr_dev(span6, "class", "d-block");
    			add_location(span6, file$l, 71, 52, 4605);
    			attr_dev(span7, "class", "radio-content");
    			add_location(span7, file$l, 70, 48, 4523);
    			attr_dev(label4, "for", "radio-new2");
    			add_location(label4, file$l, 69, 44, 4449);
    			attr_dev(div10, "class", "option-box ml-3");
    			add_location(div10, file$l, 67, 40, 4237);
    			attr_dev(input6, "id", "radio-new3");
    			attr_dev(input6, "name", "bigradios");
    			input6.value = "*";
    			attr_dev(input6, "data-bind", "checked: estado");
    			attr_dev(input6, "type", "radio");
    			add_location(input6, file$l, 76, 44, 4929);
    			attr_dev(span8, "class", "d-block");
    			add_location(span8, file$l, 79, 52, 5222);
    			attr_dev(span9, "class", "radio-content");
    			add_location(span9, file$l, 78, 48, 5140);
    			attr_dev(label5, "for", "radio-new3");
    			add_location(label5, file$l, 77, 44, 5066);
    			attr_dev(div11, "class", "option-box ml-3");
    			add_location(div11, file$l, 75, 40, 4854);
    			attr_dev(div12, "class", "col-lg-6");
    			add_location(div12, file$l, 58, 36, 3562);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$l, 49, 32, 2915);
    			attr_dev(div14, "class", "card card-body");
    			add_location(div14, file$l, 48, 28, 2853);
    			attr_dev(div15, "class", "collapse");
    			attr_dev(div15, "id", "collapseExample");
    			add_location(div15, file$l, 47, 24, 2780);
    			attr_dev(div16, "class", "col-lg-12");
    			set_style(div16, "padding-top", "0", 1);
    			set_style(div16, "margin-top", "0", 1);
    			add_location(div16, file$l, 46, 20, 2670);
    			attr_dev(div17, "class", "row");
    			add_location(div17, file$l, 11, 12, 340);
    			attr_dev(div18, "class", "mt-4 col-md-12");
    			attr_dev(div18, "data-bind", "using: filtro");
    			add_location(div18, file$l, 9, 8, 226);
    			add_location(th0, file$l, 96, 32, 5908);
    			add_location(th1, file$l, 97, 32, 5959);
    			add_location(th2, file$l, 98, 32, 6006);
    			add_location(th3, file$l, 99, 32, 6053);
    			add_location(th4, file$l, 100, 32, 6112);
    			add_location(tr0, file$l, 95, 28, 5870);
    			add_location(thead, file$l, 94, 24, 5833);
    			attr_dev(span10, "class", "avatar-title rounded-circle ");
    			attr_dev(span10, "data-bind", "text: nombres[0] + primerApellido[0]");
    			add_location(span10, file$l, 108, 44, 6529);
    			attr_dev(div19, "class", "avatar avatar-sm");
    			add_location(div19, file$l, 107, 40, 6453);
    			attr_dev(div20, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div20, file$l, 106, 36, 6365);
    			attr_dev(span11, "data-bind", "text: nombres + ' ' + primerApellido");
    			add_location(span11, file$l, 111, 43, 6729);
    			add_location(td0, file$l, 105, 32, 6323);
    			attr_dev(td1, "data-bind", "text: edad");
    			add_location(td1, file$l, 113, 32, 6883);
    			attr_dev(td2, "data-bind", "text: sexo");
    			add_location(td2, file$l, 114, 32, 6956);
    			attr_dev(td3, "data-bind", "text: new Date(fechaIngreso).toLocaleString('es-Do')");
    			add_location(td3, file$l, 115, 32, 7023);
    			attr_dev(i1, "class", " mdi-24px mdi mdi-open-in-new");
    			add_location(i1, file$l, 119, 189, 7467);
    			attr_dev(a1, "data-target", "#modalNuevaAtencion");
    			attr_dev(a1, "data-placement", "top");
    			attr_dev(a1, "title", "Iniciar consulta");
    			attr_dev(a1, "class", "icon-table");
    			attr_dev(a1, "href", "/AtencionMedica/Trabajar/1#resumen-page");
    			add_location(a1, file$l, 119, 40, 7318);
    			set_style(div21, "width", "150px");
    			attr_dev(div21, "class", "ml-auto");
    			add_location(div21, file$l, 118, 36, 7233);
    			set_style(td4, "text-align", "right");
    			add_location(td4, file$l, 117, 32, 7164);
    			add_location(tr1, file$l, 104, 28, 6285);
    			attr_dev(tbody, "data-bind", "foreach: atenciones");
    			add_location(tbody, file$l, 103, 24, 6216);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$l, 93, 20, 5759);
    			attr_dev(div22, "class", "table-responsive");
    			add_location(div22, file$l, 92, 16, 5707);
    			attr_dev(div23, "class", "col-md-12 m-b-30");
    			add_location(div23, file$l, 91, 12, 5659);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$l, 8, 4, 185);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$l, 6, 0, 140);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(aside, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t1);
    			append_dev(main, section);
    			append_dev(section, div18);
    			append_dev(div18, h4);
    			append_dev(div18, t3);
    			append_dev(div18, div17);
    			append_dev(div17, div0);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(div17, t7);
    			append_dev(div17, div1);
    			append_dev(div1, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t8);
    			append_dev(label0, span0);
    			append_dev(label0, t9);
    			append_dev(label0, span1);
    			append_dev(div17, t11);
    			append_dev(div17, div6);
    			append_dev(div6, div5);
    			append_dev(div5, input1);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, span2);
    			append_dev(div4, t13);
    			append_dev(div4, div3);
    			append_dev(div3, span3);
    			append_dev(div17, t14);
    			append_dev(div17, a0);
    			append_dev(a0, i0);
    			append_dev(a0, t15);
    			append_dev(div17, t16);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div7);
    			append_dev(div7, label1);
    			append_dev(div7, t18);
    			append_dev(div7, input2);
    			append_dev(div13, t19);
    			append_dev(div13, div8);
    			append_dev(div8, label2);
    			append_dev(div8, t21);
    			append_dev(div8, input3);
    			append_dev(div13, t22);
    			append_dev(div13, div12);
    			append_dev(div12, div9);
    			append_dev(div9, input4);
    			append_dev(div9, t23);
    			append_dev(div9, label3);
    			append_dev(label3, span5);
    			append_dev(span5, span4);
    			append_dev(div12, t25);
    			append_dev(div12, div10);
    			append_dev(div10, input5);
    			append_dev(div10, t26);
    			append_dev(div10, label4);
    			append_dev(label4, span7);
    			append_dev(span7, span6);
    			append_dev(div12, t28);
    			append_dev(div12, div11);
    			append_dev(div11, input6);
    			append_dev(div11, t29);
    			append_dev(div11, label5);
    			append_dev(label5, span9);
    			append_dev(span9, span8);
    			append_dev(section, t31);
    			append_dev(section, div23);
    			append_dev(div23, div22);
    			append_dev(div22, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t33);
    			append_dev(tr0, th1);
    			append_dev(tr0, t35);
    			append_dev(tr0, th2);
    			append_dev(tr0, t37);
    			append_dev(tr0, th3);
    			append_dev(tr0, t39);
    			append_dev(tr0, th4);
    			append_dev(table, t40);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(td0, div20);
    			append_dev(div20, div19);
    			append_dev(div19, span10);
    			append_dev(td0, t42);
    			append_dev(td0, span11);
    			append_dev(tr1, t44);
    			append_dev(tr1, td1);
    			append_dev(tr1, t46);
    			append_dev(tr1, td2);
    			append_dev(tr1, t48);
    			append_dev(tr1, td3);
    			append_dev(tr1, t50);
    			append_dev(tr1, td4);
    			append_dev(td4, div21);
    			append_dev(div21, a1);
    			append_dev(a1, i1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(aside.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(aside.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(aside, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Atenciones", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Atenciones> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Aside });
    	return [];
    }

    class Atenciones extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Atenciones",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src\Layout\AsideAdministracion.svelte generated by Svelte v3.29.0 */
    const file$m = "src\\Layout\\AsideAdministracion.svelte";

    function create_fragment$n(ctx) {
    	let aside;
    	let div1;
    	let span0;
    	let a0;
    	let link_action;
    	let t1;
    	let div0;
    	let a1;
    	let t2;
    	let a2;
    	let t3;
    	let div2;
    	let ul;
    	let li0;
    	let a3;
    	let span2;
    	let span1;
    	let t5;
    	let span4;
    	let span3;
    	let t7;
    	let i0;
    	let link_action_1;
    	let active_action;
    	let t8;
    	let li1;
    	let a4;
    	let span6;
    	let span5;
    	let t10;
    	let span7;
    	let i1;
    	let link_action_2;
    	let active_action_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			aside = element("aside");
    			div1 = element("div");
    			span0 = element("span");
    			a0 = element("a");
    			a0.textContent = "xmedical";
    			t1 = space();
    			div0 = element("div");
    			a1 = element("a");
    			t2 = space();
    			a2 = element("a");
    			t3 = space();
    			div2 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a3 = element("a");
    			span2 = element("span");
    			span1 = element("span");
    			span1.textContent = "IR A INICIO";
    			t5 = space();
    			span4 = element("span");
    			span3 = element("span");
    			span3.textContent = "1";
    			t7 = space();
    			i0 = element("i");
    			t8 = space();
    			li1 = element("li");
    			a4 = element("a");
    			span6 = element("span");
    			span5 = element("span");
    			span5.textContent = "Usuarios";
    			t10 = space();
    			span7 = element("span");
    			i1 = element("i");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$m, 9, 8, 286);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$m, 8, 6, 242);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$m, 14, 8, 438);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$m, 18, 8, 611);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$m, 12, 6, 378);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$m, 6, 4, 163);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$m, 30, 14, 1041);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$m, 29, 12, 1000);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$m, 33, 14, 1158);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$m, 34, 14, 1238);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$m, 32, 12, 1118);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$m, 28, 10, 947);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$m, 27, 8, 867);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$m, 46, 14, 1624);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$m, 45, 12, 1583);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-clipboard-flow");
    			add_location(i1, file$m, 49, 14, 1738);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$m, 48, 12, 1698);
    			attr_dev(a4, "href", "/Usuario/Index");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$m, 44, 10, 1517);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$m, 43, 8, 1424);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$m, 25, 6, 807);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$m, 23, 4, 719);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$m, 5, 2, 128);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			append_dev(aside, div1);
    			append_dev(div1, span0);
    			append_dev(span0, a0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, a1);
    			append_dev(div0, t2);
    			append_dev(div0, a2);
    			append_dev(aside, t3);
    			append_dev(aside, div2);
    			append_dev(div2, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a3);
    			append_dev(a3, span2);
    			append_dev(span2, span1);
    			append_dev(a3, t5);
    			append_dev(a3, span4);
    			append_dev(span4, span3);
    			append_dev(span4, t7);
    			append_dev(span4, i0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, a4);
    			append_dev(a4, span6);
    			append_dev(span6, span5);
    			append_dev(a4, t10);
    			append_dev(a4, span7);
    			append_dev(span7, i1);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a3)),
    					action_destroyer(active_action = active.call(null, li0, { path: "/", className: "active" })),
    					action_destroyer(link_action_2 = link.call(null, a4)),
    					action_destroyer(active_action_1 = active.call(null, li1, {
    						path: "/Usuario/Index",
    						className: "active"
    					}))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AsideAdministracion", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AsideAdministracion> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, active });
    	return [];
    }

    class AsideAdministracion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AsideAdministracion",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* src\componentes\ModalCrearUsuarios.svelte generated by Svelte v3.29.0 */

    const file$n = "src\\componentes\\ModalCrearUsuarios.svelte";

    function create_fragment$o(ctx) {
    	let div19;
    	let div18;
    	let div17;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span0;
    	let t3;
    	let div16;
    	let form;
    	let input0;
    	let t4;
    	let div2;
    	let div1;
    	let label0;
    	let t6;
    	let input1;
    	let t7;
    	let div5;
    	let div3;
    	let label1;
    	let t9;
    	let input2;
    	let t10;
    	let div4;
    	let label2;
    	let t12;
    	let input3;
    	let t13;
    	let div7;
    	let div6;
    	let label3;
    	let t15;
    	let input4;
    	let t16;
    	let div12;
    	let div8;
    	let label4;
    	let t18;
    	let input5;
    	let t19;
    	let div9;
    	let label5;
    	let input6;
    	let t20;
    	let span1;
    	let t21;
    	let span2;
    	let t23;
    	let div10;
    	let label6;
    	let t25;
    	let input7;
    	let t26;
    	let div11;
    	let select;
    	let option;
    	let t27;
    	let div14;
    	let div13;
    	let label7;
    	let t29;
    	let textarea;
    	let t30;
    	let br;
    	let t31;
    	let div15;
    	let button1;
    	let t33;
    	let button2;

    	const block = {
    		c: function create() {
    			div19 = element("div");
    			div18 = element("div");
    			div17 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Usuario";
    			t1 = space();
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			div16 = element("div");
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			div2 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Nombre Completo";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div5 = element("div");
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Usuario";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div4 = element("div");
    			label2 = element("label");
    			label2.textContent = "Email";
    			t12 = space();
    			input3 = element("input");
    			t13 = space();
    			div7 = element("div");
    			div6 = element("div");
    			label3 = element("label");
    			label3.textContent = "Contraseña";
    			t15 = space();
    			input4 = element("input");
    			t16 = space();
    			div12 = element("div");
    			div8 = element("div");
    			label4 = element("label");
    			label4.textContent = "Telefono";
    			t18 = space();
    			input5 = element("input");
    			t19 = space();
    			div9 = element("div");
    			label5 = element("label");
    			input6 = element("input");
    			t20 = space();
    			span1 = element("span");
    			t21 = space();
    			span2 = element("span");
    			span2.textContent = "Es Medico";
    			t23 = space();
    			div10 = element("div");
    			label6 = element("label");
    			label6.textContent = "exequatur";
    			t25 = space();
    			input7 = element("input");
    			t26 = space();
    			div11 = element("div");
    			select = element("select");
    			option = element("option");
    			t27 = space();
    			div14 = element("div");
    			div13 = element("div");
    			label7 = element("label");
    			label7.textContent = "Observaciones";
    			t29 = space();
    			textarea = element("textarea");
    			t30 = space();
    			br = element("br");
    			t31 = space();
    			div15 = element("div");
    			button1 = element("button");
    			button1.textContent = "Cerrar";
    			t33 = space();
    			button2 = element("button");
    			button2.textContent = "Guardar";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "modalUsuarioLabel");
    			add_location(h5, file$n, 5, 16, 334);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$n, 8, 20, 562);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-bind", "click: nuevoUsuario");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$n, 6, 16, 411);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$n, 4, 12, 290);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "IdUser");
    			add_location(input0, file$n, 14, 20, 744);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$n, 17, 28, 913);
    			attr_dev(input1, "type", "name");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Ing. John Doe");
    			attr_dev(input1, "name", "Name");
    			attr_dev(input1, "maxlength", "200");
    			input1.required = "";
    			add_location(input1, file$n, 18, 28, 980);
    			attr_dev(div1, "class", "form-group col-md-12");
    			add_location(div1, file$n, 16, 24, 849);
    			attr_dev(div2, "class", "form-row");
    			add_location(div2, file$n, 15, 20, 801);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$n, 24, 28, 1315);
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "autocomplete", "off");
    			attr_dev(input2, "name", "UserName");
    			attr_dev(input2, "id", "");
    			attr_dev(input2, "maxlength", "100");
    			add_location(input2, file$n, 25, 28, 1374);
    			attr_dev(div3, "class", "form-group col-md-12");
    			add_location(div3, file$n, 23, 24, 1251);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$n, 29, 28, 1627);
    			attr_dev(input3, "type", "email");
    			input3.required = true;
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "placeholder", "usuario@correo.com");
    			attr_dev(input3, "autocomplete", "off");
    			attr_dev(input3, "name", "Email");
    			attr_dev(input3, "id", "txtCorreo");
    			attr_dev(input3, "maxlength", "100");
    			add_location(input3, file$n, 30, 28, 1684);
    			attr_dev(div4, "class", "form-group col-md-12");
    			add_location(div4, file$n, 28, 24, 1563);
    			attr_dev(div5, "class", "form-row");
    			add_location(div5, file$n, 22, 20, 1203);
    			attr_dev(label3, "for", "");
    			add_location(label3, file$n, 37, 28, 2090);
    			attr_dev(input4, "type", "password");
    			attr_dev(input4, "class", "form-control");
    			input4.required = true;
    			attr_dev(input4, "name", "PasswordHash");
    			attr_dev(input4, "maxlength", "50");
    			add_location(input4, file$n, 38, 28, 2159);
    			attr_dev(div6, "class", "form-group col-md-12");
    			add_location(div6, file$n, 36, 24, 2026);
    			attr_dev(div7, "class", "form-row");
    			add_location(div7, file$n, 35, 20, 1978);
    			attr_dev(label4, "for", "");
    			add_location(label4, file$n, 47, 28, 2512);
    			attr_dev(input5, "type", "text");
    			attr_dev(input5, "class", "form-control");
    			attr_dev(input5, "data-mask", "(000) 000-0000");
    			attr_dev(input5, "data-mask-clearifnotmatch", "true");
    			attr_dev(input5, "autocomplete", "off");
    			attr_dev(input5, "maxlength", "14");
    			attr_dev(input5, "placeholder", "(809) 000-0000");
    			attr_dev(input5, "name", "PhoneNumber");
    			attr_dev(input5, "id", "txtTelefono");
    			add_location(input5, file$n, 48, 28, 2572);
    			attr_dev(div8, "class", "form-group col-md-12");
    			add_location(div8, file$n, 46, 24, 2448);
    			attr_dev(input6, "type", "checkbox");
    			input6.value = "true";
    			attr_dev(input6, "name", "EsMedico");
    			attr_dev(input6, "class", "cstm-switch-input");
    			add_location(input6, file$n, 54, 32, 3020);
    			attr_dev(span1, "class", "cstm-switch-indicator ");
    			add_location(span1, file$n, 56, 32, 3169);
    			attr_dev(span2, "class", "cstm-switch-description");
    			add_location(span2, file$n, 57, 32, 3247);
    			attr_dev(label5, "class", "cstm-switch");
    			add_location(label5, file$n, 53, 28, 2959);
    			attr_dev(div9, "class", "form-group col-md-12");
    			add_location(div9, file$n, 52, 24, 2895);
    			attr_dev(label6, "for", "");
    			add_location(label6, file$n, 61, 28, 3462);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "pattern", "^[0-9]+$");
    			attr_dev(input7, "class", "form-control");
    			attr_dev(input7, "utocomplete", "off");
    			attr_dev(input7, "name", "Exequatur");
    			attr_dev(input7, "id", "txtTelefono");
    			add_location(input7, file$n, 62, 28, 3523);
    			attr_dev(div10, "class", "form-group col-md-12");
    			add_location(div10, file$n, 60, 24, 3398);
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file$n, 69, 32, 4036);
    			attr_dev(select, "name", "IdDepartamento");
    			attr_dev(select, "class", " js-select2 select2-hidden-accessible");
    			attr_dev(select, "id", "sltDepartamentos");
    			set_style(select, "width", "100%");
    			attr_dev(select, "aria-hidden", "true");
    			select.required = true;
    			add_location(select, file$n, 66, 28, 3789);
    			attr_dev(div11, "class", "form-group col-md-12");
    			add_location(div11, file$n, 65, 24, 3725);
    			attr_dev(div12, "class", "form-row");
    			add_location(div12, file$n, 45, 20, 2400);
    			attr_dev(label7, "for", "");
    			add_location(label7, file$n, 75, 28, 4295);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "Observaciones");
    			add_location(textarea, file$n, 76, 28, 4360);
    			attr_dev(div13, "class", "form-group col-md-12");
    			add_location(div13, file$n, 74, 24, 4231);
    			attr_dev(div14, "class", "form-row");
    			add_location(div14, file$n, 73, 20, 4183);
    			add_location(br, file$n, 81, 20, 4549);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$n, 83, 24, 4627);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "btn btn-success");
    			add_location(button2, file$n, 86, 24, 4793);
    			attr_dev(div15, "class", "modal-footer");
    			add_location(div15, file$n, 82, 20, 4575);
    			attr_dev(form, "id", "frmUsuario");
    			add_location(form, file$n, 13, 16, 700);
    			attr_dev(div16, "class", "modal-body");
    			add_location(div16, file$n, 11, 12, 656);
    			attr_dev(div17, "class", "modal-content");
    			add_location(div17, file$n, 3, 8, 249);
    			attr_dev(div18, "class", "modal-dialog");
    			attr_dev(div18, "role", "document");
    			add_location(div18, file$n, 2, 4, 197);
    			attr_dev(div19, "class", "modal fade modal-slide-right");
    			attr_dev(div19, "id", "modalUsuario");
    			attr_dev(div19, "tabindex", "-1");
    			attr_dev(div19, "role", "dialog");
    			attr_dev(div19, "aria-labelledby", "modalUsuarioLabel");
    			set_style(div19, "display", "none");
    			set_style(div19, "padding-right", "16px");
    			attr_dev(div19, "aria-modal", "true");
    			add_location(div19, file$n, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div19, anchor);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span0);
    			append_dev(div17, t3);
    			append_dev(div17, div16);
    			append_dev(div16, form);
    			append_dev(form, input0);
    			append_dev(form, t4);
    			append_dev(form, div2);
    			append_dev(div2, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			append_dev(form, t7);
    			append_dev(form, div5);
    			append_dev(div5, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t9);
    			append_dev(div3, input2);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(div4, label2);
    			append_dev(div4, t12);
    			append_dev(div4, input3);
    			append_dev(form, t13);
    			append_dev(form, div7);
    			append_dev(div7, div6);
    			append_dev(div6, label3);
    			append_dev(div6, t15);
    			append_dev(div6, input4);
    			append_dev(form, t16);
    			append_dev(form, div12);
    			append_dev(div12, div8);
    			append_dev(div8, label4);
    			append_dev(div8, t18);
    			append_dev(div8, input5);
    			append_dev(div12, t19);
    			append_dev(div12, div9);
    			append_dev(div9, label5);
    			append_dev(label5, input6);
    			append_dev(label5, t20);
    			append_dev(label5, span1);
    			append_dev(label5, t21);
    			append_dev(label5, span2);
    			append_dev(div12, t23);
    			append_dev(div12, div10);
    			append_dev(div10, label6);
    			append_dev(div10, t25);
    			append_dev(div10, input7);
    			append_dev(div12, t26);
    			append_dev(div12, div11);
    			append_dev(div11, select);
    			append_dev(select, option);
    			append_dev(form, t27);
    			append_dev(form, div14);
    			append_dev(div14, div13);
    			append_dev(div13, label7);
    			append_dev(div13, t29);
    			append_dev(div13, textarea);
    			append_dev(form, t30);
    			append_dev(form, br);
    			append_dev(form, t31);
    			append_dev(form, div15);
    			append_dev(div15, button1);
    			append_dev(div15, t33);
    			append_dev(div15, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div19);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalCrearUsuarios", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalCrearUsuarios> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalCrearUsuarios extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalCrearUsuarios",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* src\componentes\ModalRolesUsuario.svelte generated by Svelte v3.29.0 */

    const file$o = "src\\componentes\\ModalRolesUsuario.svelte";

    function create_fragment$p(ctx) {
    	let div7;
    	let div6;
    	let div5;
    	let div0;
    	let h5;
    	let t1;
    	let button;
    	let span0;
    	let t3;
    	let div4;
    	let form;
    	let input0;
    	let t4;
    	let p;
    	let span1;
    	let t6;
    	let div1;
    	let label0;
    	let t8;
    	let input1;
    	let t9;
    	let div3;
    	let div2;
    	let label1;
    	let span2;
    	let t10;
    	let a;
    	let i;
    	let t11;
    	let input2;
    	let t12;
    	let span3;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Roles";
    			t1 = space();
    			button = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			div4 = element("div");
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			p = element("p");
    			span1 = element("span");
    			span1.textContent = "-user name-";
    			t6 = space();
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Buscar";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			div3 = element("div");
    			div2 = element("div");
    			label1 = element("label");
    			span2 = element("span");
    			t10 = text("Administrador ");
    			a = element("a");
    			i = element("i");
    			t11 = space();
    			input2 = element("input");
    			t12 = space();
    			span3 = element("span");
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "modalRolesLabel");
    			add_location(h5, file$o, 5, 20, 350);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$o, 7, 24, 529);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$o, 6, 20, 427);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$o, 4, 16, 302);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "idPaciente");
    			input0.value = "";
    			add_location(input0, file$o, 13, 24, 721);
    			attr_dev(span1, "class", "badge badge-soft-primary");
    			set_style(span1, "font-size", "17px");
    			add_location(span1, file$o, 14, 27, 798);
    			add_location(p, file$o, 14, 24, 795);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$o, 17, 28, 1005);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Buscar roles");
    			add_location(input1, file$o, 18, 28, 1063);
    			attr_dev(div1, "class", "form-group floating-label");
    			add_location(div1, file$o, 16, 24, 936);
    			attr_dev(i, "class", "mdi-18px mdi mdi-information-outline");
    			add_location(i, file$o, 29, 61, 1889);
    			attr_dev(a, "href", "#!");
    			attr_dev(a, "data-toggle", "popover");
    			attr_dev(a, "title", "Informacion Administrador");
    			attr_dev(a, "data-trigger", "focus");
    			attr_dev(a, "data-placement", "bottom");
    			attr_dev(a, "data-content", "And here's some amazing content. It's very engaging. Right?");
    			attr_dev(a, "class", "icon-rol");
    			add_location(a, file$o, 25, 55, 1503);
    			attr_dev(span2, "class", "cstm-switch-description mr-auto bd-highlight");
    			add_location(span2, file$o, 24, 36, 1388);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "name", "option");
    			input2.value = "1";
    			attr_dev(input2, "class", "cstm-switch-input");
    			add_location(input2, file$o, 31, 36, 2039);
    			attr_dev(span3, "class", "cstm-switch-indicator bg-success bd-highlight");
    			add_location(span3, file$o, 34, 36, 2232);
    			attr_dev(label1, "class", "cstm-switch d-flex bd-highlight");
    			add_location(label1, file$o, 23, 32, 1303);
    			attr_dev(div2, "class", "lista-rol m-b-10");
    			add_location(div2, file$o, 22, 28, 1239);
    			attr_dev(div3, "class", "roles");
    			add_location(div3, file$o, 20, 24, 1188);
    			attr_dev(form, "id", "");
    			add_location(form, file$o, 12, 20, 683);
    			attr_dev(div4, "class", "modal-body");
    			add_location(div4, file$o, 10, 16, 635);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file$o, 3, 12, 257);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file$o, 2, 8, 201);
    			attr_dev(div7, "class", "modal fade modal-slide-right");
    			attr_dev(div7, "id", "modalRoles");
    			attr_dev(div7, "tabindex", "-1");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-labelledby", "modalRolesLabel");
    			set_style(div7, "display", "none");
    			set_style(div7, "padding-right", "16px");
    			attr_dev(div7, "aria-modal", "true");
    			add_location(div7, file$o, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, span0);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, form);
    			append_dev(form, input0);
    			append_dev(form, t4);
    			append_dev(form, p);
    			append_dev(p, span1);
    			append_dev(form, t6);
    			append_dev(form, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t8);
    			append_dev(div1, input1);
    			append_dev(form, t9);
    			append_dev(form, div3);
    			append_dev(div3, div2);
    			append_dev(div2, label1);
    			append_dev(label1, span2);
    			append_dev(span2, t10);
    			append_dev(span2, a);
    			append_dev(a, i);
    			append_dev(label1, t11);
    			append_dev(label1, input2);
    			append_dev(label1, t12);
    			append_dev(label1, span3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalRolesUsuario", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalRolesUsuario> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ModalRolesUsuario extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalRolesUsuario",
    			options,
    			id: create_fragment$p.name
    		});
    	}
    }

    /* src\Pages\Usuario\Index.svelte generated by Svelte v3.29.0 */
    const file$p = "src\\Pages\\Usuario\\Index.svelte";

    function create_fragment$q(ctx) {
    	let asideadministracion;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div13;
    	let div0;
    	let t2;
    	let h4;
    	let t4;
    	let div12;
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let input;
    	let t5;
    	let div2;
    	let div1;
    	let span0;
    	let t6;
    	let button;
    	let i0;
    	let t7;
    	let t8;
    	let div11;
    	let div10;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t10;
    	let th1;
    	let t12;
    	let th2;
    	let t13;
    	let tbody;
    	let tr1;
    	let td0;
    	let div8;
    	let div7;
    	let span1;
    	let t15;
    	let span2;
    	let t17;
    	let td1;
    	let t19;
    	let td2;
    	let div9;
    	let a0;
    	let i1;
    	let t20;
    	let a1;
    	let i2;
    	let t21;
    	let modalcrearusuarios;
    	let t22;
    	let modalrolesusuario;
    	let current;
    	asideadministracion = new AsideAdministracion({ $$inline: true });
    	header = new Header({ $$inline: true });
    	modalcrearusuarios = new ModalCrearUsuarios({ $$inline: true });
    	modalrolesusuario = new ModalRolesUsuario({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(asideadministracion.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div13 = element("div");
    			div0 = element("div");
    			t2 = space();
    			h4 = element("h4");
    			h4.textContent = "Usuarios";
    			t4 = space();
    			div12 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			input = element("input");
    			t5 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			t6 = space();
    			button = element("button");
    			i0 = element("i");
    			t7 = text(" Nuevo usuario");
    			t8 = space();
    			div11 = element("div");
    			div10 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Nombres";
    			t10 = space();
    			th1 = element("th");
    			th1.textContent = "Correo";
    			t12 = space();
    			th2 = element("th");
    			t13 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			div8 = element("div");
    			div7 = element("div");
    			span1 = element("span");
    			span1.textContent = "A";
    			t15 = space();
    			span2 = element("span");
    			span2.textContent = "Alfredo Joel Mena";
    			t17 = space();
    			td1 = element("td");
    			td1.textContent = "joel.mena@nxt-pro.com";
    			t19 = space();
    			td2 = element("td");
    			div9 = element("div");
    			a0 = element("a");
    			i1 = element("i");
    			t20 = space();
    			a1 = element("a");
    			i2 = element("i");
    			t21 = space();
    			create_component(modalcrearusuarios.$$.fragment);
    			t22 = space();
    			create_component(modalrolesusuario.$$.fragment);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$p, 13, 6, 455);
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$p, 14, 6, 482);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "class", "form-control form-control-appended");
    			attr_dev(input, "placeholder", "Buscar");
    			add_location(input, file$p, 20, 28, 759);
    			attr_dev(span0, "class", "mdi mdi-magnify");
    			add_location(span0, file$p, 23, 36, 1008);
    			attr_dev(div1, "class", "input-group-text");
    			add_location(div1, file$p, 22, 32, 940);
    			attr_dev(div2, "class", "input-group-append");
    			add_location(div2, file$p, 21, 28, 874);
    			attr_dev(div3, "class", "input-group input-group-flush mb-3");
    			add_location(div3, file$p, 19, 24, 681);
    			attr_dev(div4, "class", "col-md-5");
    			add_location(div4, file$p, 18, 20, 633);
    			attr_dev(i0, "class", "mdi mdi-account-plus");
    			add_location(i0, file$p, 28, 137, 1320);
    			attr_dev(button, "data-target", "#modalUsuario");
    			attr_dev(button, "data-toggle", "modal");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn  m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			add_location(button, file$p, 28, 20, 1203);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$p, 17, 16, 594);
    			attr_dev(div6, "class", "col-md-12");
    			add_location(div6, file$p, 16, 12, 553);
    			add_location(th0, file$p, 37, 32, 1708);
    			add_location(th1, file$p, 39, 32, 1817);
    			add_location(th2, file$p, 40, 32, 1866);
    			add_location(tr0, file$p, 36, 28, 1670);
    			add_location(thead, file$p, 35, 24, 1633);
    			attr_dev(span1, "class", "avatar-title rounded-circle ");
    			add_location(span1, file$p, 48, 44, 2252);
    			attr_dev(div7, "class", "avatar avatar-sm");
    			add_location(div7, file$p, 47, 40, 2176);
    			attr_dev(div8, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div8, file$p, 46, 36, 2088);
    			add_location(span2, file$p, 51, 43, 2403);
    			add_location(td0, file$p, 45, 32, 2046);
    			add_location(td1, file$p, 54, 32, 2586);
    			attr_dev(i1, "class", " mdi-24px mdi mdi-circle-edit-outline");
    			add_location(i1, file$p, 61, 218, 3280);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "data-toggle", "modal");
    			set_style(a0, "cursor", "pointer");
    			attr_dev(a0, "data-target", "#modalUsuario");
    			attr_dev(a0, "data-placement", "top");
    			attr_dev(a0, "data-original-title", "Modificar usuario");
    			attr_dev(a0, "class", "icon-table hover-cursor");
    			add_location(a0, file$p, 61, 40, 3102);
    			attr_dev(i2, "class", " mdi-24px mdi mdi-security");
    			add_location(i2, file$p, 62, 161, 3500);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "data-toggle", "modal");
    			attr_dev(a1, "data-target", "#modalRoles");
    			attr_dev(a1, "data-placement", "bottom");
    			attr_dev(a1, "title", "Asignar Roles");
    			attr_dev(a1, "class", "icon-rol");
    			add_location(a1, file$p, 62, 40, 3379);
    			set_style(div9, "width", "150px");
    			set_style(div9, "text-align", "right");
    			attr_dev(div9, "class", "ml-auto");
    			add_location(div9, file$p, 57, 36, 2699);
    			add_location(td2, file$p, 56, 32, 2657);
    			add_location(tr1, file$p, 44, 28, 2008);
    			add_location(tbody, file$p, 43, 24, 1970);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$p, 34, 20, 1559);
    			attr_dev(div10, "class", "table-responsive");
    			add_location(div10, file$p, 33, 16, 1507);
    			attr_dev(div11, "class", "col-md-12 m-b-30");
    			add_location(div11, file$p, 32, 12, 1459);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$p, 15, 8, 522);
    			attr_dev(div13, "class", "p-2");
    			add_location(div13, file$p, 12, 4, 430);
    			attr_dev(section, "class", "admin-content p-2");
    			add_location(section, file$p, 11, 2, 389);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$p, 9, 0, 346);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asideadministracion, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t1);
    			append_dev(main, section);
    			append_dev(section, div13);
    			append_dev(div13, div0);
    			append_dev(div13, t2);
    			append_dev(div13, h4);
    			append_dev(div13, t4);
    			append_dev(div13, div12);
    			append_dev(div12, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, input);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div5, t6);
    			append_dev(div5, button);
    			append_dev(button, i0);
    			append_dev(button, t7);
    			append_dev(div12, t8);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t10);
    			append_dev(tr0, th1);
    			append_dev(tr0, t12);
    			append_dev(tr0, th2);
    			append_dev(table, t13);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(td0, div8);
    			append_dev(div8, div7);
    			append_dev(div7, span1);
    			append_dev(td0, t15);
    			append_dev(td0, span2);
    			append_dev(tr1, t17);
    			append_dev(tr1, td1);
    			append_dev(tr1, t19);
    			append_dev(tr1, td2);
    			append_dev(td2, div9);
    			append_dev(div9, a0);
    			append_dev(a0, i1);
    			append_dev(div9, t20);
    			append_dev(div9, a1);
    			append_dev(a1, i2);
    			insert_dev(target, t21, anchor);
    			mount_component(modalcrearusuarios, target, anchor);
    			insert_dev(target, t22, anchor);
    			mount_component(modalrolesusuario, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asideadministracion.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(modalcrearusuarios.$$.fragment, local);
    			transition_in(modalrolesusuario.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asideadministracion.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(modalcrearusuarios.$$.fragment, local);
    			transition_out(modalrolesusuario.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asideadministracion, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			if (detaching) detach_dev(t21);
    			destroy_component(modalcrearusuarios, detaching);
    			if (detaching) detach_dev(t22);
    			destroy_component(modalrolesusuario, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Index", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		AsideAdministracion,
    		ModalCrearUsuarios,
    		ModalRolesUsuario
    	});

    	return [];
    }

    class Index$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$q.name
    		});
    	}
    }

    /* src\Pages\Home\Error404.svelte generated by Svelte v3.29.0 */

    const file$q = "src\\Pages\\Home\\Error404.svelte";

    function create_fragment$r(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "404";
    			add_location(h1, file$q, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Error404", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Error404> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Error404 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Error404",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    const routes = {
        "/": Index,
        "/Paciente/Index": Index$1,
        "/Paciente/Perfil": Perfil,
        "/Paciente/Editar": Editar,
        "/AtencionMedica/Interconsultas": Interconsultas,
        "/AtencionMedica/Atenciones": Atenciones,
        "/Usuario/Index": Index$2,
        "/AtencionMedica/Resumen": Resumen,
        "/AtencionMedica/EditarDatosAtencion": EditarDatosAtencion,
        "/AtencionMedica/HistoriaClinica": HistoriaClinica,
        "/AtencionMedica/NotasMedicas": NotasMedicas,
        "*": Error404
    };

    /* src\App.svelte generated by Svelte v3.29.0 */

    function create_fragment$s(ctx) {
    	let router;
    	let current;
    	router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router, routes });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    const app = new App({
    	target: document.getElementById("app"),
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
