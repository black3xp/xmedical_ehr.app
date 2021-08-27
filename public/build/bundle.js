
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
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

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.29.0 */

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

    /* src/componentes/OpcionMenu.svelte generated by Svelte v3.29.0 */
    const file = "src/componentes/OpcionMenu.svelte";

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
    			add_location(i, file, 14, 12, 357);
    			attr_dev(div0, "class", "icono");
    			add_location(div0, file, 13, 8, 325);
    			add_location(p, file, 17, 8, 441);
    			add_location(small, file, 18, 12, 476);
    			attr_dev(div1, "class", "info-menu");
    			add_location(div1, file, 16, 8, 409);
    			attr_dev(a, "href", a_href_value = /*opcion*/ ctx[1].url);
    			set_style(a, "display", "block");
    			add_location(a, file, 12, 8, 264);
    			attr_dev(div2, "class", "col-md-4 col-lg-3 p-3 hvr-underline-from-left svelte-1dowx5r");
    			add_location(div2, file, 11, 4, 196);
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

    /* src/Pages/Home/Index.svelte generated by Svelte v3.29.0 */
    const file$1 = "src/Pages/Home/Index.svelte";

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
    			add_location(h1, file$1, 30, 2, 878);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$1, 33, 6, 969);
    			attr_dev(div1, "class", "col-12 mt-4");
    			add_location(div1, file$1, 32, 4, 937);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$1, 31, 2, 915);
    			attr_dev(div3, "class", "menu mt-5 svelte-1tw44i");
    			add_location(div3, file$1, 29, 0, 852);
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

    /* src/Layout/Header.svelte generated by Svelte v3.29.0 */

    const file$2 = "src/Layout/Header.svelte";

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
    			t9 = text("\n                      All systems operational.");
    			t10 = space();
    			a5 = element("a");
    			div5 = element("div");
    			div4 = element("div");
    			i2 = element("i");
    			t11 = text("\n                      File upload successful.");
    			t12 = space();
    			a6 = element("a");
    			div7 = element("div");
    			div6 = element("div");
    			i3 = element("i");
    			t13 = text("\n                      Your holiday has been denied");
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
    			add_location(a0, file$2, 1, 4, 34);
    			attr_dev(i0, "class", "mdi mdi-24px mdi-bell-outline");
    			add_location(i0, file$2, 34, 14, 880);
    			attr_dev(span0, "class", "notification-counter");
    			add_location(span0, file$2, 35, 14, 938);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "data-toggle", "dropdown");
    			attr_dev(a1, "aria-haspopup", "true");
    			attr_dev(a1, "aria-expanded", "false");
    			add_location(a1, file$2, 28, 12, 699);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "mdi mdi-18px mdi-settings text-muted");
    			add_location(a2, file$2, 42, 16, 1219);
    			attr_dev(span1, "class", "h5 m-0");
    			add_location(span1, file$2, 45, 16, 1342);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "mdi mdi-18px mdi-notification-clear-all text-muted");
    			add_location(a3, file$2, 46, 16, 1400);
    			attr_dev(div0, "class", "d-flex p-all-15 bg-white justify-content-between\n                border-bottom ");
    			add_location(div0, file$2, 39, 14, 1093);
    			attr_dev(div1, "class", "text-overline m-b-5");
    			add_location(div1, file$2, 53, 16, 1657);
    			attr_dev(i1, "class", "mdi mdi-circle text-success");
    			add_location(i1, file$2, 57, 22, 1858);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$2, 56, 20, 1812);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$2, 55, 18, 1773);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "class", "d-block m-b-10");
    			add_location(a4, file$2, 54, 16, 1718);
    			attr_dev(i2, "class", "mdi mdi-upload-multiple ");
    			add_location(i2, file$2, 65, 22, 2176);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file$2, 64, 20, 2130);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file$2, 63, 18, 2091);
    			attr_dev(a5, "href", "#!");
    			attr_dev(a5, "class", "d-block m-b-10");
    			add_location(a5, file$2, 62, 16, 2036);
    			attr_dev(i3, "class", "mdi mdi-cancel text-danger");
    			add_location(i3, file$2, 73, 22, 2490);
    			attr_dev(div6, "class", "card-body");
    			add_location(div6, file$2, 72, 20, 2444);
    			attr_dev(div7, "class", "card");
    			add_location(div7, file$2, 71, 18, 2405);
    			attr_dev(a6, "href", "#!");
    			attr_dev(a6, "class", "d-block m-b-10");
    			add_location(a6, file$2, 70, 16, 2350);
    			attr_dev(div8, "class", "notification-events bg-gray-300");
    			add_location(div8, file$2, 52, 14, 1595);
    			attr_dev(div9, "class", "dropdown-menu notification-container dropdown-menu-right");
    			add_location(div9, file$2, 38, 12, 1008);
    			attr_dev(div10, "class", "dropdown");
    			add_location(div10, file$2, 27, 10, 664);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$2, 26, 8, 632);
    			attr_dev(span2, "class", "avatar-title rounded-circle bg-dark");
    			add_location(span2, file$2, 93, 14, 3052);
    			attr_dev(div11, "class", "avatar avatar-sm avatar-online");
    			add_location(div11, file$2, 92, 12, 2993);
    			attr_dev(a7, "class", "nav-link dropdown-toggle");
    			attr_dev(a7, "href", "#!");
    			attr_dev(a7, "role", "button");
    			attr_dev(a7, "data-toggle", "dropdown");
    			attr_dev(a7, "aria-haspopup", "true");
    			attr_dev(a7, "aria-expanded", "false");
    			add_location(a7, file$2, 85, 10, 2782);
    			attr_dev(a8, "class", "dropdown-item");
    			attr_dev(a8, "href", "#!");
    			add_location(a8, file$2, 98, 12, 3218);
    			attr_dev(a9, "class", "dropdown-item");
    			attr_dev(a9, "href", "#!");
    			add_location(a9, file$2, 99, 12, 3281);
    			attr_dev(a10, "class", "dropdown-item");
    			attr_dev(a10, "href", "#!");
    			add_location(a10, file$2, 100, 12, 3347);
    			attr_dev(div12, "class", "dropdown-divider");
    			add_location(div12, file$2, 101, 12, 3403);
    			attr_dev(a11, "class", "dropdown-item");
    			attr_dev(a11, "href", "#!");
    			add_location(a11, file$2, 102, 12, 3448);
    			attr_dev(div13, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div13, file$2, 97, 10, 3158);
    			attr_dev(li1, "class", "nav-item dropdown ");
    			add_location(li1, file$2, 84, 8, 2740);
    			attr_dev(ul, "class", "nav align-items-center");
    			add_location(ul, file$2, 24, 6, 585);
    			attr_dev(nav, "class", " ml-auto");
    			add_location(nav, file$2, 23, 4, 556);
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

    /* src/Layout/AsidePacientes.svelte generated by Svelte v3.29.0 */
    const file$3 = "src/Layout/AsidePacientes.svelte";

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
    			add_location(a0, file$3, 9, 8, 277);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$3, 8, 6, 234);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$3, 14, 8, 424);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$3, 18, 8, 593);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$3, 12, 6, 366);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$3, 6, 4, 157);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$3, 30, 14, 1011);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$3, 29, 12, 971);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$3, 33, 14, 1125);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$3, 34, 14, 1204);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$3, 32, 12, 1086);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$3, 28, 10, 919);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$3, 27, 8, 840);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$3, 44, 16, 1582);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$3, 43, 12, 1540);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-account-circle-outline");
    			add_location(i1, file$3, 47, 16, 1696);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$3, 46, 12, 1655);
    			attr_dev(a4, "href", "/Paciente/Index");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$3, 42, 12, 1474);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$3, 41, 8, 1379);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$3, 25, 6, 782);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$3, 23, 4, 696);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$3, 5, 2, 123);
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

    var bind$1 = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind$1(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      var valueFromConfig2Keys = ['url', 'method', 'data'];
      var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
      var defaultToConfig2Keys = [
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
        'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
        'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
      ];
      var directMergeKeys = ['validateStatus'];

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      }

      utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        }
      });

      utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

      utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      utils.forEach(directMergeKeys, function merge(prop) {
        if (prop in config2) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      var axiosKeys = valueFromConfig2Keys
        .concat(mergeDeepPropertiesKeys)
        .concat(defaultToConfig2Keys)
        .concat(directMergeKeys);

      var otherKeys = Object
        .keys(config1)
        .concat(Object.keys(config2))
        .filter(function filterAxiosKeys(key) {
          return axiosKeys.indexOf(key) === -1;
        });

      utils.forEach(otherKeys, mergeDeepProperties);

      return config;
    };

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    var isAxiosError = function isAxiosError(payload) {
      return (typeof payload === 'object') && (payload.isAxiosError === true);
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind$1(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios_1;

    // Factory for creating new instances
    axios.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios.Cancel = Cancel_1;
    axios.CancelToken = CancelToken_1;
    axios.isCancel = isCancel;

    // Expose all/spread
    axios.all = function all(promises) {
      return Promise.all(promises);
    };
    axios.spread = spread;

    // Expose isAxiosError
    axios.isAxiosError = isAxiosError;

    var axios_1 = axios;

    // Allow use of default import syntax in TypeScript
    var _default = axios;
    axios_1.default = _default;

    var axios$1 = axios_1;

    const url = 'http://192.168.1.106:91/api';

    const calcularEdad = (fecha) => {
        let hoy = new Date();
        let cumpleanos = new Date(fecha);
        let edad = hoy.getFullYear() - cumpleanos.getFullYear();
        let m = hoy.getMonth() - cumpleanos.getMonth();

        if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
          edad--;
        }

        return edad;
    };

    /* src/Pages/Paciente/Index.svelte generated by Svelte v3.29.0 */

    const { console: console_1$1 } = globals;
    const file$4 = "src/Pages/Paciente/Index.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (71:28) {#each pacientes as paciente}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let div1;
    	let div0;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*paciente*/ ctx[2].nombres + "";
    	let t2;
    	let t3;
    	let t4_value = /*paciente*/ ctx[2].primerApellido + "";
    	let t4;
    	let t5;
    	let t6_value = /*paciente*/ ctx[2].segundoApellido + "";
    	let t6;
    	let t7;
    	let td1;
    	let t8_value = /*paciente*/ ctx[2].cedula + "";
    	let t8;
    	let t9;
    	let td2;
    	let t10_value = calcularEdad(/*paciente*/ ctx[2].fechaNacimiento) + "";
    	let t10;
    	let t11;
    	let t12;
    	let td3;

    	let t13_value = (/*paciente*/ ctx[2].sexo == "M"
    	? "Masculino"
    	: "Femenino") + "";

    	let t13;
    	let t14;
    	let td4;
    	let div2;
    	let a0;
    	let i0;
    	let link_action;
    	let t15;
    	let a1;
    	let i1;
    	let a1_href_value;
    	let link_action_1;
    	let t16;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "FD";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			t6 = text(t6_value);
    			t7 = space();
    			td1 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td2 = element("td");
    			t10 = text(t10_value);
    			t11 = text(" años");
    			t12 = space();
    			td3 = element("td");
    			t13 = text(t13_value);
    			t14 = space();
    			td4 = element("td");
    			div2 = element("div");
    			a0 = element("a");
    			i0 = element("i");
    			t15 = space();
    			a1 = element("a");
    			i1 = element("i");
    			t16 = space();
    			attr_dev(span0, "class", "avatar-title rounded-circle ");
    			add_location(span0, file$4, 75, 49, 2793);
    			attr_dev(div0, "class", "avatar avatar-sm");
    			add_location(div0, file$4, 74, 45, 2713);
    			attr_dev(div1, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div1, file$4, 73, 41, 2621);
    			add_location(span1, file$4, 78, 48, 2956);
    			add_location(td0, file$4, 72, 37, 2575);
    			add_location(td1, file$4, 80, 37, 3121);
    			add_location(td2, file$4, 81, 37, 3185);
    			add_location(td3, file$4, 82, 37, 3277);
    			attr_dev(i0, "class", "mdi-24px mdi mdi-circle-edit-outline");
    			add_location(i0, file$4, 86, 184, 3684);
    			attr_dev(a0, "href", "/Paciente/Editar");
    			attr_dev(a0, "data-toggle", "tooltip");
    			attr_dev(a0, "data-placement", "top");
    			attr_dev(a0, "data-original-title", "Modificar paciente");
    			attr_dev(a0, "class", "icon-table");
    			add_location(a0, file$4, 86, 45, 3545);
    			attr_dev(i1, "class", "mdi-24px mdi mdi-account-card-details");
    			add_location(i1, file$4, 89, 49, 3994);
    			attr_dev(a1, "href", a1_href_value = `/paciente/perfil/${/*paciente*/ ctx[2].id}`);
    			attr_dev(a1, "data-toggle", "tooltip");
    			attr_dev(a1, "data-placement", "top");
    			attr_dev(a1, "data-original-title", "Ver perfil");
    			attr_dev(a1, "class", "icon-table");
    			add_location(a1, file$4, 88, 45, 3796);
    			set_style(div2, "width", "200px");
    			attr_dev(div2, "class", "ml-auto");
    			add_location(div2, file$4, 85, 41, 3456);
    			set_style(td4, "text-align", "right");
    			add_location(td4, file$4, 84, 37, 3383);
    			add_location(tr, file$4, 71, 33, 2533);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(td0, t1);
    			append_dev(td0, span1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    			append_dev(span1, t5);
    			append_dev(span1, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td1);
    			append_dev(td1, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td2);
    			append_dev(td2, t10);
    			append_dev(td2, t11);
    			append_dev(tr, t12);
    			append_dev(tr, td3);
    			append_dev(td3, t13);
    			append_dev(tr, t14);
    			append_dev(tr, td4);
    			append_dev(td4, div2);
    			append_dev(div2, a0);
    			append_dev(a0, i0);
    			append_dev(div2, t15);
    			append_dev(div2, a1);
    			append_dev(a1, i1);
    			append_dev(tr, t16);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a1))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pacientes*/ 1 && t2_value !== (t2_value = /*paciente*/ ctx[2].nombres + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*pacientes*/ 1 && t4_value !== (t4_value = /*paciente*/ ctx[2].primerApellido + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*pacientes*/ 1 && t6_value !== (t6_value = /*paciente*/ ctx[2].segundoApellido + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*pacientes*/ 1 && t8_value !== (t8_value = /*paciente*/ ctx[2].cedula + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*pacientes*/ 1 && t10_value !== (t10_value = calcularEdad(/*paciente*/ ctx[2].fechaNacimiento) + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*pacientes*/ 1 && t13_value !== (t13_value = (/*paciente*/ ctx[2].sexo == "M"
    			? "Masculino"
    			: "Femenino") + "")) set_data_dev(t13, t13_value);

    			if (dirty & /*pacientes*/ 1 && a1_href_value !== (a1_href_value = `/paciente/perfil/${/*paciente*/ ctx[2].id}`)) {
    				attr_dev(a1, "href", a1_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(71:28) {#each pacientes as paciente}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let asidepaciente;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div10;
    	let div0;
    	let t2;
    	let h4;
    	let t4;
    	let div9;
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let input;
    	let t5;
    	let div2;
    	let div1;
    	let span;
    	let t6;
    	let a;
    	let i;
    	let t7;
    	let link_action;
    	let t8;
    	let div8;
    	let div7;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t10;
    	let th1;
    	let t12;
    	let th2;
    	let t14;
    	let th3;
    	let t16;
    	let th4;
    	let t17;
    	let tbody;
    	let current;
    	let mounted;
    	let dispose;
    	asidepaciente = new AsidePacientes({ $$inline: true });
    	header = new Header({ $$inline: true });
    	let each_value = /*pacientes*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			create_component(asidepaciente.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div10 = element("div");
    			div0 = element("div");
    			t2 = space();
    			h4 = element("h4");
    			h4.textContent = "Pacientes";
    			t4 = space();
    			div9 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			input = element("input");
    			t5 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span = element("span");
    			t6 = space();
    			a = element("a");
    			i = element("i");
    			t7 = text(" Nuevo paciente");
    			t8 = space();
    			div8 = element("div");
    			div7 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Nombres";
    			t10 = space();
    			th1 = element("th");
    			th1.textContent = "Cedula";
    			t12 = space();
    			th2 = element("th");
    			th2.textContent = "Edad";
    			t14 = space();
    			th3 = element("th");
    			th3.textContent = "Sexo";
    			t16 = space();
    			th4 = element("th");
    			t17 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "row");
    			add_location(div0, file$4, 38, 6, 907);
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$4, 39, 6, 933);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "class", "form-control form-control-appended");
    			attr_dev(input, "placeholder", "Buscar");
    			add_location(input, file$4, 45, 28, 1205);
    			attr_dev(span, "class", "mdi mdi-magnify");
    			add_location(span, file$4, 48, 36, 1451);
    			attr_dev(div1, "class", "input-group-text");
    			add_location(div1, file$4, 47, 32, 1384);
    			attr_dev(div2, "class", "input-group-append");
    			add_location(div2, file$4, 46, 28, 1319);
    			attr_dev(div3, "class", "input-group input-group-flush mb-3");
    			add_location(div3, file$4, 44, 24, 1128);
    			attr_dev(div4, "class", "col-md-5");
    			add_location(div4, file$4, 43, 20, 1081);
    			attr_dev(i, "class", "mdi mdi-account-plus");
    			add_location(i, file$4, 53, 117, 1738);
    			attr_dev(a, "href", "/Paciente/Editar");
    			attr_dev(a, "type", "button");
    			attr_dev(a, "class", "btn  m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			add_location(a, file$4, 53, 20, 1641);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$4, 42, 16, 1043);
    			attr_dev(div6, "class", "col-md-12");
    			add_location(div6, file$4, 41, 12, 1003);
    			add_location(th0, file$4, 62, 32, 2113);
    			add_location(th1, file$4, 63, 32, 2162);
    			add_location(th2, file$4, 64, 32, 2210);
    			add_location(th3, file$4, 65, 32, 2256);
    			add_location(th4, file$4, 66, 32, 2302);
    			add_location(tr, file$4, 61, 28, 2076);
    			add_location(thead, file$4, 60, 24, 2040);
    			attr_dev(tbody, "data-bind", "foreach: pacientes");
    			add_location(tbody, file$4, 69, 24, 2403);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$4, 59, 20, 1967);
    			attr_dev(div7, "class", "table-responsive");
    			add_location(div7, file$4, 58, 16, 1916);
    			attr_dev(div8, "class", "col-md-12 m-b-30");
    			add_location(div8, file$4, 57, 12, 1869);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$4, 40, 8, 973);
    			attr_dev(div10, "class", "p-2");
    			add_location(div10, file$4, 37, 4, 883);
    			attr_dev(section, "class", "admin-content p-2");
    			add_location(section, file$4, 36, 2, 843);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$4, 34, 0, 802);
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
    			append_dev(section, div10);
    			append_dev(div10, div0);
    			append_dev(div10, t2);
    			append_dev(div10, h4);
    			append_dev(div10, t4);
    			append_dev(div10, div9);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, input);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(div5, t6);
    			append_dev(div5, a);
    			append_dev(a, i);
    			append_dev(a, t7);
    			append_dev(div9, t8);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t10);
    			append_dev(tr, th1);
    			append_dev(tr, t12);
    			append_dev(tr, th2);
    			append_dev(tr, t14);
    			append_dev(tr, th3);
    			append_dev(tr, t16);
    			append_dev(tr, th4);
    			append_dev(table, t17);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(link_action = link.call(null, a));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pacientes, calcularEdad*/ 1) {
    				each_value = /*pacientes*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
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
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
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
    	let pacientes = [];

    	const cargarPacientes = () => {
    		const config = {
    			method: "get",
    			url: `${url}/pacientes`,
    			header: {}
    		};

    		axios$1(config).then(res => {
    			$$invalidate(0, pacientes = res.data);
    			console.log(pacientes);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	onMount(() => {
    		cargarPacientes();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		AsidePaciente: AsidePacientes,
    		axios: axios$1,
    		link,
    		url,
    		calcularEdad,
    		onMount,
    		pacientes,
    		cargarPacientes
    	});

    	$$self.$inject_state = $$props => {
    		if ("pacientes" in $$props) $$invalidate(0, pacientes = $$props.pacientes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pacientes];
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

    /* src/componentes/ModalDatosPaciente.svelte generated by Svelte v3.29.0 */

    const file$5 = "src/componentes/ModalDatosPaciente.svelte";

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
    			add_location(h5, file$5, 5, 20, 360);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$5, 7, 24, 554);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$5, 6, 20, 453);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$5, 4, 16, 313);
    			attr_dev(div1, "class", "avatar avatar-xl");
    			add_location(div1, file$5, 14, 28, 787);
    			add_location(div2, file$5, 13, 24, 753);
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$5, 19, 28, 1117);
    			attr_dev(h30, "class", "p-t-10 searchBy-name");
    			add_location(h30, file$5, 18, 24, 1055);
    			attr_dev(div3, "class", "text-muted text-center m-b-10");
    			attr_dev(div3, "data-bind", "text: paciente().correo");
    			add_location(div3, file$5, 21, 24, 1188);
    			attr_dev(span1, "data-bind", "text: paciente().ultimaModificacion");
    			add_location(span1, file$5, 24, 84, 1431);
    			attr_dev(span2, "class", "badge badge-primary");
    			add_location(span2, file$5, 24, 28, 1375);
    			attr_dev(div4, "class", "m-auto");
    			add_location(div4, file$5, 23, 24, 1326);
    			attr_dev(div5, "class", "text-center");
    			add_location(div5, file$5, 12, 20, 703);
    			add_location(hr0, file$5, 28, 20, 1617);
    			attr_dev(sapn, "class", "text-primary");
    			add_location(sapn, file$5, 33, 36, 1901);
    			attr_dev(strong0, "class", "d-block");
    			attr_dev(strong0, "data-bind", "text: paciente().cedula");
    			add_location(strong0, file$5, 34, 36, 1990);
    			attr_dev(div6, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div6, file$5, 32, 32, 1824);
    			attr_dev(div7, "class", "form-group col-md-6");
    			add_location(div7, file$5, 31, 28, 1758);
    			attr_dev(span3, "class", "text-primary");
    			add_location(span3, file$5, 41, 36, 2498);
    			attr_dev(strong1, "class", "d-block");
    			attr_dev(strong1, "data-bind", "text: paciente().nombres");
    			add_location(strong1, file$5, 42, 36, 2576);
    			attr_dev(div8, "class", " bg-gray-100 p-2 rounded-sm");
    			add_location(div8, file$5, 40, 32, 2420);
    			attr_dev(div9, "class", "form-group col-md-12");
    			add_location(div9, file$5, 39, 28, 2353);
    			attr_dev(span4, "class", "text-primary");
    			add_location(span4, file$5, 48, 36, 3029);
    			attr_dev(strong2, "class", "d-block");
    			attr_dev(strong2, "data-bind", "text: paciente().primerApellido");
    			add_location(strong2, file$5, 49, 36, 3115);
    			attr_dev(div10, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div10, file$5, 47, 32, 2952);
    			attr_dev(div11, "class", "form-group col-md-6");
    			add_location(div11, file$5, 46, 28, 2886);
    			attr_dev(span5, "class", "text-primary");
    			add_location(span5, file$5, 56, 36, 3646);
    			attr_dev(strong3, "class", "d-block");
    			attr_dev(strong3, "data-bind", "text: paciente().segundoApellido");
    			add_location(strong3, file$5, 57, 36, 3733);
    			attr_dev(div12, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div12, file$5, 55, 32, 3569);
    			attr_dev(div13, "class", "form-group col-md-6 ");
    			add_location(div13, file$5, 54, 28, 3502);
    			attr_dev(span6, "class", "text-primary");
    			add_location(span6, file$5, 64, 36, 4266);
    			attr_dev(strong4, "class", "d-block");
    			attr_dev(strong4, "data-bind", "text: paciente().sexo");
    			add_location(strong4, file$5, 65, 36, 4341);
    			attr_dev(div14, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div14, file$5, 63, 32, 4189);
    			attr_dev(div15, "class", "form-group col-md-6");
    			add_location(div15, file$5, 62, 28, 4123);
    			attr_dev(span7, "class", "text-primary");
    			add_location(span7, file$5, 71, 36, 4801);
    			attr_dev(strong5, "class", "d-block");
    			attr_dev(strong5, "data-bind", "text: paciente().edad");
    			add_location(strong5, file$5, 72, 36, 4876);
    			attr_dev(div16, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div16, file$5, 70, 32, 4724);
    			attr_dev(div17, "class", "form-group col-md-6");
    			add_location(div17, file$5, 69, 28, 4658);
    			attr_dev(span8, "class", "text-primary");
    			add_location(span8, file$5, 78, 36, 5336);
    			attr_dev(strong6, "class", "d-block");
    			attr_dev(strong6, "data-bind", "text: paciente().estadoCivil");
    			add_location(strong6, file$5, 79, 36, 5419);
    			attr_dev(div18, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div18, file$5, 77, 32, 5259);
    			attr_dev(div19, "class", "form-group col-md-6");
    			add_location(div19, file$5, 76, 28, 5193);
    			attr_dev(span9, "class", "text-primary");
    			add_location(span9, file$5, 87, 36, 5922);
    			attr_dev(strong7, "class", "d-block");
    			attr_dev(strong7, "data-bind", "text: paciente().fechaNacimiento");
    			add_location(strong7, file$5, 88, 36, 6009);
    			attr_dev(div20, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div20, file$5, 86, 32, 5845);
    			attr_dev(div21, "class", "form-group col-md-6");
    			add_location(div21, file$5, 85, 28, 5779);
    			attr_dev(span10, "class", "text-primary");
    			add_location(span10, file$5, 95, 36, 6520);
    			attr_dev(strong8, "class", "d-block");
    			attr_dev(strong8, "data-bind", "text: paciente().telefono");
    			add_location(strong8, file$5, 96, 36, 6599);
    			attr_dev(div22, "class", " bg-gray-100 p-2 rounded-sm");
    			add_location(div22, file$5, 94, 32, 6442);
    			attr_dev(div23, "class", "form-group col-md-6");
    			add_location(div23, file$5, 93, 28, 6376);
    			attr_dev(span11, "class", "text-primary");
    			add_location(span11, file$5, 103, 36, 7111);
    			attr_dev(strong9, "class", "d-block");
    			attr_dev(strong9, "data-bind", "text: paciente().celular");
    			add_location(strong9, file$5, 104, 36, 7189);
    			attr_dev(div24, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div24, file$5, 102, 32, 7034);
    			attr_dev(div25, "class", "form-group col-md-6");
    			add_location(div25, file$5, 101, 28, 6968);
    			attr_dev(span12, "class", "text-primary");
    			add_location(span12, file$5, 111, 36, 7703);
    			attr_dev(strong10, "class", "d-block");
    			attr_dev(strong10, "data-bind", "text: paciente().nombreAseguradora");
    			add_location(strong10, file$5, 112, 36, 7787);
    			attr_dev(div26, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div26, file$5, 110, 32, 7626);
    			attr_dev(div27, "class", "form-group col-md-6 ");
    			add_location(div27, file$5, 109, 28, 7559);
    			attr_dev(span13, "class", "text-primary");
    			add_location(span13, file$5, 119, 36, 8337);
    			attr_dev(strong11, "class", "d-block");
    			attr_dev(strong11, "data-bind", "text: paciente().poliza");
    			add_location(strong11, file$5, 120, 36, 8414);
    			attr_dev(div28, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div28, file$5, 118, 32, 8260);
    			attr_dev(div29, "class", "form-group col-md-6 ");
    			add_location(div29, file$5, 117, 28, 8193);
    			attr_dev(span14, "class", "text-primary");
    			add_location(span14, file$5, 127, 36, 8907);
    			attr_dev(strong12, "class", "d-block");
    			attr_dev(strong12, "data-bind", "text: paciente().nss");
    			add_location(strong12, file$5, 128, 36, 8981);
    			attr_dev(div30, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div30, file$5, 126, 32, 8830);
    			attr_dev(div31, "class", "form-group col-md-6 ");
    			add_location(div31, file$5, 125, 28, 8763);
    			attr_dev(div32, "class", "form-row");
    			add_location(div32, file$5, 30, 24, 1707);
    			add_location(b, file$5, 134, 40, 9370);
    			attr_dev(p, "class", "mt-3");
    			add_location(p, file$5, 134, 24, 9354);
    			add_location(hr1, file$5, 135, 24, 9424);
    			attr_dev(span15, "for", "inpDireccion");
    			attr_dev(span15, "class", "text-primary");
    			add_location(span15, file$5, 139, 36, 9649);
    			attr_dev(strong13, "class", "d-block");
    			attr_dev(strong13, "data-bind", "text: paciente().direccion");
    			add_location(strong13, file$5, 140, 36, 9755);
    			attr_dev(div33, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div33, file$5, 138, 32, 9572);
    			attr_dev(div34, "class", "form-group col-md-12 ");
    			add_location(div34, file$5, 137, 28, 9504);
    			attr_dev(span16, "class", "text-primary");
    			add_location(span16, file$5, 147, 36, 10254);
    			attr_dev(strong14, "class", "d-block");
    			attr_dev(strong14, "data-bind", "text: paciente().ciudad");
    			add_location(strong14, file$5, 148, 36, 10331);
    			attr_dev(div35, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div35, file$5, 146, 32, 10177);
    			attr_dev(div36, "class", "form-group col-md-6 ");
    			add_location(div36, file$5, 145, 28, 10110);
    			attr_dev(span17, "for", "inpPais");
    			attr_dev(span17, "class", "text-primary");
    			add_location(span17, file$5, 154, 36, 10783);
    			attr_dev(strong15, "class", "d-block");
    			attr_dev(strong15, "data-bind", "text: paciente().pais");
    			add_location(strong15, file$5, 155, 36, 10872);
    			attr_dev(div37, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div37, file$5, 153, 32, 10706);
    			attr_dev(div38, "class", "form-group col-md-6 ");
    			add_location(div38, file$5, 152, 28, 10639);
    			attr_dev(span18, "class", "text-primary");
    			add_location(span18, file$5, 162, 36, 11378);
    			attr_dev(strong16, "class", "d-block");
    			attr_dev(strong16, "data-bind", "text: paciente().provincia");
    			add_location(strong16, file$5, 163, 36, 11458);
    			attr_dev(div39, "class", "bg-gray-100 p-2 rounded-sm");
    			add_location(div39, file$5, 161, 32, 11301);
    			attr_dev(div40, "class", "form-group col-md-6 ");
    			add_location(div40, file$5, 160, 28, 11234);
    			attr_dev(div41, "class", "form-row");
    			add_location(div41, file$5, 136, 24, 9453);
    			attr_dev(form, "class", "form-group floating-label");
    			add_location(form, file$5, 29, 20, 1642);
    			attr_dev(div42, "class", "modal-body");
    			add_location(div42, file$5, 10, 16, 657);
    			attr_dev(h31, "class", "mdi mdi-close-outline");
    			add_location(h31, file$5, 177, 32, 12124);
    			attr_dev(div43, "class", "text-overline");
    			add_location(div43, file$5, 178, 32, 12196);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "class", "text-danger");
    			attr_dev(a1, "data-dismiss", "modal");
    			add_location(a1, file$5, 176, 28, 12038);
    			attr_dev(div44, "class", "col");
    			add_location(div44, file$5, 175, 24, 11992);
    			attr_dev(h32, "class", "mdi mdi-account-edit");
    			add_location(h32, file$5, 183, 32, 12436);
    			attr_dev(div45, "class", "text-overline");
    			add_location(div45, file$5, 184, 32, 12507);
    			attr_dev(a2, "href", "/");
    			attr_dev(a2, "class", "text-success");
    			add_location(a2, file$5, 182, 28, 12370);
    			attr_dev(div46, "class", "col");
    			add_location(div46, file$5, 181, 24, 12324);
    			attr_dev(div47, "class", "row text-center p-b-10");
    			add_location(div47, file$5, 174, 20, 11931);
    			attr_dev(div48, "class", "modal-footer");
    			add_location(div48, file$5, 173, 16, 11884);
    			attr_dev(div49, "class", "modal-content");
    			add_location(div49, file$5, 3, 12, 269);
    			attr_dev(div50, "class", "modal-dialog");
    			attr_dev(div50, "role", "document");
    			add_location(div50, file$5, 2, 8, 214);
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

    /* src/componentes/ModalNuevaAtencion.svelte generated by Svelte v3.29.0 */
    const file$6 = "src/componentes/ModalNuevaAtencion.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[9] = list;
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (29:32) {#each tiposAtenciones as tipoAtencion}
    function create_each_block$2(ctx) {
    	let div;
    	let label;
    	let input;
    	let input_checked_value;
    	let t0;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*tipoAtencion*/ ctx[8].descripcion + "";
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[5].call(input, /*each_value*/ ctx[9], /*tipoAtencion_index*/ ctx[10]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			span0 = element("span");
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(input, "type", "radio");
    			input.checked = input_checked_value = /*tipoAtencionMedica*/ ctx[1] === /*tipoAtencion*/ ctx[8].id;
    			attr_dev(input, "name", "TipoAtencion");
    			attr_dev(input, "group", "TipoAtencion");
    			attr_dev(input, "class", "cstm-switch-input");
    			add_location(input, file$6, 31, 45, 1519);
    			attr_dev(span0, "class", "cstm-switch-indicator ");
    			add_location(span0, file$6, 38, 45, 2037);
    			attr_dev(span1, "class", "cstm-switch-description");
    			add_location(span1, file$6, 39, 45, 2127);
    			attr_dev(label, "class", "cstm-switch cursor-hover");
    			add_location(label, file$6, 30, 41, 1433);
    			attr_dev(div, "class", " m-b-10 ml-2");
    			add_location(div, file$6, 29, 37, 1365);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(label, input);
    			set_input_value(input, /*tipoAtencion*/ ctx[8].id);
    			append_dev(label, t0);
    			append_dev(label, span0);
    			append_dev(label, t1);
    			append_dev(label, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*onChange*/ ctx[4], false, false, false),
    					listen_dev(input, "change", input_change_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*tipoAtencionMedica, tiposAtenciones*/ 3 && input_checked_value !== (input_checked_value = /*tipoAtencionMedica*/ ctx[1] === /*tipoAtencion*/ ctx[8].id)) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty & /*tiposAtenciones*/ 1) {
    				set_input_value(input, /*tipoAtencion*/ ctx[8].id);
    			}

    			if (dirty & /*tiposAtenciones*/ 1 && t2_value !== (t2_value = /*tipoAtencion*/ ctx[8].descripcion + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(29:32) {#each tiposAtenciones as tipoAtencion}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div12;
    	let div11;
    	let div10;
    	let form;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span0;
    	let t3;
    	let div8;
    	let h60;
    	let t5;
    	let div2;
    	let div1;
    	let t6;
    	let br0;
    	let t7;
    	let div3;
    	let h61;
    	let t9;
    	let textarea;
    	let t10;
    	let br1;
    	let t11;
    	let div7;
    	let div6;
    	let div4;
    	let i;
    	let t12;
    	let div5;
    	let strong;
    	let t14;
    	let span1;
    	let t16;
    	let div9;
    	let button1;
    	let t18;
    	let button2;
    	let mounted;
    	let dispose;
    	let each_value = /*tiposAtenciones*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			form = element("form");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Nueva atención";
    			t1 = space();
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "×";
    			t3 = space();
    			div8 = element("div");
    			h60 = element("h6");
    			h60.textContent = "Tipo de atención";
    			t5 = space();
    			div2 = element("div");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			br0 = element("br");
    			t7 = space();
    			div3 = element("div");
    			h61 = element("h6");
    			h61.textContent = "Motivo de Consulta";
    			t9 = space();
    			textarea = element("textarea");
    			t10 = space();
    			br1 = element("br");
    			t11 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			i = element("i");
    			t12 = space();
    			div5 = element("div");
    			strong = element("strong");
    			strong.textContent = "--";
    			t14 = space();
    			span1 = element("span");
    			span1.textContent = "--";
    			t16 = space();
    			div9 = element("div");
    			button1 = element("button");
    			button1.textContent = "Cancelar";
    			t18 = space();
    			button2 = element("button");
    			button2.textContent = "Crear";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "myLargeModalLabel");
    			add_location(h5, file$6, 19, 24, 755);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$6, 21, 28, 959);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$6, 20, 24, 854);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$6, 18, 20, 704);
    			add_location(h60, file$6, 25, 24, 1129);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$6, 27, 28, 1238);
    			attr_dev(div2, "class", "col-md-12");
    			add_location(div2, file$6, 26, 24, 1186);
    			add_location(br0, file$6, 63, 24, 3616);
    			add_location(h61, file$6, 65, 28, 3713);
    			attr_dev(textarea, "class", "form-control");
    			textarea.required = true;
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			set_style(textarea, "height", "150px");
    			attr_dev(textarea, "id", "exampleFormControlTextarea1");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "MotivoConsulta");
    			add_location(textarea, file$6, 66, 28, 3769);
    			add_location(br1, file$6, 69, 28, 4058);
    			attr_dev(div3, "data-bind", "visible: puedeCrear()");
    			add_location(div3, file$6, 64, 24, 3645);
    			attr_dev(i, "class", "mdi mdi-alert-circle-outline");
    			add_location(i, file$6, 76, 36, 4382);
    			attr_dev(div4, "class", "icon");
    			add_location(div4, file$6, 75, 32, 4327);
    			attr_dev(strong, "data-bind", "text: title");
    			add_location(strong, file$6, 79, 36, 4556);
    			attr_dev(span1, "data-bind", "text: message");
    			add_location(span1, file$6, 79, 82, 4602);
    			attr_dev(div5, "class", "content");
    			add_location(div5, file$6, 78, 32, 4498);
    			attr_dev(div6, "class", "d-flex");
    			add_location(div6, file$6, 74, 28, 4274);
    			attr_dev(div7, "class", "alert alert-border-warning");
    			attr_dev(div7, "data-bind", "visible: !puedeCrear(), using: warningMessage");
    			add_location(div7, file$6, 72, 24, 4119);
    			attr_dev(div8, "class", "modal-body");
    			add_location(div8, file$6, 24, 20, 1080);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$6, 89, 24, 4888);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "btn btn-primary");
    			add_location(button2, file$6, 90, 24, 4999);
    			attr_dev(div9, "class", "modal-footer");
    			add_location(div9, file$6, 88, 20, 4837);
    			attr_dev(form, "data-bind", "submit: crearAtencion");
    			attr_dev(form, "id", "frmCreacionAtencion");
    			add_location(form, file$6, 17, 16, 618);
    			attr_dev(div10, "class", "modal-content");
    			add_location(div10, file$6, 16, 12, 574);
    			attr_dev(div11, "class", "modal-dialog modal-dialog-centered modal-lg");
    			attr_dev(div11, "role", "document");
    			add_location(div11, file$6, 15, 8, 488);
    			attr_dev(div12, "class", "modal fade bd-example-modal-lg");
    			attr_dev(div12, "tabindex", "-1");
    			attr_dev(div12, "id", "modalNuevaAtencion");
    			attr_dev(div12, "role", "dialog");
    			attr_dev(div12, "aria-labelledby", "myLargeModalLabel");
    			attr_dev(div12, "aria-hidden", "true");
    			add_location(div12, file$6, 13, 0, 320);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, form);
    			append_dev(form, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span0);
    			append_dev(form, t3);
    			append_dev(form, div8);
    			append_dev(div8, h60);
    			append_dev(div8, t5);
    			append_dev(div8, div2);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div8, t6);
    			append_dev(div8, br0);
    			append_dev(div8, t7);
    			append_dev(div8, div3);
    			append_dev(div3, h61);
    			append_dev(div3, t9);
    			append_dev(div3, textarea);
    			set_input_value(textarea, /*motivoConsulta*/ ctx[2]);
    			append_dev(div3, t10);
    			append_dev(div3, br1);
    			append_dev(div8, t11);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, i);
    			append_dev(div6, t12);
    			append_dev(div6, div5);
    			append_dev(div5, strong);
    			append_dev(div5, t14);
    			append_dev(div5, span1);
    			append_dev(form, t16);
    			append_dev(form, div9);
    			append_dev(div9, button1);
    			append_dev(div9, t18);
    			append_dev(div9, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(button2, "click", prevent_default(/*click_handler*/ ctx[7]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*tiposAtenciones, tipoAtencionMedica, onChange*/ 19) {
    				each_value = /*tiposAtenciones*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*motivoConsulta*/ 4) {
    				set_input_value(textarea, /*motivoConsulta*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
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

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModalNuevaAtencion", slots, []);
    	let { tiposAtenciones } = $$props;
    	let { tipoAtencionMedica = "A" } = $$props;
    	let { motivoConsulta } = $$props;
    	const dispatch = createEventDispatcher();

    	const onChange = event => {
    		$$invalidate(1, tipoAtencionMedica = event.currentTarget.value);
    	};

    	const writable_props = ["tiposAtenciones", "tipoAtencionMedica", "motivoConsulta"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalNuevaAtencion> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler(each_value, tipoAtencion_index) {
    		each_value[tipoAtencion_index].id = this.value;
    		$$invalidate(0, tiposAtenciones);
    	}

    	function textarea_input_handler() {
    		motivoConsulta = this.value;
    		$$invalidate(2, motivoConsulta);
    	}

    	const click_handler = () => dispatch("crearAtencion");

    	$$self.$$set = $$props => {
    		if ("tiposAtenciones" in $$props) $$invalidate(0, tiposAtenciones = $$props.tiposAtenciones);
    		if ("tipoAtencionMedica" in $$props) $$invalidate(1, tipoAtencionMedica = $$props.tipoAtencionMedica);
    		if ("motivoConsulta" in $$props) $$invalidate(2, motivoConsulta = $$props.motivoConsulta);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tiposAtenciones,
    		tipoAtencionMedica,
    		motivoConsulta,
    		dispatch,
    		onChange
    	});

    	$$self.$inject_state = $$props => {
    		if ("tiposAtenciones" in $$props) $$invalidate(0, tiposAtenciones = $$props.tiposAtenciones);
    		if ("tipoAtencionMedica" in $$props) $$invalidate(1, tipoAtencionMedica = $$props.tipoAtencionMedica);
    		if ("motivoConsulta" in $$props) $$invalidate(2, motivoConsulta = $$props.motivoConsulta);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		tiposAtenciones,
    		tipoAtencionMedica,
    		motivoConsulta,
    		dispatch,
    		onChange,
    		input_change_handler,
    		textarea_input_handler,
    		click_handler
    	];
    }

    class ModalNuevaAtencion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			tiposAtenciones: 0,
    			tipoAtencionMedica: 1,
    			motivoConsulta: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalNuevaAtencion",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tiposAtenciones*/ ctx[0] === undefined && !("tiposAtenciones" in props)) {
    			console.warn("<ModalNuevaAtencion> was created without expected prop 'tiposAtenciones'");
    		}

    		if (/*motivoConsulta*/ ctx[2] === undefined && !("motivoConsulta" in props)) {
    			console.warn("<ModalNuevaAtencion> was created without expected prop 'motivoConsulta'");
    		}
    	}

    	get tiposAtenciones() {
    		throw new Error("<ModalNuevaAtencion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tiposAtenciones(value) {
    		throw new Error("<ModalNuevaAtencion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tipoAtencionMedica() {
    		throw new Error("<ModalNuevaAtencion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tipoAtencionMedica(value) {
    		throw new Error("<ModalNuevaAtencion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get motivoConsulta() {
    		throw new Error("<ModalNuevaAtencion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set motivoConsulta(value) {
    		throw new Error("<ModalNuevaAtencion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Pages/Paciente/Perfil.svelte generated by Svelte v3.29.0 */

    const { console: console_1$2 } = globals;
    const file$7 = "src/Pages/Paciente/Perfil.svelte";

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
    	let t4_value = /*paciente*/ ctx[0].nombres + "";
    	let t4;
    	let t5;
    	let t6_value = /*paciente*/ ctx[0].primerApellido + "";
    	let t6;
    	let t7;
    	let t8_value = /*paciente*/ ctx[0].segundoApellido + "";
    	let t8;
    	let t9;
    	let a0;
    	let i0;
    	let t10;
    	let t11;
    	let div1;
    	let span2;
    	let t12_value = calcularEdad(/*paciente*/ ctx[0].fechaNacimiento) + "";
    	let t12;
    	let t13;
    	let t14;
    	let span3;
    	let t15_value = /*paciente*/ ctx[0].cedula + "";
    	let t15;
    	let t16;
    	let div6;
    	let div5;
    	let a1;
    	let i1;
    	let t17;
    	let t18;
    	let div129;
    	let div128;
    	let div127;
    	let div88;
    	let div15;
    	let div13;
    	let div12;
    	let div11;
    	let i2;
    	let t19;
    	let t20;
    	let div14;
    	let textarea;
    	let t21;
    	let div39;
    	let div18;
    	let div17;
    	let div16;
    	let i3;
    	let t22;
    	let t23;
    	let div21;
    	let div20;
    	let a2;
    	let i4;
    	let t24;
    	let div19;
    	let button0;
    	let t26;
    	let button1;
    	let t28;
    	let button2;
    	let t30;
    	let div38;
    	let div37;
    	let div24;
    	let div22;
    	let i5;
    	let t31;
    	let t32;
    	let div23;
    	let p0;
    	let t34;
    	let div27;
    	let div25;
    	let i6;
    	let t35;
    	let t36;
    	let div26;
    	let p1;
    	let t38;
    	let div30;
    	let div28;
    	let i7;
    	let t39;
    	let t40;
    	let div29;
    	let p2;
    	let t42;
    	let div33;
    	let div31;
    	let i8;
    	let t43;
    	let t44;
    	let div32;
    	let p3;
    	let t46;
    	let div36;
    	let div34;
    	let i9;
    	let t47;
    	let t48;
    	let div35;
    	let p4;
    	let t50;
    	let div87;
    	let div40;
    	let h51;
    	let t52;
    	let p5;
    	let t54;
    	let div86;
    	let form;
    	let div42;
    	let h1;
    	let i10;
    	let t55;
    	let br0;
    	let t56;
    	let span4;
    	let t58;
    	let div41;
    	let a3;
    	let t60;
    	let br1;
    	let t61;
    	let div85;
    	let div52;
    	let div45;
    	let div44;
    	let div43;
    	let i11;
    	let t62;
    	let div48;
    	let div46;
    	let t64;
    	let div47;
    	let t66;
    	let div51;
    	let div50;
    	let a4;
    	let i12;
    	let t67;
    	let div49;
    	let button3;
    	let t69;
    	let button4;
    	let t71;
    	let button5;
    	let t73;
    	let div62;
    	let div55;
    	let div54;
    	let div53;
    	let i13;
    	let t74;
    	let div58;
    	let div56;
    	let t76;
    	let div57;
    	let t78;
    	let div61;
    	let div60;
    	let a5;
    	let i14;
    	let t79;
    	let div59;
    	let button6;
    	let t81;
    	let button7;
    	let t83;
    	let button8;
    	let t85;
    	let div73;
    	let div66;
    	let div65;
    	let div64;
    	let div63;
    	let i15;
    	let t86;
    	let div69;
    	let div67;
    	let t88;
    	let div68;
    	let t90;
    	let div72;
    	let div71;
    	let a6;
    	let i16;
    	let t91;
    	let div70;
    	let button9;
    	let t93;
    	let button10;
    	let t95;
    	let button11;
    	let t97;
    	let div84;
    	let div77;
    	let div76;
    	let div75;
    	let div74;
    	let i17;
    	let t98;
    	let div80;
    	let div78;
    	let t100;
    	let div79;
    	let t102;
    	let div83;
    	let div82;
    	let a7;
    	let i18;
    	let t103;
    	let div81;
    	let button12;
    	let t105;
    	let button13;
    	let t107;
    	let button14;
    	let t109;
    	let div114;
    	let div105;
    	let div91;
    	let div90;
    	let div89;
    	let i19;
    	let t110;
    	let t111;
    	let div104;
    	let div103;
    	let div94;
    	let h60;
    	let t113;
    	let hr0;
    	let t114;
    	let div92;
    	let t115;
    	let div93;
    	let strong0;
    	let t117;
    	let div102;
    	let div101;
    	let h61;
    	let t119;
    	let hr1;
    	let t120;
    	let div96;
    	let div95;
    	let strong1;
    	let t122;
    	let h62;
    	let t124;
    	let hr2;
    	let t125;
    	let div98;
    	let div97;
    	let strong2;
    	let t127;
    	let h63;
    	let t129;
    	let hr3;
    	let t130;
    	let div100;
    	let div99;
    	let strong3;
    	let t132;
    	let div113;
    	let div108;
    	let div107;
    	let div106;
    	let i20;
    	let t133;
    	let t134;
    	let div112;
    	let div110;
    	let input;
    	let t135;
    	let ul;
    	let div109;
    	let li0;
    	let a8;
    	let t137;
    	let li1;
    	let a9;
    	let t139;
    	let li2;
    	let a10;
    	let i21;
    	let t140;
    	let t141;
    	let div111;
    	let t142;
    	let button15;
    	let span5;
    	let t144;
    	let div126;
    	let div118;
    	let div117;
    	let div116;
    	let div115;
    	let i22;
    	let t145;
    	let t146;
    	let div125;
    	let div124;
    	let div123;
    	let div122;
    	let div121;
    	let strong4;
    	let t148;
    	let i23;
    	let t149;
    	let div119;
    	let t151;
    	let div120;
    	let t153;
    	let a11;
    	let i24;
    	let link_action;
    	let t154;
    	let modaldatospaciente;
    	let t155;
    	let modalnuevaatencion;
    	let updating_motivoConsulta;
    	let current;
    	let mounted;
    	let dispose;
    	asidepacientes = new AsidePacientes({ $$inline: true });
    	header = new Header({ $$inline: true });
    	modaldatospaciente = new ModalDatosPaciente({ $$inline: true });

    	function modalnuevaatencion_motivoConsulta_binding(value) {
    		/*modalnuevaatencion_motivoConsulta_binding*/ ctx[7].call(null, value);
    	}

    	let modalnuevaatencion_props = {
    		tiposAtenciones: /*tiposAtenciones*/ ctx[1],
    		tipoAtencionMedica: /*tipoAtencionMedica*/ ctx[4]
    	};

    	if (/*txtMotivoConsulta*/ ctx[2] !== void 0) {
    		modalnuevaatencion_props.motivoConsulta = /*txtMotivoConsulta*/ ctx[2];
    	}

    	modalnuevaatencion = new ModalNuevaAtencion({
    			props: modalnuevaatencion_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(modalnuevaatencion, "motivoConsulta", modalnuevaatencion_motivoConsulta_binding));
    	modalnuevaatencion.$on("crearAtencion", /*crearNuevaAtencion*/ ctx[5]);

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
    			span0.textContent = `${/*abreviacionNombre*/ ctx[3] || "?"}`;
    			t3 = space();
    			div2 = element("div");
    			h50 = element("h5");
    			span1 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			t6 = text(t6_value);
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = space();
    			a0 = element("a");
    			i0 = element("i");
    			t10 = text(" ver\n                                        datos");
    			t11 = space();
    			div1 = element("div");
    			span2 = element("span");
    			t12 = text(t12_value);
    			t13 = text(" años");
    			t14 = text(" | ");
    			span3 = element("span");
    			t15 = text(t15_value);
    			t16 = space();
    			div6 = element("div");
    			div5 = element("div");
    			a1 = element("a");
    			i1 = element("i");
    			t17 = text("\n                                Iniciar nueva atención");
    			t18 = space();
    			div129 = element("div");
    			div128 = element("div");
    			div127 = element("div");
    			div88 = element("div");
    			div15 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			i2 = element("i");
    			t19 = text("\n                            Comentario");
    			t20 = space();
    			div14 = element("div");
    			textarea = element("textarea");
    			t21 = space();
    			div39 = element("div");
    			div18 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			i3 = element("i");
    			t22 = text("\n                            Ultimos Signo Vitales");
    			t23 = space();
    			div21 = element("div");
    			div20 = element("div");
    			a2 = element("a");
    			i4 = element("i");
    			t24 = space();
    			div19 = element("div");
    			button0 = element("button");
    			button0.textContent = "Action";
    			t26 = space();
    			button1 = element("button");
    			button1.textContent = "Another action";
    			t28 = space();
    			button2 = element("button");
    			button2.textContent = "Something else here";
    			t30 = space();
    			div38 = element("div");
    			div37 = element("div");
    			div24 = element("div");
    			div22 = element("div");
    			i5 = element("i");
    			t31 = text(" Peso");
    			t32 = space();
    			div23 = element("div");
    			p0 = element("p");
    			p0.textContent = "0Lb";
    			t34 = space();
    			div27 = element("div");
    			div25 = element("div");
    			i6 = element("i");
    			t35 = text(" Temperatura");
    			t36 = space();
    			div26 = element("div");
    			p1 = element("p");
    			p1.textContent = "0°C";
    			t38 = space();
    			div30 = element("div");
    			div28 = element("div");
    			i7 = element("i");
    			t39 = text(" Frecuencia Respiratoria");
    			t40 = space();
    			div29 = element("div");
    			p2 = element("p");
    			p2.textContent = "0";
    			t42 = space();
    			div33 = element("div");
    			div31 = element("div");
    			i8 = element("i");
    			t43 = text(" Frecuencia Cardiaca");
    			t44 = space();
    			div32 = element("div");
    			p3 = element("p");
    			p3.textContent = "0";
    			t46 = space();
    			div36 = element("div");
    			div34 = element("div");
    			i9 = element("i");
    			t47 = text("  Presion Alterial (mmHg)");
    			t48 = space();
    			div35 = element("div");
    			p4 = element("p");
    			p4.textContent = "0/0";
    			t50 = space();
    			div87 = element("div");
    			div40 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Archivos o Documentos";
    			t52 = space();
    			p5 = element("p");
    			p5.textContent = "Puede subir documentos del paciente, como fotos de laboratorios, recetas entre otros.";
    			t54 = space();
    			div86 = element("div");
    			form = element("form");
    			div42 = element("div");
    			h1 = element("h1");
    			i10 = element("i");
    			t55 = text("\n                                    Puede arrastrar el documento a esta zona.");
    			br0 = element("br");
    			t56 = space();
    			span4 = element("span");
    			span4.textContent = "(Tambien puede hacer clic y seleccionar el archivo,\n                                        luego presione subir archivo).";
    			t58 = space();
    			div41 = element("div");
    			a3 = element("a");
    			a3.textContent = "Subir Archivo";
    			t60 = space();
    			br1 = element("br");
    			t61 = space();
    			div85 = element("div");
    			div52 = element("div");
    			div45 = element("div");
    			div44 = element("div");
    			div43 = element("div");
    			i11 = element("i");
    			t62 = space();
    			div48 = element("div");
    			div46 = element("div");
    			div46.textContent = "SRS Document";
    			t64 = space();
    			div47 = element("div");
    			div47.textContent = "25.5 Mb";
    			t66 = space();
    			div51 = element("div");
    			div50 = element("div");
    			a4 = element("a");
    			i12 = element("i");
    			t67 = space();
    			div49 = element("div");
    			button3 = element("button");
    			button3.textContent = "Action";
    			t69 = space();
    			button4 = element("button");
    			button4.textContent = "Another action";
    			t71 = space();
    			button5 = element("button");
    			button5.textContent = "Something else here";
    			t73 = space();
    			div62 = element("div");
    			div55 = element("div");
    			div54 = element("div");
    			div53 = element("div");
    			i13 = element("i");
    			t74 = space();
    			div58 = element("div");
    			div56 = element("div");
    			div56.textContent = "Design Guide.pdf";
    			t76 = space();
    			div57 = element("div");
    			div57.textContent = "9 Mb";
    			t78 = space();
    			div61 = element("div");
    			div60 = element("div");
    			a5 = element("a");
    			i14 = element("i");
    			t79 = space();
    			div59 = element("div");
    			button6 = element("button");
    			button6.textContent = "Action";
    			t81 = space();
    			button7 = element("button");
    			button7.textContent = "Another action";
    			t83 = space();
    			button8 = element("button");
    			button8.textContent = "Something else here";
    			t85 = space();
    			div73 = element("div");
    			div66 = element("div");
    			div65 = element("div");
    			div64 = element("div");
    			div63 = element("div");
    			i15 = element("i");
    			t86 = space();
    			div69 = element("div");
    			div67 = element("div");
    			div67.textContent = "response.json";
    			t88 = space();
    			div68 = element("div");
    			div68.textContent = "15 Kb";
    			t90 = space();
    			div72 = element("div");
    			div71 = element("div");
    			a6 = element("a");
    			i16 = element("i");
    			t91 = space();
    			div70 = element("div");
    			button9 = element("button");
    			button9.textContent = "Action";
    			t93 = space();
    			button10 = element("button");
    			button10.textContent = "Another action";
    			t95 = space();
    			button11 = element("button");
    			button11.textContent = "Something else here";
    			t97 = space();
    			div84 = element("div");
    			div77 = element("div");
    			div76 = element("div");
    			div75 = element("div");
    			div74 = element("div");
    			i17 = element("i");
    			t98 = space();
    			div80 = element("div");
    			div78 = element("div");
    			div78.textContent = "June Accounts.xls";
    			t100 = space();
    			div79 = element("div");
    			div79.textContent = "6 Mb";
    			t102 = space();
    			div83 = element("div");
    			div82 = element("div");
    			a7 = element("a");
    			i18 = element("i");
    			t103 = space();
    			div81 = element("div");
    			button12 = element("button");
    			button12.textContent = "Action";
    			t105 = space();
    			button13 = element("button");
    			button13.textContent = "Another action";
    			t107 = space();
    			button14 = element("button");
    			button14.textContent = "Something else here";
    			t109 = space();
    			div114 = element("div");
    			div105 = element("div");
    			div91 = element("div");
    			div90 = element("div");
    			div89 = element("div");
    			i19 = element("i");
    			t110 = text("\n                            Antecedentes");
    			t111 = space();
    			div104 = element("div");
    			div103 = element("div");
    			div94 = element("div");
    			h60 = element("h6");
    			h60.textContent = "Alergias";
    			t113 = space();
    			hr0 = element("hr");
    			t114 = space();
    			div92 = element("div");
    			t115 = space();
    			div93 = element("div");
    			strong0 = element("strong");
    			strong0.textContent = "No hay ningula alergia registrada";
    			t117 = space();
    			div102 = element("div");
    			div101 = element("div");
    			h61 = element("h6");
    			h61.textContent = "Antecedentes Patologicos";
    			t119 = space();
    			hr1 = element("hr");
    			t120 = space();
    			div96 = element("div");
    			div95 = element("div");
    			strong1 = element("strong");
    			strong1.textContent = "Ninguno registrado";
    			t122 = space();
    			h62 = element("h6");
    			h62.textContent = "Antecedentes no Patologicos";
    			t124 = space();
    			hr2 = element("hr");
    			t125 = space();
    			div98 = element("div");
    			div97 = element("div");
    			strong2 = element("strong");
    			strong2.textContent = "Ninguno registrado";
    			t127 = space();
    			h63 = element("h6");
    			h63.textContent = "Antecedentes Psiquiátricos";
    			t129 = space();
    			hr3 = element("hr");
    			t130 = space();
    			div100 = element("div");
    			div99 = element("div");
    			strong3 = element("strong");
    			strong3.textContent = "Ninguno registrado";
    			t132 = space();
    			div113 = element("div");
    			div108 = element("div");
    			div107 = element("div");
    			div106 = element("div");
    			i20 = element("i");
    			t133 = text("\n                            Medicamentos en uso");
    			t134 = space();
    			div112 = element("div");
    			div110 = element("div");
    			input = element("input");
    			t135 = space();
    			ul = element("ul");
    			div109 = element("div");
    			li0 = element("li");
    			a8 = element("a");
    			a8.textContent = "Metrocaps";
    			t137 = space();
    			li1 = element("li");
    			a9 = element("a");
    			a9.textContent = "Albendazol";
    			t139 = space();
    			li2 = element("li");
    			a10 = element("a");
    			i21 = element("i");
    			t140 = text(" Agregar manualmente");
    			t141 = space();
    			div111 = element("div");
    			t142 = text("AirPlus\n                                ");
    			button15 = element("button");
    			span5 = element("span");
    			span5.textContent = "×";
    			t144 = space();
    			div126 = element("div");
    			div118 = element("div");
    			div117 = element("div");
    			div116 = element("div");
    			div115 = element("div");
    			i22 = element("i");
    			t145 = text("\n                            Atenciones Recibidas");
    			t146 = space();
    			div125 = element("div");
    			div124 = element("div");
    			div123 = element("div");
    			div122 = element("div");
    			div121 = element("div");
    			strong4 = element("strong");
    			strong4.textContent = "4/5/2020";
    			t148 = space();
    			i23 = element("i");
    			t149 = space();
    			div119 = element("div");
    			div119.textContent = "Mariela Camilo";
    			t151 = space();
    			div120 = element("div");
    			div120.textContent = "Atención Ambulatoria";
    			t153 = space();
    			a11 = element("a");
    			i24 = element("i");
    			t154 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			t155 = space();
    			create_component(modalnuevaatencion.$$.fragment);
    			attr_dev(span0, "class", "avatar-title rounded-circle");
    			add_location(span0, file$7, 144, 32, 4140);
    			attr_dev(div0, "class", "avatar mr-3  avatar-xl");
    			add_location(div0, file$7, 143, 28, 4071);
    			add_location(span1, file$7, 147, 50, 4361);
    			attr_dev(i0, "class", "mdi mdi-comment-eye");
    			add_location(i0, file$7, 147, 240, 4551);
    			attr_dev(a0, "href", "#!");
    			attr_dev(a0, "class", "btn ml-2 btn-primary btn-sm");
    			attr_dev(a0, "data-toggle", "modal");
    			attr_dev(a0, "data-target", "#modalDatosPersonales");
    			add_location(a0, file$7, 147, 135, 4446);
    			attr_dev(h50, "class", "mt-0");
    			add_location(h50, file$7, 147, 32, 4343);
    			add_location(span2, file$7, 149, 56, 4702);
    			add_location(span3, file$7, 149, 117, 4763);
    			attr_dev(div1, "class", "opacity-75");
    			add_location(div1, file$7, 149, 32, 4678);
    			attr_dev(div2, "class", "media-body m-auto");
    			add_location(div2, file$7, 146, 28, 4279);
    			attr_dev(div3, "class", "media");
    			add_location(div3, file$7, 142, 24, 4023);
    			attr_dev(div4, "class", "col-md-6 text-white p-b-30");
    			add_location(div4, file$7, 141, 20, 3958);
    			attr_dev(i1, "class", "mdi mdi-progress-check");
    			add_location(i1, file$7, 157, 166, 5178);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "type", "button");
    			attr_dev(a1, "class", "btn text-white m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			attr_dev(a1, "data-toggle", "modal");
    			attr_dev(a1, "data-target", "#modalNuevaAtencion");
    			add_location(a1, file$7, 157, 28, 5040);
    			attr_dev(div5, "class", "dropdown");
    			add_location(div5, file$7, 156, 24, 4989);
    			attr_dev(div6, "class", "col-md-6");
    			set_style(div6, "text-align", "right");
    			add_location(div6, file$7, 155, 20, 4916);
    			attr_dev(div7, "class", "row p-b-60 p-t-60");
    			add_location(div7, file$7, 140, 16, 3906);
    			attr_dev(div8, "class", "col-md-12");
    			add_location(div8, file$7, 139, 12, 3866);
    			attr_dev(div9, "class", "");
    			add_location(div9, file$7, 138, 8, 3839);
    			attr_dev(div10, "class", "bg-dark m-b-30");
    			add_location(div10, file$7, 137, 4, 3802);
    			attr_dev(i2, "class", "mdi mdi-comment-account-outline mdi-18px");
    			add_location(i2, file$7, 178, 36, 5840);
    			attr_dev(div11, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div11, file$7, 177, 32, 5754);
    			attr_dev(div12, "class", "avatar mr-2 avatar-xs");
    			add_location(div12, file$7, 176, 28, 5686);
    			attr_dev(div13, "class", "card-header");
    			add_location(div13, file$7, 175, 24, 5632);
    			attr_dev(textarea, "class", "form-control mt-2");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			attr_dev(textarea, "id", "exampleFormControlTextarea1");
    			textarea.readOnly = "";
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "Comentario");
    			add_location(textarea, file$7, 184, 28, 6128);
    			attr_dev(div14, "class", "form-group col-lg-12");
    			add_location(div14, file$7, 183, 24, 6065);
    			attr_dev(div15, "class", "card m-b-30");
    			add_location(div15, file$7, 174, 20, 5582);
    			attr_dev(i3, "class", "mdi mdi-account-heart mdi-18px");
    			add_location(i3, file$7, 192, 36, 6622);
    			attr_dev(div16, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div16, file$7, 191, 32, 6536);
    			attr_dev(div17, "class", "avatar mr-2 avatar-xs");
    			add_location(div17, file$7, 190, 28, 6468);
    			attr_dev(div18, "class", "card-header");
    			add_location(div18, file$7, 189, 24, 6414);
    			attr_dev(i4, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i4, file$7, 199, 112, 7039);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "data-toggle", "dropdown");
    			attr_dev(a2, "aria-haspopup", "true");
    			attr_dev(a2, "aria-expanded", "false");
    			add_location(a2, file$7, 199, 32, 6959);
    			attr_dev(button0, "class", "dropdown-item");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$7, 202, 36, 7205);
    			attr_dev(button1, "class", "dropdown-item");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$7, 203, 36, 7301);
    			attr_dev(button2, "class", "dropdown-item");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file$7, 204, 36, 7405);
    			attr_dev(div19, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div19, file$7, 201, 32, 7121);
    			attr_dev(div20, "class", "dropdown");
    			add_location(div20, file$7, 198, 28, 6904);
    			attr_dev(div21, "class", "card-controls");
    			add_location(div21, file$7, 197, 24, 6848);
    			attr_dev(i5, "class", "mdi mdi-speedometer mdi-18px");
    			add_location(i5, file$7, 214, 40, 7875);
    			attr_dev(div22, "class", "col-lg-9 col-sm-10");
    			add_location(div22, file$7, 213, 36, 7802);
    			add_location(p0, file$7, 217, 40, 8076);
    			attr_dev(div23, "class", "col-lg-3 col-sm-2");
    			add_location(div23, file$7, 216, 36, 8004);
    			attr_dev(div24, "class", "row");
    			add_location(div24, file$7, 212, 32, 7748);
    			attr_dev(i6, "class", "mdi mdi-thermometer mdi-18px");
    			add_location(i6, file$7, 223, 40, 8329);
    			attr_dev(div25, "class", "col-lg-9 col-sm-10");
    			add_location(div25, file$7, 222, 36, 8256);
    			add_location(p1, file$7, 226, 40, 8537);
    			attr_dev(div26, "class", "col-lg-3 col-sm-2");
    			add_location(div26, file$7, 225, 36, 8465);
    			attr_dev(div27, "class", "row");
    			add_location(div27, file$7, 221, 32, 8202);
    			attr_dev(i7, "class", "mdi mdi-chart-line mdi-18px");
    			add_location(i7, file$7, 231, 40, 8789);
    			attr_dev(div28, "class", "col-lg-9 col-sm-10");
    			add_location(div28, file$7, 230, 36, 8716);
    			add_location(p2, file$7, 234, 40, 9008);
    			attr_dev(div29, "class", "col-lg-3 col-sm-2");
    			add_location(div29, file$7, 233, 36, 8936);
    			attr_dev(div30, "class", "row");
    			add_location(div30, file$7, 229, 32, 8662);
    			attr_dev(i8, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i8, file$7, 239, 40, 9258);
    			attr_dev(div31, "class", "col-lg-9 col-sm-10");
    			add_location(div31, file$7, 238, 36, 9185);
    			add_location(p3, file$7, 242, 40, 9474);
    			attr_dev(div32, "class", "col-lg-3 col-sm-2");
    			add_location(div32, file$7, 241, 36, 9402);
    			attr_dev(div33, "class", "row");
    			add_location(div33, file$7, 237, 32, 9131);
    			attr_dev(i9, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i9, file$7, 247, 40, 9724);
    			attr_dev(div34, "class", "col-lg-9 col-sm-10");
    			add_location(div34, file$7, 246, 36, 9651);
    			add_location(p4, file$7, 250, 40, 9946);
    			attr_dev(div35, "class", "col-lg-3 col-sm-2");
    			add_location(div35, file$7, 249, 36, 9874);
    			attr_dev(div36, "class", "row");
    			add_location(div36, file$7, 245, 32, 9597);
    			attr_dev(div37, "class", "list-group-item ");
    			add_location(div37, file$7, 210, 28, 7684);
    			attr_dev(div38, "class", "list-group list  list-group-flush");
    			add_location(div38, file$7, 208, 24, 7607);
    			attr_dev(div39, "class", "card m-b-30");
    			add_location(div39, file$7, 188, 20, 6364);
    			attr_dev(h51, "class", "m-b-0");
    			add_location(h51, file$7, 261, 28, 10308);
    			attr_dev(p5, "class", "m-b-0 mt-2 text-muted");
    			add_location(p5, file$7, 264, 28, 10443);
    			attr_dev(div40, "class", "card-header");
    			add_location(div40, file$7, 260, 24, 10254);
    			attr_dev(i10, "class", " mdi mdi-progress-upload");
    			add_location(i10, file$7, 272, 40, 10939);
    			attr_dev(h1, "class", "display-4");
    			add_location(h1, file$7, 271, 36, 10876);
    			add_location(br0, file$7, 274, 77, 11099);
    			attr_dev(span4, "class", "note needsclick");
    			add_location(span4, file$7, 275, 36, 11140);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "btn btn-lg btn-primary");
    			add_location(a3, file$7, 278, 40, 11396);
    			attr_dev(div41, "class", "p-t-5");
    			add_location(div41, file$7, 277, 36, 11336);
    			attr_dev(div42, "class", "dz-message");
    			add_location(div42, file$7, 270, 32, 10815);
    			attr_dev(form, "class", "dropzone dz-clickable");
    			attr_dev(form, "action", "/");
    			add_location(form, file$7, 269, 28, 10735);
    			add_location(br1, file$7, 282, 35, 11576);
    			attr_dev(i11, "class", "mdi mdi-24px mdi-file-pdf");
    			add_location(i11, file$7, 289, 86, 11958);
    			attr_dev(div43, "class", "avatar-title bg-dark rounded");
    			add_location(div43, file$7, 289, 44, 11916);
    			attr_dev(div44, "class", "avatar avatar-sm ");
    			add_location(div44, file$7, 288, 40, 11840);
    			attr_dev(div45, "class", "m-r-20");
    			add_location(div45, file$7, 287, 36, 11779);
    			add_location(div46, file$7, 293, 40, 12187);
    			attr_dev(div47, "class", "text-muted");
    			add_location(div47, file$7, 294, 40, 12251);
    			attr_dev(div48, "class", "");
    			add_location(div48, file$7, 292, 36, 12132);
    			attr_dev(i12, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i12, file$7, 299, 124, 12578);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "data-toggle", "dropdown");
    			attr_dev(a4, "aria-haspopup", "true");
    			attr_dev(a4, "aria-expanded", "false");
    			add_location(a4, file$7, 299, 44, 12498);
    			attr_dev(button3, "class", "dropdown-item");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file$7, 303, 48, 12816);
    			attr_dev(button4, "class", "dropdown-item");
    			attr_dev(button4, "type", "button");
    			add_location(button4, file$7, 304, 48, 12924);
    			attr_dev(button5, "class", "dropdown-item");
    			attr_dev(button5, "type", "button");
    			add_location(button5, file$7, 305, 48, 13040);
    			attr_dev(div49, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div49, file$7, 302, 44, 12720);
    			attr_dev(div50, "class", "dropdown");
    			add_location(div50, file$7, 298, 40, 12431);
    			attr_dev(div51, "class", "ml-auto");
    			add_location(div51, file$7, 297, 36, 12369);
    			attr_dev(div52, "class", "list-group-item d-flex  align-items-center");
    			add_location(div52, file$7, 286, 32, 11686);
    			attr_dev(i13, "class", "mdi mdi-24px mdi-file-document-box");
    			add_location(i13, file$7, 314, 86, 13598);
    			attr_dev(div53, "class", "avatar-title bg-dark rounded");
    			add_location(div53, file$7, 314, 44, 13556);
    			attr_dev(div54, "class", "avatar avatar-sm ");
    			add_location(div54, file$7, 313, 40, 13480);
    			attr_dev(div55, "class", "m-r-20");
    			add_location(div55, file$7, 312, 36, 13419);
    			add_location(div56, file$7, 318, 40, 13836);
    			attr_dev(div57, "class", "text-muted");
    			add_location(div57, file$7, 319, 40, 13904);
    			attr_dev(div58, "class", "");
    			add_location(div58, file$7, 317, 36, 13781);
    			attr_dev(i14, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i14, file$7, 324, 124, 14228);
    			attr_dev(a5, "href", "#!");
    			attr_dev(a5, "data-toggle", "dropdown");
    			attr_dev(a5, "aria-haspopup", "true");
    			attr_dev(a5, "aria-expanded", "false");
    			add_location(a5, file$7, 324, 44, 14148);
    			attr_dev(button6, "class", "dropdown-item");
    			attr_dev(button6, "type", "button");
    			add_location(button6, file$7, 328, 48, 14466);
    			attr_dev(button7, "class", "dropdown-item");
    			attr_dev(button7, "type", "button");
    			add_location(button7, file$7, 329, 48, 14574);
    			attr_dev(button8, "class", "dropdown-item");
    			attr_dev(button8, "type", "button");
    			add_location(button8, file$7, 330, 48, 14690);
    			attr_dev(div59, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div59, file$7, 327, 44, 14370);
    			attr_dev(div60, "class", "dropdown");
    			add_location(div60, file$7, 323, 40, 14081);
    			attr_dev(div61, "class", "ml-auto");
    			add_location(div61, file$7, 322, 36, 14019);
    			attr_dev(div62, "class", "list-group-item d-flex  align-items-center");
    			add_location(div62, file$7, 311, 32, 13326);
    			attr_dev(i15, "class", "mdi mdi-24px mdi-code-braces");
    			add_location(i15, file$7, 340, 83, 15321);
    			attr_dev(div63, "class", "avatar-title  rounded");
    			add_location(div63, file$7, 340, 48, 15286);
    			attr_dev(div64, "class", "avatar avatar-sm ");
    			add_location(div64, file$7, 339, 44, 15206);
    			attr_dev(div65, "class", "avatar avatar-sm ");
    			add_location(div65, file$7, 338, 40, 15130);
    			attr_dev(div66, "class", "m-r-20");
    			add_location(div66, file$7, 337, 36, 15069);
    			add_location(div67, file$7, 345, 40, 15604);
    			attr_dev(div68, "class", "text-muted");
    			add_location(div68, file$7, 346, 40, 15669);
    			attr_dev(div69, "class", "");
    			add_location(div69, file$7, 344, 36, 15549);
    			attr_dev(i16, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i16, file$7, 351, 124, 15994);
    			attr_dev(a6, "href", "#!");
    			attr_dev(a6, "data-toggle", "dropdown");
    			attr_dev(a6, "aria-haspopup", "true");
    			attr_dev(a6, "aria-expanded", "false");
    			add_location(a6, file$7, 351, 44, 15914);
    			attr_dev(button9, "class", "dropdown-item");
    			attr_dev(button9, "type", "button");
    			add_location(button9, file$7, 355, 48, 16232);
    			attr_dev(button10, "class", "dropdown-item");
    			attr_dev(button10, "type", "button");
    			add_location(button10, file$7, 356, 48, 16340);
    			attr_dev(button11, "class", "dropdown-item");
    			attr_dev(button11, "type", "button");
    			add_location(button11, file$7, 357, 48, 16456);
    			attr_dev(div70, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div70, file$7, 354, 44, 16136);
    			attr_dev(div71, "class", "dropdown");
    			add_location(div71, file$7, 350, 40, 15847);
    			attr_dev(div72, "class", "ml-auto");
    			add_location(div72, file$7, 349, 36, 15785);
    			attr_dev(div73, "class", "list-group-item d-flex  align-items-center");
    			add_location(div73, file$7, 336, 32, 14976);
    			attr_dev(i17, "class", "mdi mdi-24px mdi-file-excel");
    			add_location(i17, file$7, 367, 91, 17095);
    			attr_dev(div74, "class", "avatar-title bg-green rounded");
    			add_location(div74, file$7, 367, 48, 17052);
    			attr_dev(div75, "class", "avatar avatar-sm ");
    			add_location(div75, file$7, 366, 44, 16972);
    			attr_dev(div76, "class", "avatar avatar-sm ");
    			add_location(div76, file$7, 365, 40, 16896);
    			attr_dev(div77, "class", "m-r-20");
    			add_location(div77, file$7, 364, 36, 16835);
    			add_location(div78, file$7, 372, 40, 17377);
    			attr_dev(div79, "class", "text-muted");
    			add_location(div79, file$7, 373, 40, 17446);
    			attr_dev(div80, "class", "");
    			add_location(div80, file$7, 371, 36, 17322);
    			attr_dev(i18, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i18, file$7, 378, 124, 17770);
    			attr_dev(a7, "href", "#!");
    			attr_dev(a7, "data-toggle", "dropdown");
    			attr_dev(a7, "aria-haspopup", "true");
    			attr_dev(a7, "aria-expanded", "false");
    			add_location(a7, file$7, 378, 44, 17690);
    			attr_dev(button12, "class", "dropdown-item");
    			attr_dev(button12, "type", "button");
    			add_location(button12, file$7, 382, 48, 18008);
    			attr_dev(button13, "class", "dropdown-item");
    			attr_dev(button13, "type", "button");
    			add_location(button13, file$7, 383, 48, 18116);
    			attr_dev(button14, "class", "dropdown-item");
    			attr_dev(button14, "type", "button");
    			add_location(button14, file$7, 384, 48, 18232);
    			attr_dev(div81, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div81, file$7, 381, 44, 17912);
    			attr_dev(div82, "class", "dropdown");
    			add_location(div82, file$7, 377, 40, 17623);
    			attr_dev(div83, "class", "ml-auto");
    			add_location(div83, file$7, 376, 36, 17561);
    			attr_dev(div84, "class", "list-group-item d-flex  align-items-center");
    			add_location(div84, file$7, 363, 32, 16742);
    			attr_dev(div85, "class", "list-group list-group-flush ");
    			add_location(div85, file$7, 284, 28, 11610);
    			attr_dev(div86, "class", "card-body");
    			add_location(div86, file$7, 268, 24, 10683);
    			attr_dev(div87, "class", "card m-b-30 d-none");
    			add_location(div87, file$7, 259, 20, 10197);
    			attr_dev(div88, "class", "col-lg-3");
    			add_location(div88, file$7, 172, 16, 5538);
    			attr_dev(i19, "class", "mdi mdi-history mdi-18px");
    			add_location(i19, file$7, 401, 36, 18922);
    			attr_dev(div89, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div89, file$7, 400, 32, 18836);
    			attr_dev(div90, "class", "avatar mr-2 avatar-xs");
    			add_location(div90, file$7, 399, 28, 18768);
    			attr_dev(div91, "class", "card-header");
    			add_location(div91, file$7, 398, 24, 18714);
    			add_location(h60, file$7, 409, 36, 19332);
    			add_location(hr0, file$7, 410, 36, 19386);
    			attr_dev(div92, "class", "alert alert-danger d-none");
    			attr_dev(div92, "role", "alert");
    			add_location(div92, file$7, 411, 36, 19427);
    			add_location(strong0, file$7, 413, 40, 19602);
    			attr_dev(div93, "class", "alert alert-light d-block");
    			add_location(div93, file$7, 412, 36, 19522);
    			attr_dev(div94, "class", "prueba col-md-12");
    			add_location(div94, file$7, 408, 32, 19265);
    			add_location(h61, file$7, 419, 40, 19883);
    			add_location(hr1, file$7, 420, 40, 19958);
    			attr_dev(strong1, "class", "text-muted");
    			add_location(strong1, file$7, 423, 48, 20148);
    			add_location(div95, file$7, 422, 44, 20094);
    			attr_dev(div96, "class", "alert alert-success");
    			attr_dev(div96, "role", "alert");
    			add_location(div96, file$7, 421, 40, 20003);
    			add_location(h62, file$7, 428, 40, 20503);
    			add_location(hr2, file$7, 429, 40, 20580);
    			attr_dev(strong2, "class", "text-muted");
    			add_location(strong2, file$7, 432, 48, 20770);
    			add_location(div97, file$7, 431, 44, 20716);
    			attr_dev(div98, "class", "alert alert-success");
    			attr_dev(div98, "role", "alert");
    			add_location(div98, file$7, 430, 40, 20625);
    			add_location(h63, file$7, 437, 40, 21125);
    			add_location(hr3, file$7, 438, 40, 21201);
    			attr_dev(strong3, "class", "text-muted");
    			add_location(strong3, file$7, 441, 48, 21391);
    			add_location(div99, file$7, 440, 44, 21337);
    			attr_dev(div100, "class", "alert alert-success");
    			attr_dev(div100, "role", "alert");
    			add_location(div100, file$7, 439, 40, 21246);
    			attr_dev(div101, "class", "prueba col-md-12");
    			add_location(div101, file$7, 418, 36, 19812);
    			add_location(div102, file$7, 417, 32, 19770);
    			attr_dev(div103, "class", "accordion ");
    			attr_dev(div103, "id", "accordionExample3");
    			add_location(div103, file$7, 407, 28, 19185);
    			attr_dev(div104, "class", "card-body");
    			add_location(div104, file$7, 406, 24, 19133);
    			attr_dev(div105, "class", "card m-b-30");
    			add_location(div105, file$7, 397, 20, 18664);
    			attr_dev(i20, "class", "mdi mdi-comment-account-outline mdi-18px");
    			add_location(i20, file$7, 456, 36, 22132);
    			attr_dev(div106, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div106, file$7, 455, 32, 22046);
    			attr_dev(div107, "class", "avatar mr-2 avatar-xs");
    			add_location(div107, file$7, 454, 28, 21978);
    			attr_dev(div108, "class", " card-header");
    			add_location(div108, file$7, 453, 24, 21923);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "name", "");
    			attr_dev(input, "id", "");
    			attr_dev(input, "data-toggle", "dropdown");
    			attr_dev(input, "aria-haspopup", "true");
    			attr_dev(input, "aria-expanded", "false");
    			add_location(input, file$7, 464, 32, 22492);
    			attr_dev(a8, "href", "#!");
    			add_location(a8, file$7, 468, 44, 22855);
    			add_location(li0, file$7, 467, 40, 22806);
    			attr_dev(a9, "href", "#!");
    			add_location(a9, file$7, 471, 44, 23017);
    			add_location(li1, file$7, 470, 40, 22968);
    			attr_dev(div109, "class", "contenidoLista");
    			add_location(div109, file$7, 466, 36, 22737);
    			attr_dev(i21, "class", "mdi mdi-plus");
    			add_location(i21, file$7, 475, 53, 23244);
    			attr_dev(a10, "href", "#!");
    			add_location(a10, file$7, 475, 40, 23231);
    			attr_dev(li2, "class", "defecto");
    			add_location(li2, file$7, 474, 36, 23170);
    			attr_dev(ul, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul, "id", "buscador");
    			add_location(ul, file$7, 465, 32, 22645);
    			attr_dev(div110, "class", "form-group buscardor dropdown");
    			add_location(div110, file$7, 463, 28, 22416);
    			attr_dev(span5, "aria-hidden", "true");
    			add_location(span5, file$7, 482, 36, 23702);
    			attr_dev(button15, "type", "button");
    			attr_dev(button15, "class", "close");
    			attr_dev(button15, "data-dismiss", "alert");
    			attr_dev(button15, "aria-label", "Close");
    			add_location(button15, file$7, 481, 32, 23589);
    			attr_dev(div111, "class", "alert alert-secondary alert-dismissible fade show");
    			attr_dev(div111, "role", "alert");
    			add_location(div111, file$7, 479, 28, 23440);
    			attr_dev(div112, "class", "col-12");
    			add_location(div112, file$7, 462, 24, 22367);
    			attr_dev(div113, "class", "card m-b-30 d-none");
    			add_location(div113, file$7, 452, 20, 21866);
    			attr_dev(div114, "class", "col-md-6 ");
    			add_location(div114, file$7, 396, 16, 18620);
    			attr_dev(i22, "class", "mdi mdi-progress-check mdi-18px");
    			add_location(i22, file$7, 553, 36, 27315);
    			attr_dev(div115, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div115, file$7, 552, 32, 27229);
    			attr_dev(div116, "class", "avatar mr-2 avatar-xs");
    			add_location(div116, file$7, 551, 28, 27161);
    			attr_dev(div117, "class", "card-header");
    			add_location(div117, file$7, 550, 24, 27107);
    			attr_dev(div118, "class", "card m-b-30");
    			add_location(div118, file$7, 549, 20, 27057);
    			add_location(strong4, file$7, 565, 40, 27886);
    			attr_dev(i23, "class", "mdi mdi-checkbox-blank-circle text-secondary");
    			add_location(i23, file$7, 566, 40, 27952);
    			add_location(div119, file$7, 567, 40, 28053);
    			add_location(div120, file$7, 568, 40, 28119);
    			attr_dev(div121, "class", "content");
    			add_location(div121, file$7, 564, 36, 27824);
    			attr_dev(div122, "class", "d-flex");
    			add_location(div122, file$7, 563, 32, 27767);
    			attr_dev(i24, "class", "mdi mdi-open-in-new");
    			add_location(i24, file$7, 572, 36, 28427);
    			attr_dev(a11, "class", "close");
    			attr_dev(a11, "data-toggle", "tooltip");
    			attr_dev(a11, "data-placement", "top");
    			attr_dev(a11, "data-original-title", "Ir");
    			attr_dev(a11, "href", "/AtencionMedica/Resumen");
    			add_location(a11, file$7, 571, 32, 28265);
    			attr_dev(div123, "class", "alert alert-border-success  alert-dismissible fade show");
    			attr_dev(div123, "role", "alert");
    			add_location(div123, file$7, 562, 28, 27652);
    			add_location(div124, file$7, 561, 24, 27618);
    			attr_dev(div125, "class", "atenciones-vnc");
    			add_location(div125, file$7, 560, 20, 27565);
    			attr_dev(div126, "class", "col-md-3");
    			add_location(div126, file$7, 491, 16, 23957);
    			attr_dev(div127, "class", "row");
    			add_location(div127, file$7, 169, 12, 5502);
    			attr_dev(div128, "class", "col-md-12");
    			add_location(div128, file$7, 168, 8, 5466);
    			attr_dev(div129, "class", "pull-up");
    			add_location(div129, file$7, 167, 4, 5436);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$7, 136, 2, 3766);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$7, 134, 0, 3725);
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
    			append_dev(span1, t4);
    			append_dev(span1, t5);
    			append_dev(span1, t6);
    			append_dev(span1, t7);
    			append_dev(span1, t8);
    			append_dev(h50, t9);
    			append_dev(h50, a0);
    			append_dev(a0, i0);
    			append_dev(a0, t10);
    			append_dev(div2, t11);
    			append_dev(div2, div1);
    			append_dev(div1, span2);
    			append_dev(span2, t12);
    			append_dev(span2, t13);
    			append_dev(div1, t14);
    			append_dev(div1, span3);
    			append_dev(span3, t15);
    			append_dev(div7, t16);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, a1);
    			append_dev(a1, i1);
    			append_dev(a1, t17);
    			append_dev(section, t18);
    			append_dev(section, div129);
    			append_dev(div129, div128);
    			append_dev(div128, div127);
    			append_dev(div127, div88);
    			append_dev(div88, div15);
    			append_dev(div15, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, i2);
    			append_dev(div13, t19);
    			append_dev(div15, t20);
    			append_dev(div15, div14);
    			append_dev(div14, textarea);
    			append_dev(div88, t21);
    			append_dev(div88, div39);
    			append_dev(div39, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, i3);
    			append_dev(div18, t22);
    			append_dev(div39, t23);
    			append_dev(div39, div21);
    			append_dev(div21, div20);
    			append_dev(div20, a2);
    			append_dev(a2, i4);
    			append_dev(div20, t24);
    			append_dev(div20, div19);
    			append_dev(div19, button0);
    			append_dev(div19, t26);
    			append_dev(div19, button1);
    			append_dev(div19, t28);
    			append_dev(div19, button2);
    			append_dev(div39, t30);
    			append_dev(div39, div38);
    			append_dev(div38, div37);
    			append_dev(div37, div24);
    			append_dev(div24, div22);
    			append_dev(div22, i5);
    			append_dev(div22, t31);
    			append_dev(div24, t32);
    			append_dev(div24, div23);
    			append_dev(div23, p0);
    			append_dev(div37, t34);
    			append_dev(div37, div27);
    			append_dev(div27, div25);
    			append_dev(div25, i6);
    			append_dev(div25, t35);
    			append_dev(div27, t36);
    			append_dev(div27, div26);
    			append_dev(div26, p1);
    			append_dev(div37, t38);
    			append_dev(div37, div30);
    			append_dev(div30, div28);
    			append_dev(div28, i7);
    			append_dev(div28, t39);
    			append_dev(div30, t40);
    			append_dev(div30, div29);
    			append_dev(div29, p2);
    			append_dev(div37, t42);
    			append_dev(div37, div33);
    			append_dev(div33, div31);
    			append_dev(div31, i8);
    			append_dev(div31, t43);
    			append_dev(div33, t44);
    			append_dev(div33, div32);
    			append_dev(div32, p3);
    			append_dev(div37, t46);
    			append_dev(div37, div36);
    			append_dev(div36, div34);
    			append_dev(div34, i9);
    			append_dev(div34, t47);
    			append_dev(div36, t48);
    			append_dev(div36, div35);
    			append_dev(div35, p4);
    			append_dev(div88, t50);
    			append_dev(div88, div87);
    			append_dev(div87, div40);
    			append_dev(div40, h51);
    			append_dev(div40, t52);
    			append_dev(div40, p5);
    			append_dev(div87, t54);
    			append_dev(div87, div86);
    			append_dev(div86, form);
    			append_dev(form, div42);
    			append_dev(div42, h1);
    			append_dev(h1, i10);
    			append_dev(div42, t55);
    			append_dev(div42, br0);
    			append_dev(div42, t56);
    			append_dev(div42, span4);
    			append_dev(div42, t58);
    			append_dev(div42, div41);
    			append_dev(div41, a3);
    			append_dev(form, t60);
    			append_dev(div86, br1);
    			append_dev(div86, t61);
    			append_dev(div86, div85);
    			append_dev(div85, div52);
    			append_dev(div52, div45);
    			append_dev(div45, div44);
    			append_dev(div44, div43);
    			append_dev(div43, i11);
    			append_dev(div52, t62);
    			append_dev(div52, div48);
    			append_dev(div48, div46);
    			append_dev(div48, t64);
    			append_dev(div48, div47);
    			append_dev(div52, t66);
    			append_dev(div52, div51);
    			append_dev(div51, div50);
    			append_dev(div50, a4);
    			append_dev(a4, i12);
    			append_dev(div50, t67);
    			append_dev(div50, div49);
    			append_dev(div49, button3);
    			append_dev(div49, t69);
    			append_dev(div49, button4);
    			append_dev(div49, t71);
    			append_dev(div49, button5);
    			append_dev(div85, t73);
    			append_dev(div85, div62);
    			append_dev(div62, div55);
    			append_dev(div55, div54);
    			append_dev(div54, div53);
    			append_dev(div53, i13);
    			append_dev(div62, t74);
    			append_dev(div62, div58);
    			append_dev(div58, div56);
    			append_dev(div58, t76);
    			append_dev(div58, div57);
    			append_dev(div62, t78);
    			append_dev(div62, div61);
    			append_dev(div61, div60);
    			append_dev(div60, a5);
    			append_dev(a5, i14);
    			append_dev(div60, t79);
    			append_dev(div60, div59);
    			append_dev(div59, button6);
    			append_dev(div59, t81);
    			append_dev(div59, button7);
    			append_dev(div59, t83);
    			append_dev(div59, button8);
    			append_dev(div85, t85);
    			append_dev(div85, div73);
    			append_dev(div73, div66);
    			append_dev(div66, div65);
    			append_dev(div65, div64);
    			append_dev(div64, div63);
    			append_dev(div63, i15);
    			append_dev(div73, t86);
    			append_dev(div73, div69);
    			append_dev(div69, div67);
    			append_dev(div69, t88);
    			append_dev(div69, div68);
    			append_dev(div73, t90);
    			append_dev(div73, div72);
    			append_dev(div72, div71);
    			append_dev(div71, a6);
    			append_dev(a6, i16);
    			append_dev(div71, t91);
    			append_dev(div71, div70);
    			append_dev(div70, button9);
    			append_dev(div70, t93);
    			append_dev(div70, button10);
    			append_dev(div70, t95);
    			append_dev(div70, button11);
    			append_dev(div85, t97);
    			append_dev(div85, div84);
    			append_dev(div84, div77);
    			append_dev(div77, div76);
    			append_dev(div76, div75);
    			append_dev(div75, div74);
    			append_dev(div74, i17);
    			append_dev(div84, t98);
    			append_dev(div84, div80);
    			append_dev(div80, div78);
    			append_dev(div80, t100);
    			append_dev(div80, div79);
    			append_dev(div84, t102);
    			append_dev(div84, div83);
    			append_dev(div83, div82);
    			append_dev(div82, a7);
    			append_dev(a7, i18);
    			append_dev(div82, t103);
    			append_dev(div82, div81);
    			append_dev(div81, button12);
    			append_dev(div81, t105);
    			append_dev(div81, button13);
    			append_dev(div81, t107);
    			append_dev(div81, button14);
    			append_dev(div127, t109);
    			append_dev(div127, div114);
    			append_dev(div114, div105);
    			append_dev(div105, div91);
    			append_dev(div91, div90);
    			append_dev(div90, div89);
    			append_dev(div89, i19);
    			append_dev(div91, t110);
    			append_dev(div105, t111);
    			append_dev(div105, div104);
    			append_dev(div104, div103);
    			append_dev(div103, div94);
    			append_dev(div94, h60);
    			append_dev(div94, t113);
    			append_dev(div94, hr0);
    			append_dev(div94, t114);
    			append_dev(div94, div92);
    			append_dev(div94, t115);
    			append_dev(div94, div93);
    			append_dev(div93, strong0);
    			append_dev(div103, t117);
    			append_dev(div103, div102);
    			append_dev(div102, div101);
    			append_dev(div101, h61);
    			append_dev(div101, t119);
    			append_dev(div101, hr1);
    			append_dev(div101, t120);
    			append_dev(div101, div96);
    			append_dev(div96, div95);
    			append_dev(div95, strong1);
    			append_dev(div101, t122);
    			append_dev(div101, h62);
    			append_dev(div101, t124);
    			append_dev(div101, hr2);
    			append_dev(div101, t125);
    			append_dev(div101, div98);
    			append_dev(div98, div97);
    			append_dev(div97, strong2);
    			append_dev(div101, t127);
    			append_dev(div101, h63);
    			append_dev(div101, t129);
    			append_dev(div101, hr3);
    			append_dev(div101, t130);
    			append_dev(div101, div100);
    			append_dev(div100, div99);
    			append_dev(div99, strong3);
    			append_dev(div114, t132);
    			append_dev(div114, div113);
    			append_dev(div113, div108);
    			append_dev(div108, div107);
    			append_dev(div107, div106);
    			append_dev(div106, i20);
    			append_dev(div108, t133);
    			append_dev(div113, t134);
    			append_dev(div113, div112);
    			append_dev(div112, div110);
    			append_dev(div110, input);
    			append_dev(div110, t135);
    			append_dev(div110, ul);
    			append_dev(ul, div109);
    			append_dev(div109, li0);
    			append_dev(li0, a8);
    			append_dev(div109, t137);
    			append_dev(div109, li1);
    			append_dev(li1, a9);
    			append_dev(ul, t139);
    			append_dev(ul, li2);
    			append_dev(li2, a10);
    			append_dev(a10, i21);
    			append_dev(a10, t140);
    			append_dev(div112, t141);
    			append_dev(div112, div111);
    			append_dev(div111, t142);
    			append_dev(div111, button15);
    			append_dev(button15, span5);
    			append_dev(div127, t144);
    			append_dev(div127, div126);
    			append_dev(div126, div118);
    			append_dev(div118, div117);
    			append_dev(div117, div116);
    			append_dev(div116, div115);
    			append_dev(div115, i22);
    			append_dev(div117, t145);
    			append_dev(div126, t146);
    			append_dev(div126, div125);
    			append_dev(div125, div124);
    			append_dev(div124, div123);
    			append_dev(div123, div122);
    			append_dev(div122, div121);
    			append_dev(div121, strong4);
    			append_dev(div121, t148);
    			append_dev(div121, i23);
    			append_dev(div121, t149);
    			append_dev(div121, div119);
    			append_dev(div121, t151);
    			append_dev(div121, div120);
    			append_dev(div123, t153);
    			append_dev(div123, a11);
    			append_dev(a11, i24);
    			insert_dev(target, t154, anchor);
    			mount_component(modaldatospaciente, target, anchor);
    			insert_dev(target, t155, anchor);
    			mount_component(modalnuevaatencion, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(link_action = link.call(null, a11));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*paciente*/ 1) && t4_value !== (t4_value = /*paciente*/ ctx[0].nombres + "")) set_data_dev(t4, t4_value);
    			if ((!current || dirty & /*paciente*/ 1) && t6_value !== (t6_value = /*paciente*/ ctx[0].primerApellido + "")) set_data_dev(t6, t6_value);
    			if ((!current || dirty & /*paciente*/ 1) && t8_value !== (t8_value = /*paciente*/ ctx[0].segundoApellido + "")) set_data_dev(t8, t8_value);
    			if ((!current || dirty & /*paciente*/ 1) && t12_value !== (t12_value = calcularEdad(/*paciente*/ ctx[0].fechaNacimiento) + "")) set_data_dev(t12, t12_value);
    			if ((!current || dirty & /*paciente*/ 1) && t15_value !== (t15_value = /*paciente*/ ctx[0].cedula + "")) set_data_dev(t15, t15_value);
    			const modalnuevaatencion_changes = {};
    			if (dirty & /*tiposAtenciones*/ 2) modalnuevaatencion_changes.tiposAtenciones = /*tiposAtenciones*/ ctx[1];

    			if (!updating_motivoConsulta && dirty & /*txtMotivoConsulta*/ 4) {
    				updating_motivoConsulta = true;
    				modalnuevaatencion_changes.motivoConsulta = /*txtMotivoConsulta*/ ctx[2];
    				add_flush_callback(() => updating_motivoConsulta = false);
    			}

    			modalnuevaatencion.$set(modalnuevaatencion_changes);
    		},
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
    			if (detaching) detach_dev(t154);
    			destroy_component(modaldatospaciente, detaching);
    			if (detaching) detach_dev(t155);
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
    	let { params } = $$props;
    	let paciente = {};
    	let abreviacionNombre = "";
    	let tiposAtenciones = [];
    	let tipoAtencionMedica = "A";
    	let txtMotivoConsulta = "";

    	const crearNuevaAtencion = () => {
    		const atencion = {
    			AseguradoraId: paciente.aseguradoraId,
    			CamaId: "345f61ab-259d-4259-ad6b-7583c2fe1dbf",
    			fechaIngreso: new Date().toISOString(),
    			PacienteId: paciente.id,
    			TipoId: tipoAtencionMedica,
    			AseguradoraId: paciente.aseguradoraId,
    			MedicoId: "4569d361-7f59-4840-b37a-e1c2ffbc9375",
    			EdadPaciente: `${calcularEdad(paciente.fechaNacimiento)}`
    		};

    		console.log(atencion);

    		const config = {
    			method: "post",
    			url: `${url}/atenciones`,
    			data: atencion
    		};

    		axios$1(config).then(res => {
    			console.log(res.data);

    			if (res.data.id) {
    				crearNotaMedica(res.data.id);
    			}
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const crearNotaMedica = idAtencion => {
    		const nota = {
    			AtencionId: idAtencion,
    			fecha: new Date().toISOString(),
    			MotivoConsulta: txtMotivoConsulta,
    			TipoNotaId: "I",
    			MedicoId: "4569d361-7f59-4840-b37a-e1c2ffbc9375"
    		};

    		const config = {
    			method: "post",
    			url: `${url}/notasmedicas`,
    			data: nota
    		};

    		axios$1(config).then(res => {
    			if (res.data) {
    				jQuery(".modal").modal("hide");
    				push(`/pacientes/${params.id}/AtencionMedica/HistoriaClinica/${res.data.id}`);
    			}

    			console.log(res.data);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const cargarTiposAtenciones = () => {
    		const config = {
    			method: "get",
    			url: `${url}/tipoatenciones`
    		};

    		axios$1(config).then(res => {
    			$$invalidate(1, tiposAtenciones = res.data);
    			console.log(res.data);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const cargarPaciente = () => {
    		const config = {
    			method: "get",
    			url: `${url}/pacientes/${params.id}`,
    			header: {}
    		};

    		axios$1(config).then(res => {
    			$$invalidate(0, paciente = res.data);
    			console.log(paciente);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const cargarHistoriasPaciente = () => {
    		const config = {
    			method: "get",
    			url: `${url}/atenciones/?Paciente=${params.id}`,
    			header: {}
    		};

    		axios$1(config).then(res => {
    			console.log(res.data);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	onMount(() => {
    		cargarPaciente();
    		cargarHistoriasPaciente();
    		cargarTiposAtenciones();
    	});

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Perfil> was created with unknown prop '${key}'`);
    	});

    	function modalnuevaatencion_motivoConsulta_binding(value) {
    		txtMotivoConsulta = value;
    		$$invalidate(2, txtMotivoConsulta);
    	}

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(6, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		link,
    		push,
    		onMount,
    		url,
    		calcularEdad,
    		axios: axios$1,
    		Header,
    		AsidePacientes,
    		ModalDatosPaciente,
    		ModalNuevaAtencion,
    		params,
    		paciente,
    		abreviacionNombre,
    		tiposAtenciones,
    		tipoAtencionMedica,
    		txtMotivoConsulta,
    		crearNuevaAtencion,
    		crearNotaMedica,
    		cargarTiposAtenciones,
    		cargarPaciente,
    		cargarHistoriasPaciente
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(6, params = $$props.params);
    		if ("paciente" in $$props) $$invalidate(0, paciente = $$props.paciente);
    		if ("abreviacionNombre" in $$props) $$invalidate(3, abreviacionNombre = $$props.abreviacionNombre);
    		if ("tiposAtenciones" in $$props) $$invalidate(1, tiposAtenciones = $$props.tiposAtenciones);
    		if ("tipoAtencionMedica" in $$props) $$invalidate(4, tipoAtencionMedica = $$props.tipoAtencionMedica);
    		if ("txtMotivoConsulta" in $$props) $$invalidate(2, txtMotivoConsulta = $$props.txtMotivoConsulta);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		paciente,
    		tiposAtenciones,
    		txtMotivoConsulta,
    		abreviacionNombre,
    		tipoAtencionMedica,
    		crearNuevaAtencion,
    		params,
    		modalnuevaatencion_motivoConsulta_binding
    	];
    }

    class Perfil extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { params: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Perfil",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*params*/ ctx[6] === undefined && !("params" in props)) {
    			console_1$2.warn("<Perfil> was created without expected prop 'params'");
    		}
    	}

    	get params() {
    		throw new Error("<Perfil>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Perfil>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/componentes/Select2.svelte generated by Svelte v3.29.0 */
    const file$8 = "src/componentes/Select2.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (23:4) {#each datos as item}
    function create_each_block$3(ctx) {
    	let option;
    	let t_value = /*item*/ ctx[5].nombre + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*item*/ ctx[5].id;
    			option.value = option.__value;
    			add_location(option, file$8, 23, 8, 515);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*datos*/ 2 && t_value !== (t_value = /*item*/ ctx[5].nombre + "")) set_data_dev(t, t_value);

    			if (dirty & /*datos*/ 2 && option_value_value !== (option_value_value = /*item*/ ctx[5].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(23:4) {#each datos as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let label_1;
    	let t0;
    	let t1;
    	let select;
    	let option;
    	let t2;
    	let t3;
    	let select_class_value;
    	let each_value = /*datos*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[3]);
    			t1 = space();
    			select = element("select");
    			option = element("option");
    			t2 = text(/*placeholder*/ ctx[2]);
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(label_1, "for", /*id*/ ctx[0]);
    			add_location(label_1, file$8, 15, 0, 319);
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file$8, 21, 4, 439);
    			attr_dev(select, "class", select_class_value = `form-control slt2 ${/*id*/ ctx[0]}`);
    			set_style(select, "width", "100%");
    			attr_dev(select, "id", /*id*/ ctx[0]);
    			add_location(select, file$8, 16, 0, 351);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label_1, anchor);
    			append_dev(label_1, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, select, anchor);
    			append_dev(select, option);
    			append_dev(option, t2);
    			append_dev(option, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label*/ 8) set_data_dev(t0, /*label*/ ctx[3]);

    			if (dirty & /*id*/ 1) {
    				attr_dev(label_1, "for", /*id*/ ctx[0]);
    			}

    			if (dirty & /*placeholder*/ 4) set_data_dev(t2, /*placeholder*/ ctx[2]);

    			if (dirty & /*datos*/ 2) {
    				each_value = /*datos*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*id*/ 1 && select_class_value !== (select_class_value = `form-control slt2 ${/*id*/ ctx[0]}`)) {
    				attr_dev(select, "class", select_class_value);
    			}

    			if (dirty & /*id*/ 1) {
    				attr_dev(select, "id", /*id*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label_1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
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
    	validate_slots("Select2", slots, []);
    	let { id } = $$props;
    	let { datos } = $$props;
    	let { valor } = $$props;
    	let { placeholder } = $$props;
    	let { label } = $$props;

    	onMount(() => {
    		jQuery(`#${id}`).select2({ placeholder: `${placeholder}` });

    		jQuery(`#${id}`).on("select2:select", e => {
    			$$invalidate(4, valor = e.params.data.id);
    		});
    	});

    	const writable_props = ["id", "datos", "valor", "placeholder", "label"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Select2> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("datos" in $$props) $$invalidate(1, datos = $$props.datos);
    		if ("valor" in $$props) $$invalidate(4, valor = $$props.valor);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("label" in $$props) $$invalidate(3, label = $$props.label);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		id,
    		datos,
    		valor,
    		placeholder,
    		label
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("datos" in $$props) $$invalidate(1, datos = $$props.datos);
    		if ("valor" in $$props) $$invalidate(4, valor = $$props.valor);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("label" in $$props) $$invalidate(3, label = $$props.label);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, datos, placeholder, label, valor];
    }

    class Select2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			id: 0,
    			datos: 1,
    			valor: 4,
    			placeholder: 2,
    			label: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Select2",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !("id" in props)) {
    			console.warn("<Select2> was created without expected prop 'id'");
    		}

    		if (/*datos*/ ctx[1] === undefined && !("datos" in props)) {
    			console.warn("<Select2> was created without expected prop 'datos'");
    		}

    		if (/*valor*/ ctx[4] === undefined && !("valor" in props)) {
    			console.warn("<Select2> was created without expected prop 'valor'");
    		}

    		if (/*placeholder*/ ctx[2] === undefined && !("placeholder" in props)) {
    			console.warn("<Select2> was created without expected prop 'placeholder'");
    		}

    		if (/*label*/ ctx[3] === undefined && !("label" in props)) {
    			console.warn("<Select2> was created without expected prop 'label'");
    		}
    	}

    	get id() {
    		throw new Error("<Select2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Select2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get datos() {
    		throw new Error("<Select2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set datos(value) {
    		throw new Error("<Select2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valor() {
    		throw new Error("<Select2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valor(value) {
    		throw new Error("<Select2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Select2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Select2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Select2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Select2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Pages/Paciente/Editar.svelte generated by Svelte v3.29.0 */

    const { console: console_1$3 } = globals;
    const file$9 = "src/Pages/Paciente/Editar.svelte";

    function create_fragment$a(ctx) {
    	let asidepacientes;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div31;
    	let div30;
    	let div0;
    	let h50;
    	let t3;
    	let div29;
    	let div28;
    	let div27;
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
    	let div19;
    	let div17;
    	let select20;
    	let updating_valor;
    	let t47;
    	let div18;
    	let label10;
    	let t49;
    	let input9;
    	let t50;
    	let br2;
    	let t51;
    	let h52;
    	let br3;
    	let t53;
    	let hr1;
    	let t54;
    	let div22;
    	let div20;
    	let select21;
    	let updating_valor_1;
    	let t55;
    	let div21;
    	let select22;
    	let updating_valor_2;
    	let t56;
    	let div25;
    	let div23;
    	let label11;
    	let t58;
    	let input10;
    	let t59;
    	let div24;
    	let label12;
    	let t61;
    	let input11;
    	let t62;
    	let div26;
    	let button0;
    	let t64;
    	let button1;
    	let i;
    	let t65;
    	let current;
    	let mounted;
    	let dispose;
    	asidepacientes = new AsidePacientes({ $$inline: true });
    	header = new Header({ $$inline: true });

    	function select20_valor_binding(value) {
    		/*select20_valor_binding*/ ctx[30].call(null, value);
    	}

    	let select20_props = {
    		id: "sltAseguradoras",
    		datos: /*aseguradoras*/ ctx[1],
    		placeholder: " - seleccionar aseguradora - ",
    		label: "Aseguradora"
    	};

    	if (/*aseguradora*/ ctx[0] !== void 0) {
    		select20_props.valor = /*aseguradora*/ ctx[0];
    	}

    	select20 = new Select2({ props: select20_props, $$inline: true });
    	binding_callbacks.push(() => bind(select20, "valor", select20_valor_binding));

    	function select21_valor_binding(value) {
    		/*select21_valor_binding*/ ctx[32].call(null, value);
    	}

    	let select21_props = {
    		id: "sltNacionalidad",
    		datos: /*nacionalidades*/ ctx[3],
    		placeholder: " - seleccionar nacionalidad - ",
    		label: "Nacionalidad"
    	};

    	if (/*nacionalidad*/ ctx[2] !== void 0) {
    		select21_props.valor = /*nacionalidad*/ ctx[2];
    	}

    	select21 = new Select2({ props: select21_props, $$inline: true });
    	binding_callbacks.push(() => bind(select21, "valor", select21_valor_binding));

    	function select22_valor_binding(value) {
    		/*select22_valor_binding*/ ctx[33].call(null, value);
    	}

    	let select22_props = {
    		id: "sltProvincias",
    		datos: /*provincias*/ ctx[5],
    		placeholder: " - seleccionar provincia - ",
    		label: "Estado / provincia"
    	};

    	if (/*provincia*/ ctx[4] !== void 0) {
    		select22_props.valor = /*provincia*/ ctx[4];
    	}

    	select22 = new Select2({ props: select22_props, $$inline: true });
    	binding_callbacks.push(() => bind(select22, "valor", select22_valor_binding));

    	const block = {
    		c: function create() {
    			create_component(asidepacientes.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			section = element("section");
    			div31 = element("div");
    			div30 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			h50.textContent = "Nuevo Paciente";
    			t3 = space();
    			div29 = element("div");
    			div28 = element("div");
    			div27 = element("div");
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
    			div19 = element("div");
    			div17 = element("div");
    			create_component(select20.$$.fragment);
    			t47 = space();
    			div18 = element("div");
    			label10 = element("label");
    			label10.textContent = "No. Afiliado";
    			t49 = space();
    			input9 = element("input");
    			t50 = space();
    			br2 = element("br");
    			t51 = space();
    			h52 = element("h5");
    			h52.textContent = "Datos demográficos";
    			br3 = element("br");
    			t53 = space();
    			hr1 = element("hr");
    			t54 = space();
    			div22 = element("div");
    			div20 = element("div");
    			create_component(select21.$$.fragment);
    			t55 = space();
    			div21 = element("div");
    			create_component(select22.$$.fragment);
    			t56 = space();
    			div25 = element("div");
    			div23 = element("div");
    			label11 = element("label");
    			label11.textContent = "Dirección";
    			t58 = space();
    			input10 = element("input");
    			t59 = space();
    			div24 = element("div");
    			label12 = element("label");
    			label12.textContent = "Ciudad";
    			t61 = space();
    			input11 = element("input");
    			t62 = space();
    			div26 = element("div");
    			button0 = element("button");
    			button0.textContent = "Limpiar";
    			t64 = space();
    			button1 = element("button");
    			i = element("i");
    			t65 = text("\n                        Guardar paciente");
    			attr_dev(h50, "class", "m-b-0");
    			add_location(h50, file$9, 125, 4, 3322);
    			attr_dev(div0, "class", "card-header");
    			add_location(div0, file$9, 124, 0, 3292);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "idPaciente");
    			input0.value = "";
    			add_location(input0, file$9, 135, 16, 3580);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$9, 138, 24, 3746);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "name", "Cedula");
    			attr_dev(input1, "id", "txtCedula");
    			attr_dev(input1, "pattern", "^[0-9]+$");
    			attr_dev(input1, "maxlength", "11");
    			add_location(input1, file$9, 139, 24, 3811);
    			attr_dev(div1, "class", "form-group col-md-6");
    			add_location(div1, file$9, 137, 20, 3688);
    			attr_dev(div2, "class", "form-row");
    			add_location(div2, file$9, 136, 16, 3645);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$9, 144, 24, 4103);
    			attr_dev(input2, "type", "name");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "name", "Nombres");
    			attr_dev(input2, "max", "100");
    			input2.required = "";
    			add_location(input2, file$9, 145, 24, 4159);
    			attr_dev(div3, "class", "form-group col-md-12");
    			add_location(div3, file$9, 143, 20, 4044);
    			attr_dev(div4, "class", "form-row");
    			add_location(div4, file$9, 142, 16, 4001);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$9, 150, 24, 4425);
    			attr_dev(input3, "type", "last-name");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "name", "PrimerApellido");
    			attr_dev(input3, "max", "100");
    			input3.required = "";
    			add_location(input3, file$9, 151, 24, 4487);
    			attr_dev(div5, "class", "form-group col-md-6");
    			add_location(div5, file$9, 149, 20, 4367);
    			attr_dev(label3, "for", "");
    			add_location(label3, file$9, 154, 24, 4710);
    			attr_dev(input4, "type", "last-name");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "name", "SegundoApellido");
    			attr_dev(input4, "id", "txtApellido");
    			attr_dev(input4, "max", "100");
    			add_location(input4, file$9, 155, 24, 4773);
    			attr_dev(div6, "class", "form-group col-md-6");
    			add_location(div6, file$9, 153, 20, 4652);
    			attr_dev(div7, "class", "form-row");
    			add_location(div7, file$9, 148, 16, 4324);
    			attr_dev(label4, "for", "");
    			add_location(label4, file$9, 161, 24, 5066);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$9, 163, 28, 5229);
    			option1.__value = "M";
    			option1.value = option1.__value;
    			add_location(option1, file$9, 164, 28, 5299);
    			option2.__value = "F";
    			option2.value = option2.__value;
    			add_location(option2, file$9, 165, 28, 5364);
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "name", "Sexo");
    			attr_dev(select0, "id", "slSexo");
    			select0.required = "";
    			if (/*sexo*/ ctx[10] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[24].call(select0));
    			add_location(select0, file$9, 162, 24, 5117);
    			attr_dev(div8, "class", "form-group col-md-6");
    			add_location(div8, file$9, 160, 20, 5008);
    			attr_dev(label5, "for", "txtFechaNacimiento");
    			add_location(label5, file$9, 170, 24, 5540);
    			attr_dev(input5, "type", "date");
    			attr_dev(input5, "name", "FechaNacimiento");
    			attr_dev(input5, "class", "form-control");
    			attr_dev(input5, "id", "txtFechaNacimiento");
    			attr_dev(input5, "autocomplete", "off");
    			input5.required = "";
    			add_location(input5, file$9, 171, 24, 5624);
    			attr_dev(div9, "class", "col-md-6 form-group");
    			add_location(div9, file$9, 169, 20, 5482);
    			attr_dev(div10, "class", "form-row");
    			add_location(div10, file$9, 159, 16, 4965);
    			attr_dev(label6, "for", "");
    			add_location(label6, file$9, 186, 24, 6163);
    			attr_dev(input6, "type", "text");
    			attr_dev(input6, "class", "form-control");
    			attr_dev(input6, "name", "Telefono");
    			attr_dev(input6, "id", "txtTelefono");
    			attr_dev(input6, "max", "15");
    			add_location(input6, file$9, 187, 24, 6218);
    			attr_dev(div11, "class", "form-group col-md-6");
    			add_location(div11, file$9, 185, 20, 6105);
    			attr_dev(label7, "for", "");
    			add_location(label7, file$9, 190, 24, 6428);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "class", "form-control");
    			attr_dev(input7, "name", "Celular");
    			attr_dev(input7, "id", "txtCelular");
    			attr_dev(input7, "max", "15");
    			add_location(input7, file$9, 191, 24, 6482);
    			attr_dev(div12, "class", "form-group col-md-6");
    			add_location(div12, file$9, 189, 20, 6370);
    			attr_dev(div13, "class", "form-row");
    			add_location(div13, file$9, 184, 16, 6062);
    			attr_dev(label8, "for", "");
    			add_location(label8, file$9, 197, 24, 6752);
    			attr_dev(input8, "type", "email");
    			attr_dev(input8, "class", "form-control");
    			attr_dev(input8, "placeholder", "prueba@correo.com");
    			attr_dev(input8, "name", "Correo");
    			attr_dev(input8, "id", "txtCorreo");
    			add_location(input8, file$9, 198, 24, 6804);
    			attr_dev(div14, "class", "form-group col-md-6");
    			add_location(div14, file$9, 196, 20, 6694);
    			attr_dev(label9, "for", "");
    			add_location(label9, file$9, 201, 24, 7031);
    			option3.__value = "";
    			option3.value = option3.__value;
    			add_location(option3, file$9, 203, 28, 7223);
    			option4.__value = "S";
    			option4.value = option4.__value;
    			add_location(option4, file$9, 204, 28, 7294);
    			option5.__value = "C";
    			option5.value = option5.__value;
    			add_location(option5, file$9, 205, 28, 7357);
    			option6.__value = "D";
    			option6.value = option6.__value;
    			add_location(option6, file$9, 206, 28, 7419);
    			option7.__value = "U";
    			option7.value = option7.__value;
    			add_location(option7, file$9, 207, 28, 7485);
    			attr_dev(select1, "class", "form-control");
    			attr_dev(select1, "name", "EstadoCivil");
    			attr_dev(select1, "id", "slEstadoCivil");
    			select1.required = "";
    			if (/*estadoCivil*/ ctx[6] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[29].call(select1));
    			add_location(select1, file$9, 202, 24, 7090);
    			attr_dev(div15, "class", "form-group col-md-6");
    			add_location(div15, file$9, 200, 20, 6973);
    			attr_dev(div16, "class", "form-row");
    			add_location(div16, file$9, 195, 16, 6651);
    			add_location(br0, file$9, 211, 16, 7624);
    			set_style(h51, "margin-bottom", "0");
    			add_location(h51, file$9, 212, 16, 7645);
    			add_location(br1, file$9, 212, 71, 7700);
    			set_style(hr0, "margin-top", "0");
    			add_location(hr0, file$9, 213, 16, 7721);
    			attr_dev(div17, "class", "form-group col-md-6");
    			add_location(div17, file$9, 215, 20, 7808);
    			attr_dev(label10, "for", "");
    			add_location(label10, file$9, 225, 24, 8284);
    			attr_dev(input9, "type", "text");
    			attr_dev(input9, "name", "Poliza");
    			attr_dev(input9, "pattern", "^[0-9]+$");
    			attr_dev(input9, "class", "form-control");
    			add_location(input9, file$9, 226, 24, 8343);
    			attr_dev(div18, "class", "form-group col-md-6");
    			add_location(div18, file$9, 224, 20, 8226);
    			attr_dev(div19, "class", "form-row");
    			add_location(div19, file$9, 214, 16, 7765);
    			add_location(br2, file$9, 229, 16, 8509);
    			set_style(h52, "margin-bottom", "0");
    			add_location(h52, file$9, 231, 16, 8531);
    			add_location(br3, file$9, 231, 69, 8584);
    			set_style(hr1, "margin-top", "0");
    			add_location(hr1, file$9, 232, 16, 8605);
    			attr_dev(div20, "class", "form-group col-md-6");
    			add_location(div20, file$9, 235, 20, 8693);
    			attr_dev(div21, "class", "form-group col-md-6");
    			add_location(div21, file$9, 244, 20, 9116);
    			attr_dev(div22, "class", "form-row");
    			add_location(div22, file$9, 234, 16, 8650);
    			attr_dev(label11, "for", "inputAddress");
    			add_location(label11, file$9, 257, 24, 9655);
    			attr_dev(input10, "type", "text");
    			attr_dev(input10, "class", "form-control");
    			attr_dev(input10, "id", "inputAddress");
    			attr_dev(input10, "placeholder", "1234 Main St");
    			attr_dev(input10, "name", "Direccion");
    			attr_dev(input10, "data-bind", "value: direccion");
    			attr_dev(input10, "max", "100");
    			add_location(input10, file$9, 258, 24, 9723);
    			attr_dev(div23, "class", "form-group col-md-12");
    			add_location(div23, file$9, 256, 20, 9596);
    			attr_dev(label12, "for", "");
    			add_location(label12, file$9, 261, 24, 9993);
    			attr_dev(input11, "type", "text");
    			attr_dev(input11, "class", "form-control");
    			attr_dev(input11, "placeholder", "Nombre de la Ciudad");
    			attr_dev(input11, "name", "Ciudad");
    			add_location(input11, file$9, 262, 24, 10046);
    			attr_dev(div24, "class", "form-group col-md-6");
    			add_location(div24, file$9, 260, 20, 9935);
    			attr_dev(div25, "class", "form-row");
    			add_location(div25, file$9, 255, 16, 9553);
    			attr_dev(button0, "type", "reset");
    			attr_dev(button0, "class", "btn btn-danger mr-2");
    			attr_dev(button0, "data-bind", "click: $root.limpiarFormulario");
    			add_location(button0, file$9, 268, 20, 10313);
    			attr_dev(i, "class", "mdi mdi-content-save-outline");
    			add_location(i, file$9, 269, 66, 10488);
    			attr_dev(button1, "type", "submit");
    			attr_dev(button1, "class", "btn btn-success");
    			add_location(button1, file$9, 269, 20, 10442);
    			attr_dev(div26, "class", "card-body d-flex justify-content-end align-items-center");
    			add_location(div26, file$9, 267, 16, 10223);
    			attr_dev(form, "id", "frmDatosGenerales");
    			add_location(form, file$9, 134, 12, 3491);
    			attr_dev(div27, "class", "col-lg-12");
    			add_location(div27, file$9, 132, 8, 3454);
    			attr_dev(div28, "class", "row");
    			add_location(div28, file$9, 131, 4, 3428);
    			attr_dev(div29, "class", "card-body");
    			attr_dev(div29, "id", "divDocumento");
    			add_location(div29, file$9, 130, 0, 3382);
    			attr_dev(div30, "class", "card m-b-30");
    			add_location(div30, file$9, 123, 0, 3266);
    			attr_dev(div31, "class", "col-lg-8 m-b-30 m-auto");
    			set_style(div31, "margin-top", "50px", 1);
    			add_location(div31, file$9, 122, 4, 3193);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$9, 121, 2, 3157);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$9, 119, 0, 3116);
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
    			append_dev(section, div31);
    			append_dev(div31, div30);
    			append_dev(div30, div0);
    			append_dev(div0, h50);
    			append_dev(div30, t3);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, form);
    			append_dev(form, input0);
    			append_dev(form, t4);
    			append_dev(form, div2);
    			append_dev(div2, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			set_input_value(input1, /*cedula*/ ctx[15]);
    			append_dev(form, t7);
    			append_dev(form, div4);
    			append_dev(div4, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t9);
    			append_dev(div3, input2);
    			set_input_value(input2, /*nombres*/ ctx[7]);
    			append_dev(form, t10);
    			append_dev(form, div7);
    			append_dev(div7, div5);
    			append_dev(div5, label2);
    			append_dev(div5, t12);
    			append_dev(div5, input3);
    			set_input_value(input3, /*primerApellido*/ ctx[8]);
    			append_dev(div7, t13);
    			append_dev(div7, div6);
    			append_dev(div6, label3);
    			append_dev(div6, t15);
    			append_dev(div6, input4);
    			set_input_value(input4, /*segundoApellido*/ ctx[9]);
    			append_dev(form, t16);
    			append_dev(form, div10);
    			append_dev(div10, div8);
    			append_dev(div8, label4);
    			append_dev(div8, t18);
    			append_dev(div8, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*sexo*/ ctx[10]);
    			append_dev(div10, t22);
    			append_dev(div10, div9);
    			append_dev(div9, label5);
    			append_dev(div9, t24);
    			append_dev(div9, input5);
    			set_input_value(input5, /*fechaNacimiento*/ ctx[11]);
    			append_dev(form, t25);
    			append_dev(form, div13);
    			append_dev(div13, div11);
    			append_dev(div11, label6);
    			append_dev(div11, t27);
    			append_dev(div11, input6);
    			set_input_value(input6, /*telefono*/ ctx[12]);
    			append_dev(div13, t28);
    			append_dev(div13, div12);
    			append_dev(div12, label7);
    			append_dev(div12, t30);
    			append_dev(div12, input7);
    			set_input_value(input7, /*celular*/ ctx[13]);
    			append_dev(form, t31);
    			append_dev(form, div16);
    			append_dev(div16, div14);
    			append_dev(div14, label8);
    			append_dev(div14, t33);
    			append_dev(div14, input8);
    			set_input_value(input8, /*email*/ ctx[14]);
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
    			select_option(select1, /*estadoCivil*/ ctx[6]);
    			append_dev(form, t42);
    			append_dev(form, br0);
    			append_dev(form, t43);
    			append_dev(form, h51);
    			append_dev(form, br1);
    			append_dev(form, t45);
    			append_dev(form, hr0);
    			append_dev(form, t46);
    			append_dev(form, div19);
    			append_dev(div19, div17);
    			mount_component(select20, div17, null);
    			append_dev(div19, t47);
    			append_dev(div19, div18);
    			append_dev(div18, label10);
    			append_dev(div18, t49);
    			append_dev(div18, input9);
    			set_input_value(input9, /*numeroSeguro*/ ctx[18]);
    			append_dev(form, t50);
    			append_dev(form, br2);
    			append_dev(form, t51);
    			append_dev(form, h52);
    			append_dev(form, br3);
    			append_dev(form, t53);
    			append_dev(form, hr1);
    			append_dev(form, t54);
    			append_dev(form, div22);
    			append_dev(div22, div20);
    			mount_component(select21, div20, null);
    			append_dev(div22, t55);
    			append_dev(div22, div21);
    			mount_component(select22, div21, null);
    			append_dev(form, t56);
    			append_dev(form, div25);
    			append_dev(div25, div23);
    			append_dev(div23, label11);
    			append_dev(div23, t58);
    			append_dev(div23, input10);
    			set_input_value(input10, /*direccion*/ ctx[16]);
    			append_dev(div25, t59);
    			append_dev(div25, div24);
    			append_dev(div24, label12);
    			append_dev(div24, t61);
    			append_dev(div24, input11);
    			set_input_value(input11, /*ciudad*/ ctx[17]);
    			append_dev(form, t62);
    			append_dev(form, div26);
    			append_dev(div26, button0);
    			append_dev(div26, t64);
    			append_dev(div26, button1);
    			append_dev(button1, i);
    			append_dev(button1, t65);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[20]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[21]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[22]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[23]),
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[24]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[25]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[26]),
    					listen_dev(input7, "input", /*input7_input_handler*/ ctx[27]),
    					listen_dev(input8, "input", /*input8_input_handler*/ ctx[28]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[29]),
    					listen_dev(input9, "input", /*input9_input_handler*/ ctx[31]),
    					listen_dev(input10, "input", /*input10_input_handler*/ ctx[34]),
    					listen_dev(input11, "input", /*input11_input_handler*/ ctx[35]),
    					listen_dev(form, "submit", prevent_default(/*guardarPaciente*/ ctx[19]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*cedula*/ 32768 && input1.value !== /*cedula*/ ctx[15]) {
    				set_input_value(input1, /*cedula*/ ctx[15]);
    			}

    			if (dirty[0] & /*nombres*/ 128) {
    				set_input_value(input2, /*nombres*/ ctx[7]);
    			}

    			if (dirty[0] & /*primerApellido*/ 256) {
    				set_input_value(input3, /*primerApellido*/ ctx[8]);
    			}

    			if (dirty[0] & /*segundoApellido*/ 512) {
    				set_input_value(input4, /*segundoApellido*/ ctx[9]);
    			}

    			if (dirty[0] & /*sexo*/ 1024) {
    				select_option(select0, /*sexo*/ ctx[10]);
    			}

    			if (dirty[0] & /*fechaNacimiento*/ 2048) {
    				set_input_value(input5, /*fechaNacimiento*/ ctx[11]);
    			}

    			if (dirty[0] & /*telefono*/ 4096 && input6.value !== /*telefono*/ ctx[12]) {
    				set_input_value(input6, /*telefono*/ ctx[12]);
    			}

    			if (dirty[0] & /*celular*/ 8192 && input7.value !== /*celular*/ ctx[13]) {
    				set_input_value(input7, /*celular*/ ctx[13]);
    			}

    			if (dirty[0] & /*email*/ 16384 && input8.value !== /*email*/ ctx[14]) {
    				set_input_value(input8, /*email*/ ctx[14]);
    			}

    			if (dirty[0] & /*estadoCivil*/ 64) {
    				select_option(select1, /*estadoCivil*/ ctx[6]);
    			}

    			const select20_changes = {};
    			if (dirty[0] & /*aseguradoras*/ 2) select20_changes.datos = /*aseguradoras*/ ctx[1];

    			if (!updating_valor && dirty[0] & /*aseguradora*/ 1) {
    				updating_valor = true;
    				select20_changes.valor = /*aseguradora*/ ctx[0];
    				add_flush_callback(() => updating_valor = false);
    			}

    			select20.$set(select20_changes);

    			if (dirty[0] & /*numeroSeguro*/ 262144 && input9.value !== /*numeroSeguro*/ ctx[18]) {
    				set_input_value(input9, /*numeroSeguro*/ ctx[18]);
    			}

    			const select21_changes = {};
    			if (dirty[0] & /*nacionalidades*/ 8) select21_changes.datos = /*nacionalidades*/ ctx[3];

    			if (!updating_valor_1 && dirty[0] & /*nacionalidad*/ 4) {
    				updating_valor_1 = true;
    				select21_changes.valor = /*nacionalidad*/ ctx[2];
    				add_flush_callback(() => updating_valor_1 = false);
    			}

    			select21.$set(select21_changes);
    			const select22_changes = {};
    			if (dirty[0] & /*provincias*/ 32) select22_changes.datos = /*provincias*/ ctx[5];

    			if (!updating_valor_2 && dirty[0] & /*provincia*/ 16) {
    				updating_valor_2 = true;
    				select22_changes.valor = /*provincia*/ ctx[4];
    				add_flush_callback(() => updating_valor_2 = false);
    			}

    			select22.$set(select22_changes);

    			if (dirty[0] & /*direccion*/ 65536 && input10.value !== /*direccion*/ ctx[16]) {
    				set_input_value(input10, /*direccion*/ ctx[16]);
    			}

    			if (dirty[0] & /*ciudad*/ 131072 && input11.value !== /*ciudad*/ ctx[17]) {
    				set_input_value(input11, /*ciudad*/ ctx[17]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asidepacientes.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(select20.$$.fragment, local);
    			transition_in(select21.$$.fragment, local);
    			transition_in(select22.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(asidepacientes.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(select20.$$.fragment, local);
    			transition_out(select21.$$.fragment, local);
    			transition_out(select22.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(asidepacientes, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(select20);
    			destroy_component(select21);
    			destroy_component(select22);
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
    	validate_slots("Editar", slots, []);
    	let aseguradora = "";
    	let aseguradoras = [];
    	let nacionalidad = "";
    	let nacionalidades = [];
    	let provincia = "";
    	let provincias = [];
    	let estadoCivil = "";
    	let nombres = "";
    	let primerApellido = "";
    	let segundoApellido = "";
    	let sexo = "";
    	let fechaNacimiento = "";
    	let telefono = "";
    	let celular = "";
    	let email = "";
    	let cedula = "";
    	let direccion = "";
    	let ciudad = "";
    	let numeroSeguro = "";

    	const cargarAseguradoras = () => {
    		const config = {
    			method: "get",
    			url: `${url}/aseguradoras`
    		};

    		axios$1(config).then(res => {
    			$$invalidate(1, aseguradoras = res.data);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const cargarNacionalidades = () => {
    		const config = {
    			method: "get",
    			url: `${url}/nacionalidades`
    		};

    		axios$1(config).then(res => {
    			$$invalidate(3, nacionalidades = res.data);
    			console.log(res);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const cargarProvincias = () => {
    		const config = { method: "get", url: `${url}/provincias` };

    		axios$1(config).then(res => {
    			$$invalidate(5, provincias = res.data);
    			console.log(res);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const guardarPaciente = () => {
    		const paciente = {
    			nombres,
    			primerApellido,
    			segundoApellido,
    			sexo,
    			fechaNacimiento,
    			estadoCivil,
    			telefono,
    			celular,
    			email,
    			cedula,
    			direccion,
    			ciudad,
    			numAsegurado: numeroSeguro,
    			ProvinciaId: provincia,
    			NacionalidadId: nacionalidad,
    			AseguradoraId: aseguradora
    		};

    		console.log(paciente);

    		const config = {
    			method: "post",
    			url: `${url}/pacientes`,
    			data: paciente
    		};

    		axios$1(config).then(res => {
    			console.log(res.data.id);

    			if (res.data.id) {
    				push(`/paciente/perfil/${res.data.id}`);
    			}
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	onMount(() => {
    		cargarAseguradoras();
    		cargarNacionalidades();
    		cargarProvincias();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<Editar> was created with unknown prop '${key}'`);
    	});

    	function input1_input_handler() {
    		cedula = this.value;
    		$$invalidate(15, cedula);
    	}

    	function input2_input_handler() {
    		nombres = this.value;
    		$$invalidate(7, nombres);
    	}

    	function input3_input_handler() {
    		primerApellido = this.value;
    		$$invalidate(8, primerApellido);
    	}

    	function input4_input_handler() {
    		segundoApellido = this.value;
    		$$invalidate(9, segundoApellido);
    	}

    	function select0_change_handler() {
    		sexo = select_value(this);
    		$$invalidate(10, sexo);
    	}

    	function input5_input_handler() {
    		fechaNacimiento = this.value;
    		$$invalidate(11, fechaNacimiento);
    	}

    	function input6_input_handler() {
    		telefono = this.value;
    		$$invalidate(12, telefono);
    	}

    	function input7_input_handler() {
    		celular = this.value;
    		$$invalidate(13, celular);
    	}

    	function input8_input_handler() {
    		email = this.value;
    		$$invalidate(14, email);
    	}

    	function select1_change_handler() {
    		estadoCivil = select_value(this);
    		$$invalidate(6, estadoCivil);
    	}

    	function select20_valor_binding(value) {
    		aseguradora = value;
    		$$invalidate(0, aseguradora);
    	}

    	function input9_input_handler() {
    		numeroSeguro = this.value;
    		$$invalidate(18, numeroSeguro);
    	}

    	function select21_valor_binding(value) {
    		nacionalidad = value;
    		$$invalidate(2, nacionalidad);
    	}

    	function select22_valor_binding(value) {
    		provincia = value;
    		$$invalidate(4, provincia);
    	}

    	function input10_input_handler() {
    		direccion = this.value;
    		$$invalidate(16, direccion);
    	}

    	function input11_input_handler() {
    		ciudad = this.value;
    		$$invalidate(17, ciudad);
    	}

    	$$self.$capture_state = () => ({
    		Header,
    		AsidePacientes,
    		Select2,
    		url,
    		axios: axios$1,
    		onMount,
    		push,
    		aseguradora,
    		aseguradoras,
    		nacionalidad,
    		nacionalidades,
    		provincia,
    		provincias,
    		estadoCivil,
    		nombres,
    		primerApellido,
    		segundoApellido,
    		sexo,
    		fechaNacimiento,
    		telefono,
    		celular,
    		email,
    		cedula,
    		direccion,
    		ciudad,
    		numeroSeguro,
    		cargarAseguradoras,
    		cargarNacionalidades,
    		cargarProvincias,
    		guardarPaciente
    	});

    	$$self.$inject_state = $$props => {
    		if ("aseguradora" in $$props) $$invalidate(0, aseguradora = $$props.aseguradora);
    		if ("aseguradoras" in $$props) $$invalidate(1, aseguradoras = $$props.aseguradoras);
    		if ("nacionalidad" in $$props) $$invalidate(2, nacionalidad = $$props.nacionalidad);
    		if ("nacionalidades" in $$props) $$invalidate(3, nacionalidades = $$props.nacionalidades);
    		if ("provincia" in $$props) $$invalidate(4, provincia = $$props.provincia);
    		if ("provincias" in $$props) $$invalidate(5, provincias = $$props.provincias);
    		if ("estadoCivil" in $$props) $$invalidate(6, estadoCivil = $$props.estadoCivil);
    		if ("nombres" in $$props) $$invalidate(7, nombres = $$props.nombres);
    		if ("primerApellido" in $$props) $$invalidate(8, primerApellido = $$props.primerApellido);
    		if ("segundoApellido" in $$props) $$invalidate(9, segundoApellido = $$props.segundoApellido);
    		if ("sexo" in $$props) $$invalidate(10, sexo = $$props.sexo);
    		if ("fechaNacimiento" in $$props) $$invalidate(11, fechaNacimiento = $$props.fechaNacimiento);
    		if ("telefono" in $$props) $$invalidate(12, telefono = $$props.telefono);
    		if ("celular" in $$props) $$invalidate(13, celular = $$props.celular);
    		if ("email" in $$props) $$invalidate(14, email = $$props.email);
    		if ("cedula" in $$props) $$invalidate(15, cedula = $$props.cedula);
    		if ("direccion" in $$props) $$invalidate(16, direccion = $$props.direccion);
    		if ("ciudad" in $$props) $$invalidate(17, ciudad = $$props.ciudad);
    		if ("numeroSeguro" in $$props) $$invalidate(18, numeroSeguro = $$props.numeroSeguro);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		aseguradora,
    		aseguradoras,
    		nacionalidad,
    		nacionalidades,
    		provincia,
    		provincias,
    		estadoCivil,
    		nombres,
    		primerApellido,
    		segundoApellido,
    		sexo,
    		fechaNacimiento,
    		telefono,
    		celular,
    		email,
    		cedula,
    		direccion,
    		ciudad,
    		numeroSeguro,
    		guardarPaciente,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		select0_change_handler,
    		input5_input_handler,
    		input6_input_handler,
    		input7_input_handler,
    		input8_input_handler,
    		select1_change_handler,
    		select20_valor_binding,
    		input9_input_handler,
    		select21_valor_binding,
    		select22_valor_binding,
    		input10_input_handler,
    		input11_input_handler
    	];
    }

    class Editar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editar",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/Layout/Aside.svelte generated by Svelte v3.29.0 */
    const file$a = "src/Layout/Aside.svelte";

    function create_fragment$b(ctx) {
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
    			add_location(a0, file$a, 9, 8, 277);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$a, 8, 6, 234);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$a, 14, 8, 424);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$a, 18, 8, 593);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$a, 12, 6, 366);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$a, 6, 4, 157);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$a, 30, 14, 1011);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$a, 29, 12, 971);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$a, 33, 14, 1125);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$a, 34, 14, 1204);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$a, 32, 12, 1086);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$a, 28, 10, 919);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$a, 27, 8, 840);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$a, 44, 22, 1640);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$a, 43, 20, 1592);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-clipboard-flow");
    			add_location(i1, file$a, 47, 22, 1777);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$a, 46, 20, 1730);
    			attr_dev(a4, "href", "/AtencionMedica/Atenciones");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$a, 42, 18, 1507);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$a, 41, 16, 1395);
    			attr_dev(span8, "class", "menu-name");
    			add_location(span8, file$a, 57, 14, 2223);
    			attr_dev(span9, "class", "menu-label");
    			add_location(span9, file$a, 56, 12, 2183);
    			attr_dev(i2, "class", "icon-placeholder mdi-24px mdi mdi-clipboard-flow");
    			add_location(i2, file$a, 60, 14, 2340);
    			attr_dev(span10, "class", "menu-icon");
    			add_location(span10, file$a, 59, 12, 2301);
    			attr_dev(a5, "href", "/AtencionMedica/Interconsultas");
    			attr_dev(a5, "class", "menu-link");
    			add_location(a5, file$a, 55, 10, 2102);
    			attr_dev(li2, "class", "menu-item");
    			add_location(li2, file$a, 54, 8, 1994);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$a, 25, 6, 782);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$a, 23, 4, 696);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$a, 5, 2, 123);
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Aside",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/Pages/AtencionMedica/Interconsultas.svelte generated by Svelte v3.29.0 */
    const file$b = "src/Pages/AtencionMedica/Interconsultas.svelte";

    function create_fragment$c(ctx) {
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
    			add_location(div0, file$b, 12, 6, 286);
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$b, 13, 6, 312);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "class", "form-control form-control-appended");
    			attr_dev(input, "placeholder", "Buscar");
    			add_location(input, file$b, 19, 28, 589);
    			attr_dev(span0, "class", "mdi mdi-magnify");
    			add_location(span0, file$b, 22, 36, 835);
    			attr_dev(div1, "class", "input-group-text");
    			add_location(div1, file$b, 21, 32, 768);
    			attr_dev(div2, "class", "input-group-append");
    			add_location(div2, file$b, 20, 28, 703);
    			attr_dev(div3, "class", "input-group input-group-flush mb-3");
    			add_location(div3, file$b, 18, 24, 512);
    			attr_dev(div4, "class", "col-md-5");
    			add_location(div4, file$b, 17, 20, 465);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$b, 16, 16, 427);
    			attr_dev(div6, "class", "col-md-12");
    			add_location(div6, file$b, 15, 12, 387);
    			add_location(th0, file$b, 34, 32, 1303);
    			add_location(th1, file$b, 35, 32, 1352);
    			add_location(th2, file$b, 36, 32, 1398);
    			add_location(th3, file$b, 37, 32, 1444);
    			add_location(tr0, file$b, 33, 28, 1266);
    			add_location(thead, file$b, 32, 24, 1230);
    			attr_dev(span1, "class", "avatar-title rounded-circle ");
    			add_location(span1, file$b, 45, 44, 1852);
    			attr_dev(div7, "class", "avatar avatar-sm");
    			add_location(div7, file$b, 44, 40, 1777);
    			attr_dev(div8, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div8, file$b, 43, 36, 1690);
    			add_location(span2, file$b, 48, 43, 2000);
    			add_location(td0, file$b, 42, 32, 1649);
    			add_location(td1, file$b, 50, 32, 2103);
    			add_location(td2, file$b, 51, 32, 2152);
    			attr_dev(a, "href", "/Paciente/Editar");
    			attr_dev(a, "data-toggle", "tooltip");
    			attr_dev(a, "data-placement", "top");
    			attr_dev(a, "data-original-title", "Modificar paciente");
    			attr_dev(a, "class", "btn btn-outline-secondary btn-sm");
    			add_location(a, file$b, 55, 40, 2359);
    			set_style(div9, "width", "200px");
    			attr_dev(div9, "class", "ml-auto");
    			add_location(div9, file$b, 54, 36, 2275);
    			set_style(td3, "text-align", "right");
    			add_location(td3, file$b, 53, 32, 2207);
    			add_location(tr1, file$b, 41, 28, 1612);
    			attr_dev(tbody, "data-bind", "foreach: pacientes");
    			add_location(tbody, file$b, 40, 24, 1545);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$b, 31, 20, 1157);
    			attr_dev(div10, "class", "table-responsive");
    			add_location(div10, file$b, 30, 16, 1106);
    			attr_dev(div11, "class", "col-md-12 m-b-30");
    			add_location(div11, file$b, 29, 12, 1059);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$b, 14, 8, 357);
    			attr_dev(div13, "class", "p-2");
    			add_location(div13, file$b, 11, 4, 262);
    			attr_dev(section, "class", "admin-content p-2");
    			add_location(section, file$b, 10, 2, 222);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$b, 8, 0, 181);
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Interconsultas",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/Layout/AsideAtencion.svelte generated by Svelte v3.29.0 */
    const file$c = "src/Layout/AsideAtencion.svelte";

    function create_fragment$d(ctx) {
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
    			add_location(a0, file$c, 9, 8, 277);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$c, 8, 6, 234);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$c, 14, 8, 424);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$c, 18, 8, 593);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$c, 12, 6, 366);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$c, 6, 4, 157);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$c, 30, 14, 1011);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$c, 29, 12, 971);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$c, 33, 14, 1125);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$c, 34, 14, 1204);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$c, 32, 12, 1086);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$c, 28, 10, 919);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$c, 27, 8, 840);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$c, 44, 16, 1598);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$c, 43, 12, 1556);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i1, file$c, 47, 16, 1710);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$c, 46, 12, 1669);
    			attr_dev(a4, "href", "/AtencionMedica/Resumen");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$c, 42, 12, 1482);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$c, 41, 8, 1379);
    			attr_dev(span8, "class", "menu-name");
    			add_location(span8, file$c, 57, 16, 2151);
    			attr_dev(span9, "class", "menu-label");
    			add_location(span9, file$c, 56, 12, 2109);
    			attr_dev(i2, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i2, file$c, 60, 16, 2271);
    			attr_dev(span10, "class", "menu-icon");
    			add_location(span10, file$c, 59, 12, 2230);
    			attr_dev(a5, "href", "/AtencionMedica/EditarDatosAtencion");
    			attr_dev(a5, "class", "menu-link");
    			add_location(a5, file$c, 55, 12, 2023);
    			attr_dev(li2, "class", "menu-item");
    			add_location(li2, file$c, 54, 8, 1908);
    			attr_dev(span11, "class", "menu-name");
    			add_location(span11, file$c, 70, 16, 2712);
    			attr_dev(span12, "class", "menu-label");
    			add_location(span12, file$c, 69, 12, 2670);
    			attr_dev(i3, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i3, file$c, 73, 16, 2833);
    			attr_dev(span13, "class", "menu-icon");
    			add_location(span13, file$c, 72, 12, 2792);
    			attr_dev(a6, "href", "/AtencionMedica/HistoriaClinica");
    			attr_dev(a6, "class", "menu-link");
    			add_location(a6, file$c, 68, 12, 2588);
    			attr_dev(li3, "class", "menu-item");
    			add_location(li3, file$c, 67, 8, 2477);
    			attr_dev(span14, "class", "menu-name");
    			add_location(span14, file$c, 83, 16, 3260);
    			attr_dev(span15, "class", "menu-info");
    			add_location(span15, file$c, 84, 16, 3321);
    			attr_dev(span16, "class", "menu-label");
    			add_location(span16, file$c, 82, 12, 3218);
    			attr_dev(i4, "class", "icon-placeholder mdi-24px mdi mdi-format-list-bulleted-type");
    			add_location(i4, file$c, 87, 16, 3447);
    			attr_dev(span17, "class", "menu-icon");
    			add_location(span17, file$c, 86, 12, 3406);
    			attr_dev(a7, "href", "/AtencionMedica/NotasMedicas");
    			attr_dev(a7, "class", "menu-link");
    			add_location(a7, file$c, 81, 12, 3139);
    			attr_dev(li4, "class", "menu-item");
    			add_location(li4, file$c, 80, 8, 3031);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$c, 25, 6, 782);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$c, 23, 4, 696);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$c, 5, 2, 123);
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AsideAtencion",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/Pages/AtencionMedica/Resumen.svelte generated by Svelte v3.29.0 */
    const file$d = "src/Pages/AtencionMedica/Resumen.svelte";

    function create_fragment$e(ctx) {
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
    			span1.textContent = "Fiordaliza\n                        De Jesus Herrera";
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
    			span2.textContent = "-doctor\n                                            name-";
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
    			small2.textContent = "-tipo\n                                        nota-";
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
    			span10.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\n                                            FLEXNERI";
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
    			span11.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\n                                            FLEXNERI";
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
    			span12.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\n                                            FLEXNERI";
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
    			span13.textContent = "SHIGELOSIS DEBIDA A SHIGELLA\n                                            FLEXNERI";
    			t165 = space();
    			td42 = element("td");
    			td42.textContent = "Este es un comentario de ejemplo";
    			t167 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			attr_dev(span0, "class", "badge badge-primary");
    			attr_dev(span0, "data-bind", "text: titulo");
    			add_location(span0, file$d, 12, 20, 441);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$d, 15, 20, 591);
    			add_location(h50, file$d, 11, 16, 416);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$d, 10, 12, 377);
    			attr_dev(div1, "class", "col-md-6");
    			set_style(div1, "text-align", "right");
    			add_location(div1, file$d, 19, 12, 756);
    			attr_dev(i, "data-bind", "class: icon");
    			attr_dev(i, "class", "mdi mdi-comment-eye");
    			add_location(i, file$d, 25, 24, 1076);
    			attr_dev(sapn, "data-bind", "text: text");
    			add_location(sapn, file$d, 26, 28, 1162);
    			attr_dev(button, "data-toggle", "modal");
    			attr_dev(button, "data-target", "#modalDatosPersonales");
    			set_style(button, "box-shadow", "none");
    			attr_dev(button, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button, file$d, 24, 20, 921);
    			attr_dev(div2, "class", "dropdown");
    			add_location(div2, file$d, 23, 16, 878);
    			attr_dev(div3, "class", "col-lg-12");
    			add_location(div3, file$d, 22, 12, 838);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$d, 9, 8, 347);
    			attr_dev(div5, "class", "contenedor-datos");
    			attr_dev(div5, "id", "divHeaderBar");
    			add_location(div5, file$d, 8, 4, 290);
    			attr_dev(h51, "class", "card-title m-b-0");
    			add_location(h51, file$d, 40, 20, 1562);
    			attr_dev(div6, "class", "card-header");
    			add_location(div6, file$d, 39, 16, 1516);
    			attr_dev(img0, "class", "avatar-img rounded-circle");
    			if (img0.src !== (img0_src_value = "/atmosTemplate/assets/img/person.webp")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "imagen paciente");
    			add_location(img0, file$d, 58, 36, 2552);
    			attr_dev(div7, "class", "avatar mr-3  avatar-sm");
    			add_location(div7, file$d, 57, 32, 2479);
    			attr_dev(span2, "data-bind", "text: atencionMedica.nombreMedico");
    			add_location(span2, file$d, 61, 59, 2813);
    			attr_dev(span3, "class", "text-muted ml-3 small");
    			attr_dev(span3, "data-bind", "text: new Date(atencionMedica.fechaIngreso()).toLocaleString('es-DO')");
    			add_location(span3, file$d, 64, 40, 3012);
    			attr_dev(h60, "class", "mt-0 mb-1");
    			add_location(h60, file$d, 61, 36, 2790);
    			attr_dev(small0, "class", "mt-4 mb-4 text-primary");
    			add_location(small0, file$d, 67, 36, 3271);
    			attr_dev(pre, "data-bind", "text: atencionMedica.motivoConsulta");
    			add_location(pre, file$d, 68, 36, 3372);
    			attr_dev(small1, "class", "mt-4 mb-4 text-primary");
    			add_location(small1, file$d, 71, 36, 3568);
    			attr_dev(p0, "data-bind", "text: atencionMedica.historiaEnfermedad");
    			add_location(p0, file$d, 72, 36, 3676);
    			attr_dev(div8, "class", "media-body");
    			add_location(div8, file$d, 60, 32, 2729);
    			attr_dev(div9, "class", "media");
    			add_location(div9, file$d, 56, 28, 2427);
    			attr_dev(div10, "class", "list-unstyled");
    			add_location(div10, file$d, 55, 24, 2371);
    			attr_dev(img1, "class", "avatar-img rounded-circle");
    			if (img1.src !== (img1_src_value = "/atmosTemplate/assets/img/person.webp")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "imagen paciente");
    			add_location(img1, file$d, 81, 36, 4172);
    			attr_dev(div11, "class", "avatar mr-3  avatar-sm");
    			add_location(div11, file$d, 80, 32, 4099);
    			attr_dev(span4, "data-bind", "text: name");
    			add_location(span4, file$d, 84, 59, 4433);
    			attr_dev(span5, "class", "text-muted ml-3 small");
    			attr_dev(span5, "data-bind", "text: new Date(fechaHora).toLocaleString('es-DO')");
    			add_location(span5, file$d, 85, 40, 4525);
    			attr_dev(h61, "class", "mt-0 mb-1");
    			add_location(h61, file$d, 84, 36, 4410);
    			attr_dev(small2, "class", "mt-4 mb-4 text-primary");
    			attr_dev(small2, "data-bind", "text: TIPO_NOTA_MEDICA[tipoNota]");
    			add_location(small2, file$d, 87, 36, 4720);
    			attr_dev(p1, "data-bind", "text: nota");
    			add_location(p1, file$d, 89, 36, 4899);
    			attr_dev(div12, "class", "media-body");
    			add_location(div12, file$d, 83, 32, 4349);
    			attr_dev(div13, "class", "media");
    			add_location(div13, file$d, 79, 28, 4047);
    			attr_dev(div14, "class", "list-unstyled");
    			attr_dev(div14, "data-bind", "foreach: notas");
    			add_location(div14, file$d, 78, 24, 3964);
    			add_location(div15, file$d, 54, 20, 2341);
    			attr_dev(div16, "class", "card-body");
    			add_location(div16, file$d, 53, 16, 2297);
    			attr_dev(div17, "class", "card m-b-30");
    			add_location(div17, file$d, 38, 12, 1474);
    			attr_dev(h52, "class", "m-b-0");
    			add_location(h52, file$d, 102, 20, 5290);
    			attr_dev(div18, "class", "card-header");
    			add_location(div18, file$d, 101, 16, 5244);
    			add_location(th0, file$d, 113, 36, 5656);
    			add_location(th1, file$d, 114, 36, 5708);
    			add_location(th2, file$d, 115, 36, 5762);
    			add_location(th3, file$d, 116, 36, 5819);
    			add_location(th4, file$d, 117, 36, 5877);
    			add_location(tr0, file$d, 112, 32, 5615);
    			add_location(thead0, file$d, 111, 28, 5575);
    			attr_dev(td0, "data-bind", "text: codigo");
    			add_location(td0, file$d, 122, 36, 6115);
    			attr_dev(td1, "data-bind", "text: catalogo");
    			add_location(td1, file$d, 123, 36, 6195);
    			attr_dev(td2, "data-bind", "text: problemaMedico");
    			add_location(td2, file$d, 124, 36, 6279);
    			attr_dev(td3, "data-bind", "text: name");
    			add_location(td3, file$d, 125, 36, 6373);
    			attr_dev(td4, "data-bind", "text: comentario");
    			add_location(td4, file$d, 126, 36, 6458);
    			add_location(tr1, file$d, 121, 32, 6074);
    			attr_dev(tbody0, "data-bind", "foreach: diagnosticos");
    			add_location(tbody0, file$d, 120, 28, 6000);
    			attr_dev(table0, "class", "table table-hover ");
    			add_location(table0, file$d, 110, 24, 5512);
    			attr_dev(div19, "class", "table-responsive");
    			add_location(div19, file$d, 108, 20, 5456);
    			attr_dev(div20, "class", "card-body");
    			add_location(div20, file$d, 107, 16, 5412);
    			attr_dev(div21, "class", "card m-b-30");
    			add_location(div21, file$d, 100, 12, 5202);
    			attr_dev(h62, "class", "m-b-0");
    			add_location(h62, file$d, 135, 20, 6795);
    			attr_dev(div22, "class", "card-header");
    			add_location(div22, file$d, 134, 16, 6749);
    			add_location(th5, file$d, 146, 36, 7161);
    			add_location(th6, file$d, 147, 36, 7218);
    			add_location(th7, file$d, 148, 36, 7269);
    			add_location(th8, file$d, 149, 36, 7328);
    			add_location(th9, file$d, 150, 36, 7377);
    			add_location(th10, file$d, 151, 36, 7432);
    			add_location(tr2, file$d, 145, 32, 7120);
    			add_location(thead1, file$d, 144, 28, 7080);
    			add_location(td5, file$d, 156, 36, 7638);
    			add_location(td6, file$d, 157, 36, 7695);
    			add_location(td7, file$d, 158, 36, 7745);
    			add_location(td8, file$d, 159, 36, 7793);
    			add_location(td9, file$d, 160, 36, 7850);
    			add_location(th11, file$d, 161, 36, 7908);
    			add_location(tr3, file$d, 155, 32, 7597);
    			add_location(td10, file$d, 164, 36, 8040);
    			add_location(td11, file$d, 165, 36, 8092);
    			add_location(td12, file$d, 166, 36, 8140);
    			add_location(td13, file$d, 167, 36, 8188);
    			add_location(td14, file$d, 168, 36, 8245);
    			add_location(th12, file$d, 169, 36, 8304);
    			add_location(tr4, file$d, 163, 32, 7999);
    			add_location(tbody1, file$d, 154, 28, 7557);
    			attr_dev(table1, "class", "table table-hover ");
    			add_location(table1, file$d, 143, 24, 7017);
    			attr_dev(div23, "class", "table-responsive");
    			add_location(div23, file$d, 141, 20, 6961);
    			attr_dev(div24, "class", "card-body");
    			add_location(div24, file$d, 140, 16, 6917);
    			attr_dev(div25, "class", "card m-b-30 d-none");
    			add_location(div25, file$d, 133, 12, 6700);
    			attr_dev(h63, "class", "m-b-0");
    			add_location(h63, file$d, 180, 20, 8614);
    			attr_dev(div26, "class", "card-header");
    			add_location(div26, file$d, 179, 16, 8568);
    			add_location(th13, file$d, 191, 36, 8980);
    			add_location(th14, file$d, 192, 36, 9037);
    			add_location(th15, file$d, 193, 36, 9101);
    			add_location(tr5, file$d, 190, 32, 8939);
    			add_location(thead2, file$d, 189, 28, 8899);
    			add_location(td15, file$d, 198, 36, 9335);
    			attr_dev(span6, "class", "badge badge-danger");
    			add_location(span6, file$d, 199, 40, 9434);
    			add_location(td16, file$d, 199, 36, 9430);
    			add_location(td17, file$d, 200, 36, 9526);
    			attr_dev(tr6, "class", "bg-soft-danger");
    			add_location(tr6, file$d, 197, 32, 9271);
    			add_location(td18, file$d, 203, 36, 9694);
    			attr_dev(span7, "class", "badge badge-warning");
    			add_location(span7, file$d, 204, 40, 9787);
    			add_location(td19, file$d, 204, 36, 9783);
    			add_location(td20, file$d, 205, 36, 9880);
    			attr_dev(tr7, "class", "bg-soft-warning");
    			add_location(tr7, file$d, 202, 32, 9629);
    			add_location(td21, file$d, 208, 36, 10048);
    			attr_dev(span8, "class", "badge badge-success");
    			add_location(span8, file$d, 209, 40, 10139);
    			add_location(td22, file$d, 209, 36, 10135);
    			add_location(td23, file$d, 210, 36, 10232);
    			attr_dev(tr8, "class", "bg-soft-success");
    			add_location(tr8, file$d, 207, 32, 9983);
    			add_location(td24, file$d, 213, 36, 10400);
    			attr_dev(span9, "class", "badge badge-success");
    			add_location(span9, file$d, 214, 40, 10499);
    			add_location(td25, file$d, 214, 36, 10495);
    			add_location(td26, file$d, 215, 36, 10600);
    			attr_dev(tr9, "class", "bg-soft-success");
    			add_location(tr9, file$d, 212, 32, 10335);
    			add_location(tbody2, file$d, 196, 28, 9231);
    			attr_dev(table2, "class", "table table-hover ");
    			add_location(table2, file$d, 188, 24, 8836);
    			attr_dev(div27, "class", "table-responsive");
    			add_location(div27, file$d, 186, 20, 8780);
    			attr_dev(div28, "class", "card-body");
    			add_location(div28, file$d, 185, 16, 8736);
    			attr_dev(div29, "class", "card m-b-30 d-none");
    			add_location(div29, file$d, 178, 12, 8519);
    			attr_dev(h64, "class", "m-b-0");
    			add_location(h64, file$d, 226, 20, 10919);
    			attr_dev(div30, "class", "card-header");
    			add_location(div30, file$d, 225, 16, 10873);
    			add_location(th16, file$d, 237, 36, 11281);
    			add_location(th17, file$d, 238, 36, 11338);
    			add_location(th18, file$d, 239, 36, 11396);
    			add_location(th19, file$d, 240, 36, 11453);
    			add_location(tr10, file$d, 236, 32, 11240);
    			add_location(thead3, file$d, 235, 28, 11200);
    			add_location(td27, file$d, 245, 36, 11657);
    			add_location(td28, file$d, 246, 36, 11732);
    			attr_dev(span10, "class", "badge");
    			add_location(span10, file$d, 247, 40, 11793);
    			add_location(td29, file$d, 247, 36, 11789);
    			set_style(td30, "font-weight", "normal");
    			add_location(td30, file$d, 249, 36, 11943);
    			add_location(tr11, file$d, 244, 32, 11616);
    			add_location(td31, file$d, 252, 36, 12149);
    			add_location(td32, file$d, 253, 36, 12206);
    			attr_dev(span11, "class", "badge");
    			add_location(span11, file$d, 254, 40, 12268);
    			add_location(td33, file$d, 254, 36, 12264);
    			set_style(td34, "font-weight", "normal");
    			add_location(td34, file$d, 256, 36, 12418);
    			attr_dev(tr12, "class", "bg-soft-success");
    			add_location(tr12, file$d, 251, 32, 12084);
    			add_location(td35, file$d, 259, 36, 12624);
    			add_location(td36, file$d, 260, 36, 12681);
    			attr_dev(span12, "class", "badge");
    			add_location(span12, file$d, 261, 40, 12743);
    			add_location(td37, file$d, 261, 36, 12739);
    			set_style(td38, "font-weight", "normal");
    			add_location(td38, file$d, 263, 36, 12893);
    			attr_dev(tr13, "class", "bg-soft-success");
    			add_location(tr13, file$d, 258, 32, 12559);
    			add_location(td39, file$d, 266, 36, 13099);
    			add_location(td40, file$d, 267, 36, 13154);
    			attr_dev(span13, "class", "badge");
    			add_location(span13, file$d, 268, 40, 13216);
    			add_location(td41, file$d, 268, 36, 13212);
    			set_style(td42, "font-weight", "normal");
    			add_location(td42, file$d, 270, 36, 13366);
    			attr_dev(tr14, "class", "bg-soft-success");
    			add_location(tr14, file$d, 265, 32, 13034);
    			add_location(tbody3, file$d, 243, 28, 11576);
    			attr_dev(table3, "class", "table table-hover ");
    			add_location(table3, file$d, 234, 24, 11137);
    			attr_dev(div31, "class", "table-responsive");
    			add_location(div31, file$d, 232, 20, 11081);
    			attr_dev(div32, "class", "card-body");
    			add_location(div32, file$d, 231, 16, 11037);
    			attr_dev(div33, "class", "card m-b-30 d-none");
    			add_location(div33, file$d, 224, 12, 10824);
    			attr_dev(div34, "class", "col-lg-12");
    			set_style(div34, "margin-top", "130px");
    			add_location(div34, file$d, 37, 8, 1411);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$d, 36, 4, 1377);
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Resumen",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/Pages/AtencionMedica/EditarDatosAtencion.svelte generated by Svelte v3.29.0 */
    const file$e = "src/Pages/AtencionMedica/EditarDatosAtencion.svelte";

    function create_fragment$f(ctx) {
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
    			add_location(span0, file$e, 12, 16, 421);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$e, 13, 16, 524);
    			add_location(h50, file$e, 11, 12, 400);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$e, 10, 8, 365);
    			attr_dev(i0, "class", "mdi mdi-check-all");
    			add_location(i0, file$e, 18, 104, 851);
    			add_location(i1, file$e, 19, 55, 909);
    			attr_dev(div1, "class", "guardando mr-2 text-success");
    			attr_dev(div1, "data-bind", "html: content, class: contentClass");
    			add_location(div1, file$e, 18, 16, 763);
    			attr_dev(div2, "class", "guardar-documento");
    			add_location(div2, file$e, 17, 12, 715);
    			attr_dev(div3, "class", "col-md-6");
    			set_style(div3, "text-align", "right");
    			add_location(div3, file$e, 16, 8, 653);
    			attr_dev(i2, "data-bind", "class: icon");
    			attr_dev(i2, "class", "mdi mdi-comment-eye");
    			add_location(i2, file$e, 26, 24, 1274);
    			attr_dev(sapn0, "data-bind", "text: text");
    			add_location(sapn0, file$e, 27, 24, 1358);
    			attr_dev(button0, "data-toggle", "modal");
    			attr_dev(button0, "data-target", "#modalDatosPersonales");
    			set_style(button0, "box-shadow", "none");
    			attr_dev(button0, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button0, file$e, 24, 20, 1095);
    			attr_dev(i3, "data-bind", "class: icon");
    			attr_dev(i3, "class", "mdi mdi-delete");
    			add_location(i3, file$e, 31, 24, 1631);
    			attr_dev(sapn1, "data-bind", "text: text");
    			add_location(sapn1, file$e, 32, 24, 1710);
    			attr_dev(button1, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button1, "box-shadow", "none");
    			attr_dev(button1, "class", "btn btn-outline-danger btn-sm");
    			add_location(button1, file$e, 29, 20, 1463);
    			attr_dev(i4, "data-bind", "class: icon");
    			attr_dev(i4, "class", "mdi mdi-checkbox-blank");
    			add_location(i4, file$e, 36, 24, 1972);
    			attr_dev(sapn2, "data-bind", "text: text");
    			add_location(sapn2, file$e, 37, 24, 2059);
    			attr_dev(button2, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button2, "box-shadow", "none");
    			attr_dev(button2, "class", "btn btn-outline-success btn-sm");
    			add_location(button2, file$e, 34, 20, 1803);
    			attr_dev(div4, "class", "dropdown");
    			attr_dev(div4, "data-bind", "foreach: actionButtons");
    			add_location(div4, file$e, 23, 12, 1017);
    			attr_dev(div5, "class", "col-lg-12");
    			add_location(div5, file$e, 22, 8, 981);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$e, 9, 4, 339);
    			attr_dev(div7, "class", "contenedor-datos");
    			attr_dev(div7, "id", "divHeaderBar");
    			add_location(div7, file$e, 8, 0, 286);
    			attr_dev(h51, "class", "m-b-0");
    			add_location(h51, file$e, 49, 20, 2432);
    			attr_dev(div8, "class", "card-header");
    			add_location(div8, file$e, 48, 16, 2386);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$e, 58, 32, 2768);
    			attr_dev(input0, "type", "date");
    			attr_dev(input0, "data-bind", "value: fecha");
    			attr_dev(input0, "class", "form-control autosave");
    			add_location(input0, file$e, 59, 32, 2839);
    			attr_dev(div9, "class", "col-md-3 form-group");
    			add_location(div9, file$e, 57, 28, 2702);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$e, 62, 32, 3043);
    			attr_dev(input1, "type", "time");
    			attr_dev(input1, "data-bind", "value: hora");
    			attr_dev(input1, "class", "form-control autosave");
    			add_location(input1, file$e, 63, 32, 3113);
    			attr_dev(div10, "class", "col-md-3 form-group");
    			add_location(div10, file$e, 61, 28, 2977);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$e, 66, 32, 3316);
    			attr_dev(input2, "data-bind", "value: edadPaciente");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "form-control autosave");
    			add_location(input2, file$e, 67, 32, 3388);
    			attr_dev(div11, "class", "col-md-3 form-group");
    			add_location(div11, file$e, 65, 28, 3250);
    			attr_dev(div12, "class", "form-row");
    			add_location(div12, file$e, 56, 24, 2651);
    			add_location(br, file$e, 69, 30, 3535);
    			attr_dev(label3, "for", "");
    			attr_dev(label3, "class", "font-secondary");
    			add_location(label3, file$e, 72, 32, 3681);
    			option0.__value = "";
    			option0.value = option0.__value;
    			attr_dev(option0, "data-select2-id", "635");
    			add_location(option0, file$e, 74, 36, 3952);
    			option1.__value = "2";
    			option1.value = option1.__value;
    			attr_dev(option1, "data-select2-id", "636");
    			add_location(option1, file$e, 75, 36, 4059);
    			option2.__value = "3";
    			option2.value = option2.__value;
    			attr_dev(option2, "data-select2-id", "637");
    			add_location(option2, file$e, 76, 36, 4162);
    			option3.__value = "5";
    			option3.value = option3.__value;
    			attr_dev(option3, "data-select2-id", "638");
    			add_location(option3, file$e, 77, 36, 4262);
    			option4.__value = "8";
    			option4.value = option4.__value;
    			attr_dev(option4, "data-select2-id", "639");
    			add_location(option4, file$e, 78, 36, 4363);
    			option5.__value = "9";
    			option5.value = option5.__value;
    			attr_dev(option5, "data-select2-id", "640");
    			add_location(option5, file$e, 79, 36, 4474);
    			option6.__value = "10";
    			option6.value = option6.__value;
    			attr_dev(option6, "data-select2-id", "641");
    			add_location(option6, file$e, 80, 36, 4574);
    			option7.__value = "11";
    			option7.value = option7.__value;
    			attr_dev(option7, "data-select2-id", "642");
    			add_location(option7, file$e, 81, 36, 4676);
    			option8.__value = "12";
    			option8.value = option8.__value;
    			attr_dev(option8, "data-select2-id", "643");
    			add_location(option8, file$e, 82, 36, 4778);
    			option9.__value = "13";
    			option9.value = option9.__value;
    			attr_dev(option9, "data-select2-id", "644");
    			add_location(option9, file$e, 83, 36, 4879);
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "id", "sltMedico");
    			set_style(select0, "width", "100%");
    			attr_dev(select0, "tabindex", "-1");
    			attr_dev(select0, "aria-hidden", "true");
    			select0.required = "";
    			attr_dev(select0, "data-select2-id", "sltMedico");
    			add_location(select0, file$e, 73, 32, 3777);
    			attr_dev(div13, "class", "form-group col-md-3");
    			add_location(div13, file$e, 71, 28, 3615);
    			attr_dev(label4, "for", "");
    			attr_dev(label4, "class", "font-secondary");
    			add_location(label4, file$e, 87, 32, 5118);
    			option10.__value = "";
    			option10.value = option10.__value;
    			attr_dev(option10, "data-select2-id", "647");
    			add_location(option10, file$e, 89, 36, 5392);
    			option11.__value = "3";
    			option11.value = option11.__value;
    			attr_dev(option11, "data-select2-id", "648");
    			add_location(option11, file$e, 90, 36, 5500);
    			option12.__value = "4";
    			option12.value = option12.__value;
    			attr_dev(option12, "data-select2-id", "649");
    			add_location(option12, file$e, 91, 36, 5595);
    			option13.__value = "5";
    			option13.value = option13.__value;
    			attr_dev(option13, "data-select2-id", "650");
    			add_location(option13, file$e, 92, 36, 5694);
    			option14.__value = "6";
    			option14.value = option14.__value;
    			attr_dev(option14, "data-select2-id", "651");
    			add_location(option14, file$e, 93, 36, 5792);
    			option15.__value = "7";
    			option15.value = option15.__value;
    			attr_dev(option15, "data-select2-id", "652");
    			add_location(option15, file$e, 94, 36, 5892);
    			attr_dev(select1, "class", "form-control");
    			attr_dev(select1, "id", "sltAseguradora");
    			set_style(select1, "width", "100%");
    			attr_dev(select1, "tabindex", "-1");
    			attr_dev(select1, "aria-hidden", "true");
    			select1.required = "";
    			attr_dev(select1, "data-select2-id", "sltAseguradora");
    			add_location(select1, file$e, 88, 32, 5207);
    			attr_dev(div14, "class", "form-group col-md-3");
    			add_location(div14, file$e, 86, 28, 5052);
    			attr_dev(label5, "for", "");
    			attr_dev(label5, "class", "font-secondary");
    			add_location(label5, file$e, 98, 32, 6129);
    			option16.__value = "";
    			option16.value = option16.__value;
    			attr_dev(option16, "data-select2-id", "647");
    			add_location(option16, file$e, 100, 36, 6396);
    			option17.__value = "3";
    			option17.value = option17.__value;
    			attr_dev(option17, "data-select2-id", "648");
    			add_location(option17, file$e, 101, 36, 6501);
    			attr_dev(select2, "class", "form-control");
    			attr_dev(select2, "id", "sltAseguradora");
    			set_style(select2, "width", "100%");
    			attr_dev(select2, "tabindex", "-1");
    			attr_dev(select2, "aria-hidden", "true");
    			select2.required = "";
    			attr_dev(select2, "data-select2-id", "sltAseguradora");
    			add_location(select2, file$e, 99, 32, 6211);
    			attr_dev(div15, "class", "form-group col-md-3");
    			add_location(div15, file$e, 97, 28, 6063);
    			attr_dev(div16, "class", "form-row");
    			add_location(div16, file$e, 70, 24, 3564);
    			attr_dev(form0, "action", "");
    			add_location(form0, file$e, 55, 20, 2610);
    			attr_dev(div17, "class", "card-body");
    			add_location(div17, file$e, 54, 16, 2566);
    			attr_dev(div18, "class", "card m-b-30");
    			attr_dev(div18, "data-bind", "using: atencionMedica");
    			add_location(div18, file$e, 47, 12, 2310);
    			attr_dev(div19, "class", "col-lg-12");
    			set_style(div19, "margin-top", "120px");
    			add_location(div19, file$e, 46, 8, 2247);
    			attr_dev(h52, "class", "m-b-0");
    			add_location(h52, file$e, 113, 20, 6943);
    			attr_dev(div20, "class", "card-header");
    			add_location(div20, file$e, 112, 16, 6897);
    			attr_dev(label6, "for", "");
    			attr_dev(label6, "class", "font-secondary");
    			add_location(label6, file$e, 122, 32, 7278);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "form-control");
    			add_location(input3, file$e, 123, 32, 7362);
    			attr_dev(div21, "class", "form-group col-md-3");
    			add_location(div21, file$e, 121, 28, 7212);
    			attr_dev(label7, "for", "");
    			attr_dev(label7, "class", "font-secondary");
    			add_location(label7, file$e, 126, 32, 7532);
    			option18.__value = "";
    			option18.value = option18.__value;
    			attr_dev(option18, "data-select2-id", "647");
    			add_location(option18, file$e, 128, 36, 7817);
    			option19.__value = "3";
    			option19.value = option19.__value;
    			attr_dev(option19, "data-select2-id", "648");
    			add_location(option19, file$e, 129, 36, 7922);
    			attr_dev(select3, "class", "form-control");
    			attr_dev(select3, "id", "sltAseguradora");
    			set_style(select3, "width", "100%");
    			attr_dev(select3, "tabindex", "-1");
    			attr_dev(select3, "aria-hidden", "true");
    			select3.required = "";
    			attr_dev(select3, "data-select2-id", "sltAseguradora");
    			add_location(select3, file$e, 127, 32, 7632);
    			attr_dev(div22, "class", "form-group col-md-3");
    			add_location(div22, file$e, 125, 28, 7466);
    			attr_dev(div23, "class", "form-row");
    			add_location(div23, file$e, 120, 24, 7161);
    			attr_dev(form1, "action", "");
    			add_location(form1, file$e, 119, 20, 7120);
    			attr_dev(div24, "class", "card-body");
    			add_location(div24, file$e, 118, 16, 7076);
    			attr_dev(div25, "class", "card m-b-30");
    			attr_dev(div25, "data-bind", "using: atencionMedica");
    			add_location(div25, file$e, 111, 12, 6821);
    			attr_dev(div26, "class", "col-lg-12");
    			set_style(div26, "margin-top", "20px");
    			add_location(div26, file$e, 110, 8, 6759);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$e, 45, 4, 2213);
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditarDatosAtencion",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/componentes/ModalTratamientos.svelte generated by Svelte v3.29.0 */

    const file$f = "src/componentes/ModalTratamientos.svelte";

    function create_fragment$g(ctx) {
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
    			add_location(h5, file$f, 4, 16, 232);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$f, 6, 20, 424);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$f, 5, 16, 327);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$f, 3, 12, 189);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Medicamento");
    			attr_dev(input0, "data-toggle", "dropdown");
    			add_location(input0, file$f, 13, 28, 774);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control readonly");
    			input1.readOnly = true;
    			attr_dev(input1, "data-bind", "click: limpiarMedicamentoSeleccionado, \n                            class: (idMedicamentoSeleccionado() == '')? 'd-none': '',\n                            value: nombreMedicamentoSeleccionado");
    			add_location(input1, file$f, 16, 28, 925);
    			attr_dev(a0, "href", "#!");
    			attr_dev(a0, "data-bind", "text: descripcion, click: $parent.seleccionarMedicamento ");
    			add_location(a0, file$f, 23, 40, 1627);
    			add_location(li0, file$f, 22, 36, 1582);
    			attr_dev(div1, "class", "contenidoLista");
    			attr_dev(div1, "data-bind", "foreach: medicamentos");
    			add_location(div1, file$f, 21, 32, 1483);
    			attr_dev(i, "class", "mdi mdi-plus");
    			add_location(i, file$f, 28, 49, 1954);
    			attr_dev(a1, "href", "#!");
    			add_location(a1, file$f, 28, 36, 1941);
    			attr_dev(li1, "class", "defecto");
    			add_location(li1, file$f, 27, 32, 1884);
    			attr_dev(ul, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul, "x-placement", "bottom-start");
    			set_style(ul, "position", "absolute");
    			set_style(ul, "will-change", "transform");
    			set_style(ul, "border-radius", "5px");
    			set_style(ul, "top", "0px");
    			set_style(ul, "left", "0px");
    			set_style(ul, "transform", "translate3d(0px, 36px, 0px)");
    			add_location(ul, file$f, 19, 28, 1217);
    			attr_dev(div2, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div2, file$f, 12, 24, 689);
    			attr_dev(div3, "class", "col-12");
    			add_location(div3, file$f, 11, 20, 644);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "data-bind", "value: dosis");
    			input2.required = true;
    			attr_dev(input2, "placeholder", "Cantidad dosis");
    			attr_dev(input2, "name", "");
    			add_location(input2, file$f, 39, 36, 2388);
    			attr_dev(div4, "class", "form-group buscardor dropdown");
    			add_location(div4, file$f, 38, 32, 2308);
    			attr_dev(div5, "class", "col-6");
    			add_location(div5, file$f, 37, 28, 2256);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$f, 51, 40, 3122);
    			select0.required = true;
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "data-bind", "options: unidades, \n                                    optionsCaption: '- Unidad de dosis -',\n                                    optionsValue: 'id',\n                                    optionsText: 'nombre',\n                                    value: unidadSeleccionada");
    			add_location(select0, file$f, 46, 36, 2759);
    			attr_dev(div6, "class", "form-group ");
    			add_location(div6, file$f, 45, 32, 2697);
    			attr_dev(div7, "class", "col-6");
    			add_location(div7, file$f, 44, 28, 2645);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$f, 36, 24, 2210);
    			attr_dev(div9, "class", "col-12");
    			add_location(div9, file$f, 35, 20, 2165);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$f, 64, 40, 3764);
    			attr_dev(select1, "class", "form-control");
    			select1.required = true;
    			attr_dev(select1, "data-bind", "options: vias, value: viaSeleccionada, optionsCaption: 'Vía'");
    			add_location(select1, file$f, 62, 36, 3572);
    			attr_dev(div10, "class", "form-group ");
    			add_location(div10, file$f, 61, 32, 3510);
    			attr_dev(div11, "class", "col-6");
    			add_location(div11, file$f, 60, 28, 3458);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "name", "option");
    			attr_dev(input3, "data-bind", "checked: monodosis");
    			input3.value = "1";
    			attr_dev(input3, "class", "cstm-switch-input");
    			add_location(input3, file$f, 71, 40, 4125);
    			attr_dev(span1, "class", "cstm-switch-indicator bg-success ");
    			add_location(span1, file$f, 73, 40, 4314);
    			attr_dev(span2, "class", "cstm-switch-description");
    			add_location(span2, file$f, 74, 40, 4410);
    			attr_dev(label0, "class", "cstm-switch mt-2");
    			add_location(label0, file$f, 70, 36, 4052);
    			attr_dev(div12, "class", " m-b-10");
    			add_location(div12, file$f, 69, 32, 3994);
    			attr_dev(div13, "class", "col-6");
    			add_location(div13, file$f, 68, 28, 3942);
    			attr_dev(div14, "class", "row");
    			add_location(div14, file$f, 59, 24, 3412);
    			attr_dev(div15, "class", "col-12");
    			add_location(div15, file$f, 58, 20, 3367);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "form-control");
    			input4.required = true;
    			attr_dev(input4, "placeholder", "Intervalo (Tiempo)");
    			attr_dev(input4, "max", "100000");
    			attr_dev(input4, "name", "");
    			add_location(input4, file$f, 85, 36, 4886);
    			attr_dev(div16, "class", "form-group buscardor dropdown");
    			add_location(div16, file$f, 84, 32, 4806);
    			attr_dev(div17, "class", "col-6");
    			add_location(div17, file$f, 83, 28, 4754);
    			attr_dev(input5, "type", "radio");
    			attr_dev(input5, "name", "Tiempo");
    			input5.value = "H";
    			attr_dev(input5, "class", "cstm-switch-input");
    			input5.checked = "checked";
    			add_location(input5, file$f, 92, 40, 5317);
    			attr_dev(span3, "class", "cstm-switch-indicator ");
    			add_location(span3, file$f, 94, 40, 5490);
    			attr_dev(span4, "class", "cstm-switch-description");
    			add_location(span4, file$f, 95, 40, 5575);
    			attr_dev(label1, "class", "cstm-switch mt-2");
    			add_location(label1, file$f, 91, 36, 5244);
    			attr_dev(input6, "type", "radio");
    			input6.value = "M";
    			attr_dev(input6, "class", "cstm-switch-input");
    			add_location(input6, file$f, 98, 40, 5781);
    			attr_dev(span5, "class", "cstm-switch-indicator ");
    			add_location(span5, file$f, 100, 40, 5922);
    			attr_dev(span6, "class", "cstm-switch-description");
    			add_location(span6, file$f, 101, 40, 6007);
    			attr_dev(label2, "class", "cstm-switch mt-2");
    			add_location(label2, file$f, 97, 36, 5708);
    			attr_dev(div18, "class", "m-b-10");
    			add_location(div18, file$f, 90, 32, 5187);
    			attr_dev(div19, "class", "col-6");
    			add_location(div19, file$f, 89, 28, 5135);
    			attr_dev(div20, "class", "row");
    			add_location(div20, file$f, 82, 24, 4708);
    			attr_dev(div21, "class", "col-12");
    			add_location(div21, file$f, 81, 20, 4663);
    			option2.selected = true;
    			option2.disabled = true;
    			option2.__value = "Diagnostico para el tratamiento";
    			option2.value = option2.__value;
    			add_location(option2, file$f, 114, 32, 6669);
    			select2.required = true;
    			attr_dev(select2, "class", "form-control");
    			attr_dev(select2, "data-bind", "options: parent.diagnosticos, \n                                optionsCaption: 'Diagnostico para el tratamiento',\n                                optionsText: 'problemaMedico',\n                                value: diagnostico");
    			add_location(select2, file$f, 110, 28, 6358);
    			attr_dev(div22, "class", "form-group ");
    			add_location(div22, file$f, 109, 24, 6304);
    			attr_dev(div23, "class", "col-12");
    			add_location(div23, file$f, 108, 20, 6259);
    			attr_dev(textarea, "class", "form-control mt-2");
    			attr_dev(textarea, "data-bind", "value: comentario");
    			attr_dev(textarea, "placeholder", "Comentarios");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "Comentario");
    			add_location(textarea, file$f, 121, 28, 6951);
    			attr_dev(div24, "class", "form-group");
    			add_location(div24, file$f, 120, 24, 6898);
    			attr_dev(div25, "class", "col-12");
    			add_location(div25, file$f, 119, 20, 6853);
    			attr_dev(div26, "class", "modal-body");
    			add_location(div26, file$f, 10, 16, 599);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$f, 129, 20, 7328);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "btn btn-primary");
    			add_location(button2, file$f, 132, 20, 7479);
    			attr_dev(div27, "class", "modal-footer");
    			add_location(div27, file$f, 128, 16, 7281);
    			attr_dev(form, "data-bind", "submit: agregar");
    			attr_dev(form, "id", "formularioTratamiento");
    			add_location(form, file$f, 9, 12, 521);
    			attr_dev(div28, "class", "modal-content");
    			add_location(div28, file$f, 2, 8, 149);
    			attr_dev(div29, "class", "modal-dialog");
    			attr_dev(div29, "role", "document");
    			add_location(div29, file$f, 1, 4, 98);
    			attr_dev(div30, "class", "modal fade");
    			attr_dev(div30, "id", "modalTratamiento");
    			attr_dev(div30, "tabindex", "-1");
    			attr_dev(div30, "role", "dialog");
    			attr_dev(div30, "aria-hidden", "true");
    			add_location(div30, file$f, 0, 0, 0);
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
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
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
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalTratamientos",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/componentes/ModalInterconsulta.svelte generated by Svelte v3.29.0 */

    const file$g = "src/componentes/ModalInterconsulta.svelte";

    function create_fragment$h(ctx) {
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
    			add_location(h5, file$g, 5, 20, 356);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$g, 7, 24, 550);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$g, 6, 20, 449);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$g, 4, 16, 309);
    			attr_dev(label0, "for", "");
    			attr_dev(label0, "class", "text-primary");
    			add_location(label0, file$g, 14, 32, 891);
    			attr_dev(textarea0, "class", "form-control");
    			attr_dev(textarea0, "data-bind", "value: resumen");
    			set_style(textarea0, "width", "100%");
    			set_style(textarea0, "display", "block");
    			set_style(textarea0, "height", "150px");
    			attr_dev(textarea0, "name", "Comentario");
    			add_location(textarea0, file$g, 15, 32, 974);
    			attr_dev(div1, "class", "form-group col-md-12");
    			add_location(div1, file$g, 13, 28, 824);
    			attr_dev(label1, "for", "");
    			attr_dev(label1, "class", "text-primary");
    			add_location(label1, file$g, 19, 32, 1280);
    			attr_dev(textarea1, "class", "form-control");
    			attr_dev(textarea1, "data-bind", "value: recomendaciones");
    			set_style(textarea1, "width", "100%");
    			set_style(textarea1, "display", "block");
    			set_style(textarea1, "height", "150px");
    			attr_dev(textarea1, "name", "Comentario");
    			add_location(textarea1, file$g, 20, 32, 1380);
    			attr_dev(div2, "class", "form-group col-md-12");
    			add_location(div2, file$g, 18, 28, 1213);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$g, 26, 36, 1813);
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "id", "sltDepartamentos");
    			set_style(select0, "width", "100%");
    			select0.required = true;
    			add_location(select0, file$g, 25, 32, 1695);
    			attr_dev(div3, "class", "form-group col-lg-12");
    			add_location(div3, file$g, 24, 28, 1628);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$g, 31, 36, 2158);
    			attr_dev(select1, "class", "form-control");
    			attr_dev(select1, "id", "sltEspecialistasDepartamento");
    			set_style(select1, "width", "100%");
    			select1.required = true;
    			add_location(select1, file$g, 30, 32, 2028);
    			attr_dev(div4, "class", "form-group col-lg-12");
    			add_location(div4, file$g, 29, 28, 1961);
    			attr_dev(div5, "class", "form-row");
    			add_location(div5, file$g, 12, 24, 773);
    			attr_dev(form, "class", "floating-label col-md-12 show-label");
    			add_location(form, file$g, 11, 20, 698);
    			attr_dev(div6, "class", "modal-body");
    			add_location(div6, file$g, 10, 16, 653);
    			attr_dev(h30, "class", "mdi mdi-close-outline");
    			add_location(h30, file$g, 43, 32, 2627);
    			attr_dev(div7, "class", "text-overline");
    			add_location(div7, file$g, 44, 32, 2699);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "text-danger");
    			attr_dev(a0, "data-dismiss", "modal");
    			add_location(a0, file$g, 42, 28, 2541);
    			attr_dev(div8, "class", "col");
    			add_location(div8, file$g, 41, 24, 2495);
    			attr_dev(h31, "class", "mdi mdi-send");
    			add_location(h31, file$g, 49, 32, 2965);
    			attr_dev(div9, "class", "text-overline");
    			add_location(div9, file$g, 50, 32, 3028);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "data-bind", "click: crear");
    			attr_dev(a1, "class", "text-success");
    			add_location(a1, file$g, 48, 28, 2873);
    			attr_dev(div10, "class", "col");
    			add_location(div10, file$g, 47, 24, 2827);
    			attr_dev(div11, "class", "row text-center p-b-10");
    			add_location(div11, file$g, 40, 20, 2434);
    			attr_dev(div12, "class", "modal-footer");
    			add_location(div12, file$g, 39, 16, 2387);
    			attr_dev(div13, "class", "modal-content");
    			add_location(div13, file$g, 3, 12, 265);
    			attr_dev(div14, "class", "modal-dialog");
    			attr_dev(div14, "role", "document");
    			add_location(div14, file$g, 2, 8, 210);
    			attr_dev(div15, "class", "modal fade modal-slide-right");
    			attr_dev(div15, "id", "modalInterconsulta");
    			attr_dev(div15, "tabindex", "-1");
    			attr_dev(div15, "role", "dialog");
    			attr_dev(div15, "aria-labelledby", "modalInterconsulta");
    			set_style(div15, "display", "none");
    			set_style(div15, "padding-right", "16px");
    			attr_dev(div15, "aria-modal", "true");
    			add_location(div15, file$g, 0, 0, 0);
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
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
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalInterconsulta",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/componentes/ModalAntecedentes.svelte generated by Svelte v3.29.0 */

    const file$h = "src/componentes/ModalAntecedentes.svelte";

    function create_fragment$i(ctx) {
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
    			t28 = text("\n                                                                    Eliminar");
    			t29 = space();
    			div30 = element("div");
    			textarea = element("textarea");
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "modalAntecedentes");
    			add_location(h5, file$h, 5, 16, 314);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$h, 7, 20, 492);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$h, 6, 16, 395);
    			attr_dev(i0, "class", "mdi mdi-check-all");
    			add_location(i0, file$h, 11, 112, 766);
    			add_location(i1, file$h, 12, 63, 832);
    			attr_dev(div0, "class", "guardando mr-2 text-success");
    			attr_dev(div0, "data-bind", "html: content, class: contentClass");
    			add_location(div0, file$h, 11, 24, 678);
    			attr_dev(div1, "class", "guardar-documento");
    			add_location(div1, file$h, 10, 20, 622);
    			set_style(div2, "margin-right", "40px");
    			add_location(div2, file$h, 9, 16, 568);
    			attr_dev(div3, "class", "modal-header");
    			add_location(div3, file$h, 4, 12, 271);
    			attr_dev(div4, "class", "card-title");
    			attr_dev(div4, "data-bind", "text: nombre");
    			add_location(div4, file$h, 22, 32, 1277);
    			attr_dev(div5, "class", "card-header");
    			add_location(div5, file$h, 21, 28, 1219);
    			attr_dev(i2, "class", "mdi mdi-plus");
    			add_location(i2, file$h, 27, 101, 1767);
    			attr_dev(span1, "data-bind", "text: nombre");
    			add_location(span1, file$h, 29, 40, 1880);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-outline-primary btn-sm mb-1 mr-2");
    			set_style(button1, "box-shadow", "none");
    			attr_dev(button1, "data-bind", "click: $parent.agregar");
    			add_location(button1, file$h, 26, 36, 1595);
    			attr_dev(div6, "class", "botones-antecedentes");
    			attr_dev(div6, "data-bind", "foreach: tiposAntecedentesFiltrados");
    			add_location(div6, file$h, 25, 32, 1476);
    			attr_dev(div7, "class", "col-lg-12");
    			attr_dev(div7, "data-bind", "foreach: antecedentesFiltrados");
    			add_location(div7, file$h, 36, 44, 2236);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$h, 35, 40, 2174);
    			attr_dev(div9, "class", "col-12");
    			add_location(div9, file$h, 34, 36, 2113);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$h, 33, 32, 2059);
    			attr_dev(div11, "class", "card-body");
    			add_location(div11, file$h, 24, 28, 1420);
    			attr_dev(div12, "class", "card  m-b-30");
    			set_style(div12, "box-shadow", "none");
    			set_style(div12, "border", "#32325d solid 1px");
    			add_location(div12, file$h, 20, 24, 1111);
    			attr_dev(div13, "class", "card-title");
    			attr_dev(div13, "data-bind", "text: nombre");
    			add_location(div13, file$h, 45, 32, 2695);
    			attr_dev(div14, "class", "card-header");
    			add_location(div14, file$h, 44, 28, 2637);
    			attr_dev(i3, "class", "mdi mdi-plus");
    			add_location(i3, file$h, 50, 101, 3188);
    			attr_dev(span2, "data-bind", "text: nombre");
    			add_location(span2, file$h, 52, 40, 3301);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-outline-primary btn-sm mb-1 mr-2");
    			set_style(button2, "box-shadow", "none");
    			attr_dev(button2, "data-bind", "click: $parent.agregar");
    			add_location(button2, file$h, 49, 36, 3016);
    			attr_dev(div15, "class", "botones-antecedentes");
    			attr_dev(div15, "data-bind", "foreach: tiposAntecedentesFiltrados");
    			add_location(div15, file$h, 48, 32, 2897);
    			attr_dev(div16, "class", "col-lg-12");
    			attr_dev(div16, "data-bind", "foreach: antecedentesFiltrados");
    			add_location(div16, file$h, 59, 44, 3651);
    			attr_dev(div17, "class", "row");
    			add_location(div17, file$h, 58, 40, 3589);
    			attr_dev(div18, "class", "col-12");
    			add_location(div18, file$h, 57, 36, 3528);
    			attr_dev(div19, "class", "row");
    			add_location(div19, file$h, 56, 32, 3474);
    			attr_dev(div20, "class", "card-body");
    			add_location(div20, file$h, 47, 28, 2841);
    			attr_dev(div21, "class", "card  m-b-30");
    			set_style(div21, "box-shadow", "none");
    			set_style(div21, "border", "#32325d solid 1px");
    			add_location(div21, file$h, 43, 24, 2529);
    			attr_dev(div22, "class", "card-title");
    			attr_dev(div22, "data-bind", "text: nombre");
    			add_location(div22, file$h, 69, 32, 4111);
    			attr_dev(div23, "class", "card-header");
    			add_location(div23, file$h, 68, 28, 4053);
    			attr_dev(i4, "class", "mdi mdi-plus");
    			add_location(i4, file$h, 74, 101, 4603);
    			attr_dev(span3, "data-bind", "text: nombre");
    			add_location(span3, file$h, 76, 40, 4716);
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "class", "btn btn-outline-primary btn-sm mb-1 mr-2");
    			set_style(button3, "box-shadow", "none");
    			attr_dev(button3, "data-bind", "click: $parent.agregar");
    			add_location(button3, file$h, 73, 36, 4431);
    			attr_dev(div24, "class", "botones-antecedentes");
    			attr_dev(div24, "data-bind", "foreach: tiposAntecedentesFiltrados");
    			add_location(div24, file$h, 72, 32, 4312);
    			attr_dev(i5, "class", "mdi mdi-history mdi-18px");
    			add_location(i5, file$h, 86, 80, 5421);
    			attr_dev(span4, "data-bind", "text: nombre");
    			add_location(span4, file$h, 86, 121, 5462);
    			attr_dev(div25, "class", "card-title");
    			add_location(div25, file$h, 86, 56, 5397);
    			attr_dev(div26, "class", "card-header");
    			add_location(div26, file$h, 85, 52, 5315);
    			attr_dev(i6, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i6, file$h, 92, 64, 6002);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "data-toggle", "dropdown");
    			attr_dev(a, "aria-haspopup", "true");
    			attr_dev(a, "aria-expanded", "false");
    			add_location(a, file$h, 91, 60, 5859);
    			attr_dev(i7, "class", "mdi mdi-trash-can-outline");
    			add_location(i7, file$h, 95, 148, 6367);
    			attr_dev(button4, "class", "dropdown-item text-danger");
    			attr_dev(button4, "data-bind", "click: eliminar");
    			attr_dev(button4, "type", "button");
    			add_location(button4, file$h, 95, 64, 6283);
    			attr_dev(div27, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div27, file$h, 94, 60, 6171);
    			attr_dev(div28, "class", "dropdown");
    			add_location(div28, file$h, 90, 56, 5776);
    			attr_dev(div29, "class", "card-controls");
    			add_location(div29, file$h, 89, 52, 5692);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "data-bind", "value: descripcion");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			set_style(textarea, "height", "100px");
    			attr_dev(textarea, "id", "exampleFormControlTextarea1");
    			attr_dev(textarea, "rows", "5");
    			attr_dev(textarea, "name", "Comentario");
    			add_location(textarea, file$h, 101, 56, 6816);
    			attr_dev(div30, "class", "card-body");
    			add_location(div30, file$h, 100, 52, 6736);
    			attr_dev(div31, "class", "card m-b-20 mt-3");
    			set_style(div31, "box-shadow", "none");
    			set_style(div31, "border", "1px grey solid");
    			add_location(div31, file$h, 84, 48, 5182);
    			attr_dev(div32, "class", "col-lg-12");
    			attr_dev(div32, "data-bind", "foreach: antecedentesFiltrados");
    			add_location(div32, file$h, 83, 44, 5067);
    			attr_dev(div33, "class", "row");
    			add_location(div33, file$h, 82, 40, 5005);
    			attr_dev(div34, "class", "col-12");
    			add_location(div34, file$h, 81, 36, 4944);
    			attr_dev(div35, "class", "row");
    			add_location(div35, file$h, 80, 32, 4890);
    			attr_dev(div36, "class", "card-body");
    			add_location(div36, file$h, 71, 28, 4256);
    			attr_dev(div37, "class", "card  m-b-30");
    			set_style(div37, "box-shadow", "none");
    			set_style(div37, "border", "#32325d solid 1px");
    			add_location(div37, file$h, 67, 24, 3945);
    			attr_dev(div38, "class", "col-lg-12");
    			attr_dev(div38, "data-bind", "foreach: gruposAntecedentes");
    			add_location(div38, file$h, 18, 20, 1022);
    			attr_dev(div39, "class", "row");
    			add_location(div39, file$h, 17, 16, 984);
    			attr_dev(div40, "class", "modal-body");
    			add_location(div40, file$h, 16, 12, 943);
    			attr_dev(div41, "class", "modal-content");
    			add_location(div41, file$h, 3, 8, 231);
    			attr_dev(div42, "class", "modal-dialog");
    			attr_dev(div42, "role", "document");
    			add_location(div42, file$h, 2, 4, 180);
    			attr_dev(div43, "class", "modal fade modal-slide-right");
    			attr_dev(div43, "id", "modalAntecedentes");
    			attr_dev(div43, "tabindex", "-1");
    			attr_dev(div43, "role", "dialog");
    			attr_dev(div43, "aria-labelledby", "modalAntecedentes");
    			set_style(div43, "display", "none");
    			attr_dev(div43, "aria-hidden", "true");
    			add_location(div43, file$h, 0, 0, 0);
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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
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
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalAntecedentes",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/componentes/OrdenesMedicas.svelte generated by Svelte v3.29.0 */

    const file$i = "src/componentes/OrdenesMedicas.svelte";

    function create_fragment$j(ctx) {
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
    			t4 = text(" Agregar\n                    tratamientos");
    			t5 = space();
    			a1 = element("a");
    			i1 = element("i");
    			t6 = space();
    			div2 = element("div");
    			button0 = element("button");
    			i2 = element("i");
    			t7 = text("\n                        Imprimir estudios");
    			t8 = space();
    			button1 = element("button");
    			i3 = element("i");
    			t9 = text("\n                        Agregar nuevo estudio");
    			t10 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			span0 = element("span");
    			span0.textContent = "10MG de: OLANZAPINA DE 20MG";
    			t12 = text(" |\n                                ");
    			span1 = element("span");
    			span1.textContent = "Una sola vez";
    			t14 = text(" |\n                                ");
    			span2 = element("span");
    			span2.textContent = "Vía: Oral";
    			t16 = text(" |\n                                ");
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
    			t23 = text(" |\n                                ");
    			span5 = element("span");
    			span5.textContent = "Cada 12 Horas/s";
    			t25 = text(" |\n                                ");
    			span6 = element("span");
    			span6.textContent = "Vía: Oral";
    			t27 = text(" |\n                                ");
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
    			t35 = text("\n                        Imprimir estudios");
    			t36 = space();
    			button3 = element("button");
    			i10 = element("i");
    			t37 = text("\n                        Agregar nuevo estudio");
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
    			add_location(h4, file$i, 1, 4, 53);
    			attr_dev(div0, "class", "card-title");
    			add_location(div0, file$i, 4, 12, 181);
    			attr_dev(div1, "class", "card-header");
    			add_location(div1, file$i, 3, 8, 143);
    			attr_dev(i0, "class", "mdi mdi-plus-box");
    			add_location(i0, file$i, 8, 112, 422);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "btn  btn-success btn-sm");
    			attr_dev(a0, "data-toggle", "modal");
    			attr_dev(a0, "data-target", "#modalTratamiento");
    			add_location(a0, file$i, 8, 16, 326);
    			attr_dev(i1, "class", "mdi mdi-printer");
    			add_location(i1, file$i, 11, 123, 647);
    			attr_dev(a1, "type", "button");
    			attr_dev(a1, "data-original-title", "Imprimir tratamientos");
    			attr_dev(a1, "href", "/Reporte/NotaMedica/110?idAtencion=115");
    			add_location(a1, file$i, 11, 16, 540);
    			attr_dev(i2, "class", "mdi mdi-printer");
    			add_location(i2, file$i, 14, 77, 848);
    			attr_dev(button0, "class", "dropdown-item text-primary");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$i, 14, 20, 791);
    			attr_dev(i3, "class", "mdi mdi-plus");
    			add_location(i3, file$i, 16, 77, 1008);
    			attr_dev(button1, "class", "dropdown-item text-success");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$i, 16, 20, 951);
    			attr_dev(div2, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div2, file$i, 13, 16, 723);
    			attr_dev(div3, "class", "dropdown");
    			add_location(div3, file$i, 7, 12, 287);
    			attr_dev(div4, "class", "card-controls");
    			add_location(div4, file$i, 6, 8, 247);
    			attr_dev(span0, "data-bind", "text: disificacion");
    			add_location(span0, file$i, 26, 32, 1394);
    			attr_dev(span1, "data-bind", "text: periodicidad");
    			add_location(span1, file$i, 27, 32, 1500);
    			attr_dev(span2, "data-bind", "text: 'Vía: ' + via()");
    			add_location(span2, file$i, 28, 32, 1591);
    			attr_dev(span3, "class", "badge");
    			set_style(span3, "line-height", "1.7");
    			attr_dev(span3, "data-bind", "text: diagnostico");
    			add_location(span3, file$i, 29, 32, 1682);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			add_location(input0, file$i, 33, 40, 2004);
    			attr_dev(div5, "class", "form-group col-md-12");
    			add_location(div5, file$i, 32, 36, 1929);
    			attr_dev(div6, "class", "row mt-3");
    			add_location(div6, file$i, 31, 32, 1870);
    			attr_dev(i4, "class", "mdi-18px mdi mdi-comment-plus-outline");
    			add_location(i4, file$i, 40, 68, 2489);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "text-primary");
    			attr_dev(a2, "data-bind", "click: modoEditarOn");
    			attr_dev(a2, "title", "Agregar comentarios");
    			add_location(a2, file$i, 39, 36, 2355);
    			attr_dev(i5, "class", "mdi-18px mdi mdi-trash-can-outline");
    			add_location(i5, file$i, 43, 111, 2813);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "text-danger");
    			attr_dev(a3, "data-toggle", "tooltip");
    			attr_dev(a3, "data-placement", "top");
    			attr_dev(a3, "data-original-title", "Eliminar tratamiento");
    			attr_dev(a3, "data-bind", "click: eliminar");
    			add_location(a3, file$i, 42, 36, 2627);
    			set_style(div7, "position", "absolute");
    			set_style(div7, "top", "0");
    			set_style(div7, "right", "0");
    			set_style(div7, "padding", "10px");
    			set_style(div7, "background-color", "white");
    			set_style(div7, "border-bottom-left-radius", "5px");
    			add_location(div7, file$i, 37, 32, 2160);
    			add_location(li0, file$i, 25, 24, 1357);
    			attr_dev(span4, "data-bind", "text: disificacion");
    			add_location(span4, file$i, 49, 32, 3043);
    			attr_dev(span5, "data-bind", "text: periodicidad");
    			add_location(span5, file$i, 50, 32, 3152);
    			attr_dev(span6, "data-bind", "text: 'Vía: ' + via()");
    			add_location(span6, file$i, 51, 32, 3246);
    			attr_dev(span7, "class", "badge");
    			set_style(span7, "line-height", "1.7");
    			attr_dev(span7, "data-bind", "text: diagnostico");
    			add_location(span7, file$i, 52, 32, 3337);
    			attr_dev(i6, "class", "mdi-18px mdi mdi-comment-plus-outline");
    			add_location(i6, file$i, 55, 40, 3818);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "class", "text-primary");
    			attr_dev(a4, "data-bind", "click: modoEditarOn");
    			attr_dev(a4, "title", "Agregar comentarios");
    			add_location(a4, file$i, 54, 36, 3683);
    			attr_dev(i7, "class", "mdi-18px mdi mdi-trash-can-outline");
    			add_location(i7, file$i, 58, 40, 4136);
    			attr_dev(a5, "href", "/");
    			attr_dev(a5, "class", "text-danger");
    			attr_dev(a5, "data-toggle", "tooltip");
    			attr_dev(a5, "data-placement", "top");
    			attr_dev(a5, "data-original-title", "Eliminar tratamiento");
    			attr_dev(a5, "data-bind", "click: eliminar");
    			add_location(a5, file$i, 57, 36, 3949);
    			set_style(div8, "position", "absolute");
    			set_style(div8, "top", "0");
    			set_style(div8, "right", "0");
    			set_style(div8, "padding", "10px");
    			set_style(div8, "background-color", "white");
    			set_style(div8, "border-bottom-left-radius", "5px");
    			add_location(div8, file$i, 53, 32, 3524);
    			add_location(li1, file$i, 48, 24, 3006);
    			attr_dev(ul0, "class", "list-info");
    			attr_dev(ul0, "data-bind", "foreach: tratamientos");
    			add_location(ul0, file$i, 24, 20, 1276);
    			attr_dev(div9, "class", "col-md-12 mb-2");
    			add_location(div9, file$i, 23, 16, 1227);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$i, 22, 12, 1193);
    			attr_dev(div11, "class", "card-body");
    			add_location(div11, file$i, 21, 8, 1157);
    			attr_dev(div12, "class", "card m-b-20 mt-3");
    			add_location(div12, file$i, 2, 4, 104);
    			attr_dev(div13, "class", "card-title");
    			add_location(div13, file$i, 70, 12, 4468);
    			attr_dev(div14, "class", "card-header");
    			add_location(div14, file$i, 69, 8, 4430);
    			attr_dev(i8, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i8, file$i, 74, 95, 4701);
    			attr_dev(a6, "href", "/");
    			attr_dev(a6, "data-toggle", "dropdown");
    			attr_dev(a6, "aria-haspopup", "true");
    			attr_dev(a6, "aria-expanded", "false");
    			add_location(a6, file$i, 74, 16, 4622);
    			attr_dev(i9, "class", "mdi mdi-printer");
    			add_location(i9, file$i, 76, 77, 4891);
    			attr_dev(button2, "class", "dropdown-item text-primary");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file$i, 76, 20, 4834);
    			attr_dev(i10, "class", "mdi mdi-plus");
    			add_location(i10, file$i, 78, 77, 5051);
    			attr_dev(button3, "class", "dropdown-item text-success");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file$i, 78, 20, 4994);
    			attr_dev(div15, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div15, file$i, 75, 16, 4766);
    			attr_dev(div16, "class", "dropdown dropdown-vnc");
    			add_location(div16, file$i, 73, 12, 4570);
    			attr_dev(div17, "class", "card-controls");
    			add_location(div17, file$i, 72, 8, 4530);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "name", "");
    			attr_dev(input1, "data-toggle", "dropdown");
    			attr_dev(input1, "aria-haspopup", "true");
    			attr_dev(input1, "aria-expanded", "false");
    			input1.required = "true";
    			add_location(input1, file$i, 90, 32, 5533);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "form-control readonly d-none");
    			attr_dev(input2, "name", "");
    			input2.readOnly = "";
    			attr_dev(input2, "aria-haspopup", "true");
    			attr_dev(input2, "aria-expanded", "true");
    			attr_dev(input2, "data-bind", "click: limpiar, value: nombreEstudioSeleccionado, class: (nombreEstudioSeleccionado() =='')? 'd-none' : ''");
    			add_location(input2, file$i, 91, 32, 5696);
    			attr_dev(div18, "class", "contenidoLista");
    			attr_dev(div18, "data-bind", "foreach: listado");
    			add_location(div18, file$i, 93, 36, 6218);
    			attr_dev(i11, "class", "mdi mdi-plus");
    			add_location(i11, file$i, 95, 90, 6429);
    			attr_dev(a7, "href", "/");
    			attr_dev(a7, "data-bind", "click: agregarManualmente");
    			add_location(a7, file$i, 95, 40, 6379);
    			attr_dev(li2, "class", "defecto");
    			add_location(li2, file$i, 94, 36, 6318);
    			attr_dev(ul1, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul1, "id", "buscador");
    			attr_dev(ul1, "x-placement", "bottom-start");
    			set_style(ul1, "position", "absolute");
    			set_style(ul1, "will-change", "transform");
    			set_style(ul1, "border-radius", "5px");
    			set_style(ul1, "top", "0px");
    			set_style(ul1, "left", "0px");
    			set_style(ul1, "transform", "translate3d(0px, 36px, 0px)");
    			add_location(ul1, file$i, 92, 32, 5966);
    			attr_dev(div19, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div19, file$i, 89, 28, 5444);
    			attr_dev(div20, "class", "col-lg-6 col-md-12");
    			add_location(div20, file$i, 88, 24, 5383);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$i, 105, 56, 7061);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$i, 105, 117, 7122);
    			attr_dev(select, "class", "form-control");
    			select.required = "";
    			attr_dev(select, "data-bind", "options: diagnosticos, \n                                    optionsCaption: '- Diagnostico para el tratamiento -',\n                                    optionsText: 'problemaMedico',\n                                    value: diagnostico");
    			add_location(select, file$i, 102, 32, 6771);
    			attr_dev(div21, "class", "form-group ");
    			add_location(div21, file$i, 101, 28, 6713);
    			attr_dev(div22, "class", "col-lg-5 col-md-12");
    			add_location(div22, file$i, 100, 24, 6652);
    			attr_dev(i12, "class", "mdi mdi-plus");
    			add_location(i12, file$i, 110, 181, 7546);
    			attr_dev(button4, "type", "submit");
    			attr_dev(button4, "class", "btn btn-success btn-block mb-3");
    			attr_dev(button4, "data-toggle", "tooltip");
    			attr_dev(button4, "data-placement", "right");
    			attr_dev(button4, "title", "");
    			attr_dev(button4, "data-original-title", "Agregar estudio");
    			add_location(button4, file$i, 110, 28, 7393);
    			attr_dev(div23, "class", "col-lg-1 col-md-12");
    			add_location(div23, file$i, 109, 24, 7332);
    			attr_dev(form0, "class", "row");
    			attr_dev(form0, "data-bind", "submit: agregar");
    			add_location(form0, file$i, 87, 20, 5312);
    			attr_dev(div24, "class", "col-12");
    			add_location(div24, file$i, 86, 16, 5271);
    			attr_dev(p0, "class", "alert-body text-center mt-3");
    			add_location(p0, file$i, 117, 24, 7803);
    			attr_dev(div25, "class", "alert border alert-light");
    			attr_dev(div25, "role", "alert");
    			add_location(div25, file$i, 116, 20, 7727);
    			attr_dev(ul2, "class", "list-info");
    			attr_dev(ul2, "data-bind", "foreach: estudios");
    			add_location(ul2, file$i, 120, 20, 7952);
    			attr_dev(div26, "class", "col-md-12");
    			add_location(div26, file$i, 115, 16, 7683);
    			attr_dev(div27, "class", "row");
    			add_location(div27, file$i, 85, 12, 5237);
    			attr_dev(div28, "class", "card-body");
    			add_location(div28, file$i, 84, 8, 5201);
    			attr_dev(div29, "class", "card m-b-20");
    			add_location(div29, file$i, 68, 4, 4396);
    			attr_dev(div30, "class", "card-title");
    			add_location(div30, file$i, 128, 12, 8155);
    			attr_dev(div31, "class", "card-header");
    			add_location(div31, file$i, 127, 8, 8117);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "name", "");
    			attr_dev(input3, "data-toggle", "dropdown");
    			attr_dev(input3, "aria-haspopup", "true");
    			attr_dev(input3, "aria-expanded", "false");
    			input3.required = "true";
    			add_location(input3, file$i, 136, 32, 8554);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "class", "form-control readonly d-none");
    			attr_dev(input4, "name", "");
    			input4.readOnly = "";
    			attr_dev(input4, "aria-haspopup", "true");
    			attr_dev(input4, "aria-expanded", "true");
    			attr_dev(input4, "data-bind", "click: limpiar, value: nombreEstudioSeleccionado, class: (nombreEstudioSeleccionado() =='')? 'd-none' : ''");
    			add_location(input4, file$i, 137, 32, 8717);
    			attr_dev(div32, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div32, file$i, 135, 28, 8465);
    			attr_dev(div33, "class", "col-lg-11 col-md-12");
    			add_location(div33, file$i, 134, 24, 8403);
    			attr_dev(i13, "class", "mdi mdi-plus");
    			add_location(i13, file$i, 141, 181, 9259);
    			attr_dev(button5, "type", "submit");
    			attr_dev(button5, "class", "btn btn-success btn-block mb-3");
    			attr_dev(button5, "data-toggle", "tooltip");
    			attr_dev(button5, "data-placement", "right");
    			attr_dev(button5, "title", "");
    			attr_dev(button5, "data-original-title", "Agregar estudio");
    			add_location(button5, file$i, 141, 28, 9106);
    			attr_dev(div34, "class", "col-lg-1 col-md-12");
    			add_location(div34, file$i, 140, 24, 9045);
    			attr_dev(form1, "class", "row");
    			attr_dev(form1, "data-bind", "submit: agregar");
    			add_location(form1, file$i, 133, 20, 8332);
    			attr_dev(div35, "class", "col-12");
    			add_location(div35, file$i, 132, 16, 8291);
    			attr_dev(p1, "class", "alert-body text-center mt-3");
    			add_location(p1, file$i, 148, 24, 9516);
    			attr_dev(div36, "class", "alert border alert-light");
    			attr_dev(div36, "role", "alert");
    			add_location(div36, file$i, 147, 20, 9440);
    			attr_dev(ul3, "class", "list-info");
    			attr_dev(ul3, "data-bind", "foreach: estudios");
    			add_location(ul3, file$i, 151, 20, 9665);
    			attr_dev(div37, "class", "col-md-12");
    			add_location(div37, file$i, 146, 16, 9396);
    			attr_dev(div38, "class", "row");
    			add_location(div38, file$i, 131, 12, 8257);
    			attr_dev(div39, "class", "card-body");
    			add_location(div39, file$i, 130, 8, 8221);
    			attr_dev(div40, "class", "card m-b-20");
    			add_location(div40, file$i, 126, 4, 8083);
    			attr_dev(div41, "class", "alert alert-secondary");
    			attr_dev(div41, "role", "alert");
    			add_location(div41, file$i, 0, 0, 0);
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
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
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
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OrdenesMedicas",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/componentes/OpcionesPaciente.svelte generated by Svelte v3.29.0 */

    const file$j = "src/componentes/OpcionesPaciente.svelte";

    function create_fragment$k(ctx) {
    	let div7;
    	let div6;
    	let div0;
    	let h5;
    	let span0;
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*paciente*/ ctx[0].nombres + "";
    	let t2;
    	let t3;
    	let t4_value = /*paciente*/ ctx[0].primerApellido + "";
    	let t4;
    	let t5;
    	let t6_value = /*paciente*/ ctx[0].segundoApellido + "";
    	let t6;
    	let t7;
    	let div3;
    	let div2;
    	let div1;
    	let i0;
    	let t8;
    	let i1;
    	let t10;
    	let div5;
    	let div4;
    	let button0;
    	let i2;
    	let t11;
    	let sapn0;
    	let t13;
    	let button1;
    	let i3;
    	let t14;
    	let sapn1;
    	let t16;
    	let button2;
    	let i4;
    	let t17;
    	let sapn2;
    	let t19;
    	let button3;
    	let i5;
    	let t20;
    	let sapn3;
    	let t22;
    	let button4;
    	let i6;
    	let t23;
    	let sapn4;
    	let t25;
    	let button5;
    	let i7;
    	let t26;
    	let sapn5;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			span0 = element("span");
    			t0 = text(/*tipoTab*/ ctx[1]);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			t6 = text(t6_value);
    			t7 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			i0 = element("i");
    			t8 = space();
    			i1 = element("i");
    			i1.textContent = "listo y guardado";
    			t10 = space();
    			div5 = element("div");
    			div4 = element("div");
    			button0 = element("button");
    			i2 = element("i");
    			t11 = space();
    			sapn0 = element("sapn");
    			sapn0.textContent = "Datos del Paciente";
    			t13 = space();
    			button1 = element("button");
    			i3 = element("i");
    			t14 = space();
    			sapn1 = element("sapn");
    			sapn1.textContent = "Agregar Campo";
    			t16 = space();
    			button2 = element("button");
    			i4 = element("i");
    			t17 = space();
    			sapn2 = element("sapn");
    			sapn2.textContent = "Registrar Interconsulta";
    			t19 = space();
    			button3 = element("button");
    			i5 = element("i");
    			t20 = space();
    			sapn3 = element("sapn");
    			sapn3.textContent = "Imprimir";
    			t22 = space();
    			button4 = element("button");
    			i6 = element("i");
    			t23 = space();
    			sapn4 = element("sapn");
    			sapn4.textContent = "Antecedentes";
    			t25 = space();
    			button5 = element("button");
    			i7 = element("i");
    			t26 = space();
    			sapn5 = element("sapn");
    			sapn5.textContent = "Anular";
    			attr_dev(span0, "class", "badge badge-primary");
    			attr_dev(span0, "data-bind", "text: titulo");
    			add_location(span0, file$j, 8, 16, 203);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$j, 9, 16, 295);
    			add_location(h5, file$j, 7, 12, 182);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$j, 6, 8, 147);
    			attr_dev(i0, "class", "mdi mdi-check-all");
    			add_location(i0, file$j, 14, 108, 674);
    			add_location(i1, file$j, 15, 59, 736);
    			attr_dev(div1, "class", "guardando mr-2 text-success");
    			attr_dev(div1, "data-bind", "html: content, class: contentClass");
    			add_location(div1, file$j, 14, 20, 586);
    			attr_dev(div2, "class", "guardar-documento");
    			add_location(div2, file$j, 13, 16, 534);
    			attr_dev(div3, "class", "col-md-6");
    			set_style(div3, "text-align", "right");
    			add_location(div3, file$j, 12, 8, 468);
    			attr_dev(i2, "data-bind", "class: icon");
    			attr_dev(i2, "class", "mdi mdi-comment-eye");
    			add_location(i2, file$j, 23, 24, 1106);
    			attr_dev(sapn0, "data-bind", "text: text");
    			add_location(sapn0, file$j, 24, 24, 1190);
    			attr_dev(button0, "data-toggle", "modal");
    			attr_dev(button0, "data-target", "#modalDatosPersonales");
    			set_style(button0, "box-shadow", "none");
    			attr_dev(button0, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button0, file$j, 21, 20, 927);
    			attr_dev(i3, "data-bind", "class: icon");
    			attr_dev(i3, "class", "mdi mdi-text");
    			add_location(i3, file$j, 29, 24, 1462);
    			attr_dev(sapn1, "data-bind", "text: text");
    			add_location(sapn1, file$j, 30, 24, 1539);
    			attr_dev(button1, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button1, "box-shadow", "none");
    			attr_dev(button1, "class", "btn btn-outline-dark btn-sm");
    			add_location(button1, file$j, 27, 20, 1296);
    			attr_dev(i4, "data-bind", "class: icon");
    			attr_dev(i4, "class", "mdi mdi-repeat");
    			add_location(i4, file$j, 35, 24, 1812);
    			attr_dev(sapn2, "data-bind", "text: text");
    			add_location(sapn2, file$j, 36, 24, 1891);
    			attr_dev(button2, "data-toggle", "modal");
    			attr_dev(button2, "data-target", "#modalInterconsulta");
    			set_style(button2, "box-shadow", "none");
    			attr_dev(button2, "class", "btn btn-outline-dark btn-sm");
    			add_location(button2, file$j, 33, 20, 1640);
    			attr_dev(i5, "data-bind", "class: icon");
    			attr_dev(i5, "class", "mdi mdi-printer");
    			add_location(i5, file$j, 41, 24, 2184);
    			attr_dev(sapn3, "data-bind", "text: text");
    			add_location(sapn3, file$j, 42, 24, 2264);
    			attr_dev(button3, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button3, "box-shadow", "none");
    			attr_dev(button3, "class", "btn btn-outline-dark btn-sm btn-hover-white");
    			add_location(button3, file$j, 39, 20, 2002);
    			attr_dev(i6, "data-bind", "class: icon");
    			attr_dev(i6, "class", "mdi mdi-account-clock");
    			add_location(i6, file$j, 47, 24, 2531);
    			attr_dev(sapn4, "data-bind", "text: text");
    			add_location(sapn4, file$j, 48, 24, 2617);
    			attr_dev(button4, "data-toggle", "modal");
    			attr_dev(button4, "data-target", "#modalAntecedentes");
    			set_style(button4, "box-shadow", "none");
    			attr_dev(button4, "class", "btn btn-outline-dark btn-sm");
    			add_location(button4, file$j, 45, 20, 2360);
    			attr_dev(i7, "data-bind", "class: icon");
    			attr_dev(i7, "class", "mdi mdi-delete");
    			add_location(i7, file$j, 53, 24, 2885);
    			attr_dev(sapn5, "data-bind", "text: text");
    			add_location(sapn5, file$j, 54, 24, 2964);
    			attr_dev(button5, "data-bind", " class: itemClass,click: clickEvent");
    			set_style(button5, "box-shadow", "none");
    			attr_dev(button5, "class", "btn btn-outline-danger btn-sm");
    			add_location(button5, file$j, 51, 20, 2717);
    			attr_dev(div4, "class", "dropdown");
    			attr_dev(div4, "data-bind", "foreach: actionButtons");
    			add_location(div4, file$j, 19, 12, 848);
    			attr_dev(div5, "class", "col-lg-12");
    			add_location(div5, file$j, 18, 8, 812);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$j, 5, 4, 121);
    			attr_dev(div7, "class", "contenedor-datos");
    			attr_dev(div7, "id", "divHeaderBar");
    			add_location(div7, file$j, 4, 0, 68);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, h5);
    			append_dev(h5, span0);
    			append_dev(span0, t0);
    			append_dev(h5, t1);
    			append_dev(h5, span1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    			append_dev(span1, t5);
    			append_dev(span1, t6);
    			append_dev(div6, t7);
    			append_dev(div6, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, i0);
    			append_dev(div1, t8);
    			append_dev(div1, i1);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, button0);
    			append_dev(button0, i2);
    			append_dev(button0, t11);
    			append_dev(button0, sapn0);
    			append_dev(div4, t13);
    			append_dev(div4, button1);
    			append_dev(button1, i3);
    			append_dev(button1, t14);
    			append_dev(button1, sapn1);
    			append_dev(div4, t16);
    			append_dev(div4, button2);
    			append_dev(button2, i4);
    			append_dev(button2, t17);
    			append_dev(button2, sapn2);
    			append_dev(div4, t19);
    			append_dev(div4, button3);
    			append_dev(button3, i5);
    			append_dev(button3, t20);
    			append_dev(button3, sapn3);
    			append_dev(div4, t22);
    			append_dev(div4, button4);
    			append_dev(button4, i6);
    			append_dev(button4, t23);
    			append_dev(button4, sapn4);
    			append_dev(div4, t25);
    			append_dev(div4, button5);
    			append_dev(button5, i7);
    			append_dev(button5, t26);
    			append_dev(button5, sapn5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*tipoTab*/ 2) set_data_dev(t0, /*tipoTab*/ ctx[1]);
    			if (dirty & /*paciente*/ 1 && t2_value !== (t2_value = /*paciente*/ ctx[0].nombres + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*paciente*/ 1 && t4_value !== (t4_value = /*paciente*/ ctx[0].primerApellido + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*paciente*/ 1 && t6_value !== (t6_value = /*paciente*/ ctx[0].segundoApellido + "")) set_data_dev(t6, t6_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
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

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("OpcionesPaciente", slots, []);
    	let { paciente } = $$props;
    	let { tipoTab } = $$props;
    	const writable_props = ["paciente", "tipoTab"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<OpcionesPaciente> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("paciente" in $$props) $$invalidate(0, paciente = $$props.paciente);
    		if ("tipoTab" in $$props) $$invalidate(1, tipoTab = $$props.tipoTab);
    	};

    	$$self.$capture_state = () => ({ paciente, tipoTab });

    	$$self.$inject_state = $$props => {
    		if ("paciente" in $$props) $$invalidate(0, paciente = $$props.paciente);
    		if ("tipoTab" in $$props) $$invalidate(1, tipoTab = $$props.tipoTab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [paciente, tipoTab];
    }

    class OpcionesPaciente extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { paciente: 0, tipoTab: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OpcionesPaciente",
    			options,
    			id: create_fragment$k.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*paciente*/ ctx[0] === undefined && !("paciente" in props)) {
    			console.warn("<OpcionesPaciente> was created without expected prop 'paciente'");
    		}

    		if (/*tipoTab*/ ctx[1] === undefined && !("tipoTab" in props)) {
    			console.warn("<OpcionesPaciente> was created without expected prop 'tipoTab'");
    		}
    	}

    	get paciente() {
    		throw new Error("<OpcionesPaciente>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set paciente(value) {
    		throw new Error("<OpcionesPaciente>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tipoTab() {
    		throw new Error("<OpcionesPaciente>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tipoTab(value) {
    		throw new Error("<OpcionesPaciente>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Pages/AtencionMedica/HistoriaClinica.svelte generated by Svelte v3.29.0 */

    const { console: console_1$4 } = globals;
    const file$k = "src/Pages/AtencionMedica/HistoriaClinica.svelte";

    function create_fragment$l(ctx) {
    	let asideatencion;
    	let t0;
    	let opcionespaciente;
    	let t1;
    	let header;
    	let t2;
    	let main;
    	let div107;
    	let div106;
    	let div3;
    	let div1;
    	let div0;
    	let t4;
    	let div2;
    	let textarea0;
    	let textarea0_value_value;
    	let t5;
    	let div7;
    	let div5;
    	let div4;
    	let t7;
    	let div6;
    	let textarea1;
    	let textarea1_value_value;
    	let t8;
    	let div30;
    	let div9;
    	let div8;
    	let t10;
    	let div29;
    	let div28;
    	let div14;
    	let div13;
    	let label0;
    	let i0;
    	let t11;
    	let t12;
    	let div12;
    	let div10;
    	let input0;
    	let t13;
    	let div11;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t17;
    	let div18;
    	let div17;
    	let label1;
    	let i1;
    	let t18;
    	let t19;
    	let div16;
    	let div15;
    	let input1;
    	let t20;
    	let div22;
    	let div21;
    	let label2;
    	let i2;
    	let t21;
    	let t22;
    	let div20;
    	let div19;
    	let input2;
    	let t23;
    	let div27;
    	let div26;
    	let label3;
    	let i3;
    	let t24;
    	let t25;
    	let div25;
    	let div23;
    	let input3;
    	let t26;
    	let div24;
    	let input4;
    	let t27;
    	let div60;
    	let div32;
    	let div31;
    	let t29;
    	let div59;
    	let div58;
    	let div37;
    	let div36;
    	let label4;
    	let i4;
    	let t30;
    	let t31;
    	let div35;
    	let div33;
    	let input5;
    	let t32;
    	let div34;
    	let select1;
    	let option3;
    	let option4;
    	let t35;
    	let div43;
    	let div42;
    	let label5;
    	let i5;
    	let t36;
    	let t37;
    	let div41;
    	let div40;
    	let div39;
    	let input6;
    	let t38;
    	let div38;
    	let span0;
    	let t40;
    	let div49;
    	let div48;
    	let label6;
    	let i6;
    	let t41;
    	let t42;
    	let div47;
    	let div46;
    	let div45;
    	let input7;
    	let t43;
    	let div44;
    	let span1;
    	let t45;
    	let div53;
    	let div52;
    	let label7;
    	let i7;
    	let t46;
    	let t47;
    	let div51;
    	let div50;
    	let input8;
    	let t48;
    	let div57;
    	let div56;
    	let label8;
    	let t50;
    	let div55;
    	let div54;
    	let input9;
    	let t51;
    	let div67;
    	let div62;
    	let div61;
    	let t53;
    	let div65;
    	let div64;
    	let a0;
    	let i8;
    	let t54;
    	let div63;
    	let button0;
    	let t56;
    	let button1;
    	let t58;
    	let button2;
    	let t60;
    	let div66;
    	let textarea2;
    	let textarea2_value_value;
    	let t61;
    	let div80;
    	let div69;
    	let div68;
    	let t63;
    	let div72;
    	let div71;
    	let a1;
    	let i9;
    	let t64;
    	let div70;
    	let button3;
    	let i10;
    	let t65;
    	let t66;
    	let div79;
    	let div78;
    	let div75;
    	let div74;
    	let input10;
    	let t67;
    	let ul0;
    	let div73;
    	let t68;
    	let li0;
    	let a2;
    	let i11;
    	let t69;
    	let t70;
    	let div77;
    	let ul1;
    	let li1;
    	let span2;
    	let t72;
    	let span3;
    	let t74;
    	let div76;
    	let a3;
    	let i12;
    	let t75;
    	let a4;
    	let i13;
    	let t76;
    	let ordenesmedicas;
    	let t77;
    	let div84;
    	let div82;
    	let div81;
    	let t79;
    	let div83;
    	let textarea3;
    	let t80;
    	let div105;
    	let div90;
    	let div89;
    	let div86;
    	let div85;
    	let t82;
    	let div88;
    	let div87;
    	let select2;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let option9;
    	let t88;
    	let div98;
    	let div97;
    	let div92;
    	let div91;
    	let t90;
    	let div96;
    	let div95;
    	let div93;
    	let label9;
    	let t92;
    	let input11;
    	let t93;
    	let div94;
    	let label10;
    	let t95;
    	let input12;
    	let t96;
    	let div104;
    	let div103;
    	let div100;
    	let div99;
    	let t98;
    	let div102;
    	let div101;
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
    	let t108;
    	let modaldatospaciente;
    	let t109;
    	let modaltratamientos;
    	let t110;
    	let modalinterconsulta;
    	let t111;
    	let modalantecedentes;
    	let current;
    	let mounted;
    	let dispose;
    	asideatencion = new AsideAtencion({ $$inline: true });

    	opcionespaciente = new OpcionesPaciente({
    			props: {
    				paciente: /*paciente*/ ctx[0],
    				tipoTab: "Historia Clinica"
    			},
    			$$inline: true
    		});

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
    			create_component(opcionespaciente.$$.fragment);
    			t1 = space();
    			create_component(header.$$.fragment);
    			t2 = space();
    			main = element("main");
    			div107 = element("div");
    			div106 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Motivo de consulta";
    			t4 = space();
    			div2 = element("div");
    			textarea0 = element("textarea");
    			t5 = space();
    			div7 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "Historia de la enfermedad";
    			t7 = space();
    			div6 = element("div");
    			textarea1 = element("textarea");
    			t8 = space();
    			div30 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div8.textContent = "Signos vitales";
    			t10 = space();
    			div29 = element("div");
    			div28 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			label0 = element("label");
    			i0 = element("i");
    			t11 = text(" Temperatura");
    			t12 = space();
    			div12 = element("div");
    			div10 = element("div");
    			input0 = element("input");
    			t13 = space();
    			div11 = element("div");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "°C";
    			option1 = element("option");
    			option1.textContent = "°K";
    			option2 = element("option");
    			option2.textContent = "°F";
    			t17 = space();
    			div18 = element("div");
    			div17 = element("div");
    			label1 = element("label");
    			i1 = element("i");
    			t18 = text(" Frecuencia respiratoria");
    			t19 = space();
    			div16 = element("div");
    			div15 = element("div");
    			input1 = element("input");
    			t20 = space();
    			div22 = element("div");
    			div21 = element("div");
    			label2 = element("label");
    			i2 = element("i");
    			t21 = text(" Frecuencia cardiaca");
    			t22 = space();
    			div20 = element("div");
    			div19 = element("div");
    			input2 = element("input");
    			t23 = space();
    			div27 = element("div");
    			div26 = element("div");
    			label3 = element("label");
    			i3 = element("i");
    			t24 = text(" Presion alterial (mmHg)");
    			t25 = space();
    			div25 = element("div");
    			div23 = element("div");
    			input3 = element("input");
    			t26 = space();
    			div24 = element("div");
    			input4 = element("input");
    			t27 = space();
    			div60 = element("div");
    			div32 = element("div");
    			div31 = element("div");
    			div31.textContent = "Otros parametros";
    			t29 = space();
    			div59 = element("div");
    			div58 = element("div");
    			div37 = element("div");
    			div36 = element("div");
    			label4 = element("label");
    			i4 = element("i");
    			t30 = text(" Peso");
    			t31 = space();
    			div35 = element("div");
    			div33 = element("div");
    			input5 = element("input");
    			t32 = space();
    			div34 = element("div");
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Lb";
    			option4 = element("option");
    			option4.textContent = "Kg";
    			t35 = space();
    			div43 = element("div");
    			div42 = element("div");
    			label5 = element("label");
    			i5 = element("i");
    			t36 = text(" Escala de glasgow");
    			t37 = space();
    			div41 = element("div");
    			div40 = element("div");
    			div39 = element("div");
    			input6 = element("input");
    			t38 = space();
    			div38 = element("div");
    			span0 = element("span");
    			span0.textContent = "/ 15";
    			t40 = space();
    			div49 = element("div");
    			div48 = element("div");
    			label6 = element("label");
    			i6 = element("i");
    			t41 = text(" Escala de dolor");
    			t42 = space();
    			div47 = element("div");
    			div46 = element("div");
    			div45 = element("div");
    			input7 = element("input");
    			t43 = space();
    			div44 = element("div");
    			span1 = element("span");
    			span1.textContent = "/ 10";
    			t45 = space();
    			div53 = element("div");
    			div52 = element("div");
    			label7 = element("label");
    			i7 = element("i");
    			t46 = text(" Saturación de oxigeno");
    			t47 = space();
    			div51 = element("div");
    			div50 = element("div");
    			input8 = element("input");
    			t48 = space();
    			div57 = element("div");
    			div56 = element("div");
    			label8 = element("label");
    			label8.textContent = "Otros";
    			t50 = space();
    			div55 = element("div");
    			div54 = element("div");
    			input9 = element("input");
    			t51 = space();
    			div67 = element("div");
    			div62 = element("div");
    			div61 = element("div");
    			div61.textContent = "Examen Fisico";
    			t53 = space();
    			div65 = element("div");
    			div64 = element("div");
    			a0 = element("a");
    			i8 = element("i");
    			t54 = space();
    			div63 = element("div");
    			button0 = element("button");
    			button0.textContent = "Action";
    			t56 = space();
    			button1 = element("button");
    			button1.textContent = "Another action";
    			t58 = space();
    			button2 = element("button");
    			button2.textContent = "Something else here";
    			t60 = space();
    			div66 = element("div");
    			textarea2 = element("textarea");
    			t61 = space();
    			div80 = element("div");
    			div69 = element("div");
    			div68 = element("div");
    			div68.textContent = "Diagnosticos";
    			t63 = space();
    			div72 = element("div");
    			div71 = element("div");
    			a1 = element("a");
    			i9 = element("i");
    			t64 = space();
    			div70 = element("div");
    			button3 = element("button");
    			i10 = element("i");
    			t65 = text("\n                                    Agregar nuevo diagnostico");
    			t66 = space();
    			div79 = element("div");
    			div78 = element("div");
    			div75 = element("div");
    			div74 = element("div");
    			input10 = element("input");
    			t67 = space();
    			ul0 = element("ul");
    			div73 = element("div");
    			t68 = space();
    			li0 = element("li");
    			a2 = element("a");
    			i11 = element("i");
    			t69 = text("Agregar manualmente");
    			t70 = space();
    			div77 = element("div");
    			ul1 = element("ul");
    			li1 = element("li");
    			span2 = element("span");
    			span2.textContent = "F316";
    			t72 = text(" ");
    			span3 = element("span");
    			span3.textContent = "TRASTORNO AFECTIVO BIPOLAR, EPISODIO MIXTO PRESENTE";
    			t74 = space();
    			div76 = element("div");
    			a3 = element("a");
    			i12 = element("i");
    			t75 = space();
    			a4 = element("a");
    			i13 = element("i");
    			t76 = space();
    			create_component(ordenesmedicas.$$.fragment);
    			t77 = space();
    			div84 = element("div");
    			div82 = element("div");
    			div81 = element("div");
    			div81.textContent = "Observaciones";
    			t79 = space();
    			div83 = element("div");
    			textarea3 = element("textarea");
    			t80 = space();
    			div105 = element("div");
    			div90 = element("div");
    			div89 = element("div");
    			div86 = element("div");
    			div85 = element("div");
    			div85.textContent = "Pronostico";
    			t82 = space();
    			div88 = element("div");
    			div87 = element("div");
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
    			t88 = space();
    			div98 = element("div");
    			div97 = element("div");
    			div92 = element("div");
    			div91 = element("div");
    			div91.textContent = "Fecha y hora";
    			t90 = space();
    			div96 = element("div");
    			div95 = element("div");
    			div93 = element("div");
    			label9 = element("label");
    			label9.textContent = "Fecha";
    			t92 = space();
    			input11 = element("input");
    			t93 = space();
    			div94 = element("div");
    			label10 = element("label");
    			label10.textContent = "Hora";
    			t95 = space();
    			input12 = element("input");
    			t96 = space();
    			div104 = element("div");
    			div103 = element("div");
    			div100 = element("div");
    			div99 = element("div");
    			div99.textContent = "Especialista";
    			t98 = space();
    			div102 = element("div");
    			div101 = element("div");
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
    			t108 = space();
    			create_component(modaldatospaciente.$$.fragment);
    			t109 = space();
    			create_component(modaltratamientos.$$.fragment);
    			t110 = space();
    			create_component(modalinterconsulta.$$.fragment);
    			t111 = space();
    			create_component(modalantecedentes.$$.fragment);
    			attr_dev(div0, "class", "card-title");
    			add_location(div0, file$k, 74, 24, 2164);
    			attr_dev(div1, "class", "card-header");
    			add_location(div1, file$k, 73, 20, 2114);
    			attr_dev(textarea0, "class", "form-control");
    			set_style(textarea0, "width", "100%");
    			set_style(textarea0, "display", "block");
    			set_style(textarea0, "height", "150px");
    			attr_dev(textarea0, "rows", "3");
    			attr_dev(textarea0, "name", "Comentario");
    			textarea0.value = textarea0_value_value = /*notaMedica*/ ctx[1].motivoConsulta;
    			add_location(textarea0, file$k, 77, 24, 2308);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$k, 76, 20, 2260);
    			attr_dev(div3, "data-bind", "if: perfil().motivoConsulta");
    			attr_dev(div3, "class", "card m-b-20 margen-mobile");
    			add_location(div3, file$k, 72, 16, 2014);
    			attr_dev(div4, "class", "card-title");
    			add_location(div4, file$k, 82, 24, 2672);
    			attr_dev(div5, "class", "card-header");
    			add_location(div5, file$k, 81, 20, 2622);
    			attr_dev(textarea1, "class", "form-control");
    			set_style(textarea1, "width", "100%");
    			set_style(textarea1, "display", "block");
    			set_style(textarea1, "height", "150px");
    			attr_dev(textarea1, "rows", "3");
    			attr_dev(textarea1, "name", "Comentario");
    			textarea1.value = textarea1_value_value = /*notaMedica*/ ctx[1].historiaEnfermedad;
    			add_location(textarea1, file$k, 85, 24, 2823);
    			attr_dev(div6, "class", "card-body");
    			add_location(div6, file$k, 84, 20, 2775);
    			attr_dev(div7, "data-bind", "if: perfil().historiaEnfermedad");
    			attr_dev(div7, "class", "card m-b-20 autosave");
    			add_location(div7, file$k, 80, 16, 2523);
    			attr_dev(div8, "class", "card-title");
    			add_location(div8, file$k, 90, 24, 3161);
    			attr_dev(div9, "class", "card-header");
    			add_location(div9, file$k, 89, 20, 3111);
    			attr_dev(i0, "class", "mdi mdi-thermometer mdi-18px");
    			add_location(i0, file$k, 96, 50, 3477);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$k, 96, 36, 3463);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "form-control");
    			add_location(input0, file$k, 99, 44, 3703);
    			attr_dev(div10, "class", "col-lg-7");
    			add_location(div10, file$k, 98, 40, 3636);
    			option0.__value = "°C";
    			option0.value = option0.__value;
    			add_location(option0, file$k, 103, 48, 3978);
    			option1.__value = "°K";
    			option1.value = option1.__value;
    			add_location(option1, file$k, 104, 48, 4057);
    			option2.__value = "°F";
    			option2.value = option2.__value;
    			add_location(option2, file$k, 105, 48, 4136);
    			attr_dev(select0, "class", "form-control");
    			add_location(select0, file$k, 102, 44, 3900);
    			attr_dev(div11, "class", "col-lg-5");
    			add_location(div11, file$k, 101, 40, 3833);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$k, 97, 36, 3578);
    			attr_dev(div13, "class", "form-group");
    			add_location(div13, file$k, 95, 32, 3402);
    			attr_dev(div14, "class", "col-lg-3");
    			add_location(div14, file$k, 94, 28, 3347);
    			attr_dev(i1, "class", "mdi mdi-chart-line mdi-18px");
    			add_location(i1, file$k, 113, 50, 4545);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$k, 113, 36, 4531);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "form-control");
    			add_location(input1, file$k, 116, 44, 4783);
    			attr_dev(div15, "class", "col-lg-12");
    			add_location(div15, file$k, 115, 40, 4715);
    			attr_dev(div16, "class", "row");
    			add_location(div16, file$k, 114, 36, 4657);
    			attr_dev(div17, "class", "form-group");
    			add_location(div17, file$k, 112, 32, 4470);
    			attr_dev(div18, "class", "col-lg-3");
    			add_location(div18, file$k, 111, 28, 4415);
    			attr_dev(i2, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i2, file$k, 123, 50, 5148);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$k, 123, 36, 5134);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "form-control");
    			add_location(input2, file$k, 126, 44, 5383);
    			attr_dev(div19, "class", "col-lg-12");
    			add_location(div19, file$k, 125, 40, 5315);
    			attr_dev(div20, "class", "row");
    			add_location(div20, file$k, 124, 36, 5257);
    			attr_dev(div21, "class", "form-group");
    			add_location(div21, file$k, 122, 32, 5073);
    			attr_dev(div22, "class", "col-lg-3");
    			add_location(div22, file$k, 121, 28, 5018);
    			attr_dev(i3, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i3, file$k, 133, 50, 5748);
    			attr_dev(label3, "for", "");
    			add_location(label3, file$k, 133, 36, 5734);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "class", "form-control");
    			add_location(input3, file$k, 136, 44, 5986);
    			attr_dev(div23, "class", "col-lg-6");
    			add_location(div23, file$k, 135, 40, 5919);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "form-control");
    			add_location(input4, file$k, 139, 44, 6183);
    			attr_dev(div24, "class", "col-lg-6");
    			add_location(div24, file$k, 138, 40, 6116);
    			attr_dev(div25, "class", "row");
    			add_location(div25, file$k, 134, 36, 5861);
    			attr_dev(div26, "class", "form-group");
    			add_location(div26, file$k, 132, 32, 5673);
    			attr_dev(div27, "class", "col-lg-3");
    			add_location(div27, file$k, 131, 28, 5618);
    			attr_dev(div28, "class", "row");
    			add_location(div28, file$k, 93, 24, 3301);
    			attr_dev(div29, "class", "card-body");
    			add_location(div29, file$k, 92, 20, 3253);
    			attr_dev(div30, "class", "card m-b-20 margen-mobile autosave");
    			add_location(div30, file$k, 88, 16, 3042);
    			attr_dev(div31, "class", "card-title");
    			add_location(div31, file$k, 151, 24, 6608);
    			attr_dev(div32, "class", "card-header");
    			add_location(div32, file$k, 150, 20, 6558);
    			attr_dev(i4, "class", "mdi mdi-weight-pound");
    			add_location(i4, file$k, 157, 50, 6926);
    			attr_dev(label4, "for", "");
    			add_location(label4, file$k, 157, 36, 6912);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "class", "form-control");
    			add_location(input5, file$k, 160, 44, 7137);
    			attr_dev(div33, "class", "col-lg-7");
    			add_location(div33, file$k, 159, 40, 7070);
    			option3.__value = "C";
    			option3.value = option3.__value;
    			add_location(option3, file$k, 164, 48, 7476);
    			option4.__value = "K";
    			option4.value = option4.__value;
    			add_location(option4, file$k, 165, 48, 7554);
    			attr_dev(select1, "class", "form-control");
    			if (/*notaMedica*/ ctx[1].unidadPeso === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[4].call(select1));
    			add_location(select1, file$k, 163, 44, 7363);
    			attr_dev(div34, "class", "col-lg-5");
    			add_location(div34, file$k, 162, 40, 7296);
    			attr_dev(div35, "class", "row");
    			add_location(div35, file$k, 158, 36, 7012);
    			attr_dev(div36, "class", "form-group");
    			add_location(div36, file$k, 156, 32, 6851);
    			attr_dev(div37, "class", "col-lg-3");
    			add_location(div37, file$k, 155, 28, 6796);
    			attr_dev(i5, "class", "mdi mdi-human");
    			add_location(i5, file$k, 173, 50, 7962);
    			attr_dev(label5, "for", "");
    			add_location(label5, file$k, 173, 36, 7948);
    			attr_dev(input6, "type", "number");
    			attr_dev(input6, "class", "form-control");
    			attr_dev(input6, "max", "15");
    			attr_dev(input6, "maxlength", "2");
    			attr_dev(input6, "aria-label", "Recipient's username");
    			attr_dev(input6, "aria-describedby", "basic-addon2");
    			add_location(input6, file$k, 177, 48, 8300);
    			attr_dev(span0, "class", "input-group-text");
    			attr_dev(span0, "id", "basic-addon2");
    			add_location(span0, file$k, 179, 52, 8603);
    			attr_dev(div38, "class", "input-group-append");
    			add_location(div38, file$k, 178, 48, 8518);
    			attr_dev(div39, "class", "input-group");
    			set_style(div39, "width", "100%", 1);
    			set_style(div39, "float", "right");
    			add_location(div39, file$k, 176, 44, 8180);
    			attr_dev(div40, "class", "col-lg-12");
    			add_location(div40, file$k, 175, 40, 8112);
    			attr_dev(div41, "class", "row");
    			add_location(div41, file$k, 174, 36, 8054);
    			attr_dev(div42, "class", "form-group");
    			add_location(div42, file$k, 172, 32, 7887);
    			attr_dev(div43, "class", "col-lg-3");
    			add_location(div43, file$k, 171, 28, 7832);
    			attr_dev(i6, "class", "mdi mdi-emoticon-happy");
    			add_location(i6, file$k, 188, 50, 9092);
    			attr_dev(label6, "for", "");
    			add_location(label6, file$k, 188, 36, 9078);
    			attr_dev(input7, "type", "number");
    			attr_dev(input7, "class", "form-control");
    			attr_dev(input7, "max", "10");
    			attr_dev(input7, "maxlength", "2");
    			attr_dev(input7, "aria-label", "Recipient's username");
    			attr_dev(input7, "aria-describedby", "basic-addon2");
    			add_location(input7, file$k, 192, 48, 9437);
    			attr_dev(span1, "class", "input-group-text");
    			attr_dev(span1, "id", "basic-addon2");
    			add_location(span1, file$k, 194, 52, 9738);
    			attr_dev(div44, "class", "input-group-append");
    			add_location(div44, file$k, 193, 48, 9653);
    			attr_dev(div45, "class", "input-group");
    			set_style(div45, "width", "100%", 1);
    			set_style(div45, "float", "right");
    			add_location(div45, file$k, 191, 44, 9317);
    			attr_dev(div46, "class", "col-lg-12");
    			add_location(div46, file$k, 190, 40, 9249);
    			attr_dev(div47, "class", "row");
    			add_location(div47, file$k, 189, 36, 9191);
    			attr_dev(div48, "class", "form-group");
    			add_location(div48, file$k, 187, 32, 9017);
    			attr_dev(div49, "class", "col-lg-3");
    			add_location(div49, file$k, 186, 28, 8962);
    			attr_dev(i7, "class", "mdi mdi-opacity");
    			add_location(i7, file$k, 203, 50, 10227);
    			attr_dev(label7, "for", "");
    			add_location(label7, file$k, 203, 36, 10213);
    			attr_dev(input8, "type", "number");
    			attr_dev(input8, "class", "form-control");
    			add_location(input8, file$k, 206, 44, 10458);
    			attr_dev(div50, "class", "col-lg-12");
    			add_location(div50, file$k, 205, 40, 10390);
    			attr_dev(div51, "class", "row");
    			add_location(div51, file$k, 204, 36, 10332);
    			attr_dev(div52, "class", "form-group");
    			add_location(div52, file$k, 202, 32, 10152);
    			attr_dev(div53, "class", "col-lg-3");
    			add_location(div53, file$k, 201, 28, 10097);
    			attr_dev(label8, "for", "");
    			add_location(label8, file$k, 213, 36, 10852);
    			attr_dev(input9, "type", "text");
    			attr_dev(input9, "class", "form-control");
    			add_location(input9, file$k, 216, 44, 11042);
    			attr_dev(div54, "class", "col-lg-12");
    			add_location(div54, file$k, 215, 40, 10974);
    			attr_dev(div55, "class", "row");
    			add_location(div55, file$k, 214, 36, 10916);
    			attr_dev(div56, "class", "form-group");
    			add_location(div56, file$k, 212, 32, 10791);
    			attr_dev(div57, "class", "col-lg-12");
    			add_location(div57, file$k, 211, 28, 10735);
    			attr_dev(div58, "class", "row");
    			add_location(div58, file$k, 154, 24, 6750);
    			attr_dev(div59, "class", "card-body");
    			add_location(div59, file$k, 153, 20, 6702);
    			attr_dev(div60, "class", "card m-b-20 margen-mobile autosave");
    			add_location(div60, file$k, 149, 16, 6489);
    			attr_dev(div61, "class", "card-title");
    			add_location(div61, file$k, 228, 24, 11505);
    			attr_dev(div62, "class", "card-header");
    			add_location(div62, file$k, 227, 20, 11455);
    			attr_dev(i8, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i8, file$k, 232, 107, 11778);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "data-toggle", "dropdown");
    			attr_dev(a0, "aria-haspopup", "true");
    			attr_dev(a0, "aria-expanded", "false");
    			add_location(a0, file$k, 232, 28, 11699);
    			attr_dev(button0, "class", "dropdown-item");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$k, 234, 32, 11935);
    			attr_dev(button1, "class", "dropdown-item");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$k, 235, 32, 12027);
    			attr_dev(button2, "class", "dropdown-item");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file$k, 236, 32, 12127);
    			attr_dev(div63, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div63, file$k, 233, 28, 11855);
    			attr_dev(div64, "class", "dropdown");
    			add_location(div64, file$k, 231, 24, 11648);
    			attr_dev(div65, "class", "card-controls");
    			add_location(div65, file$k, 230, 20, 11596);
    			attr_dev(textarea2, "class", "form-control");
    			set_style(textarea2, "width", "100%");
    			set_style(textarea2, "display", "block");
    			attr_dev(textarea2, "rows", "5");
    			attr_dev(textarea2, "name", "Comentario");
    			textarea2.value = textarea2_value_value = /*notaMedica*/ ctx[1].examenFisico;
    			add_location(textarea2, file$k, 241, 24, 12361);
    			attr_dev(div66, "class", "card-body");
    			add_location(div66, file$k, 240, 20, 12313);
    			attr_dev(div67, "data-bind", "if: perfil().examenFisico");
    			attr_dev(div67, "class", "card m-b-20 autosave");
    			add_location(div67, file$k, 226, 16, 11362);
    			attr_dev(div68, "class", "card-title");
    			add_location(div68, file$k, 246, 24, 12655);
    			attr_dev(div69, "class", "card-header");
    			add_location(div69, file$k, 245, 20, 12605);
    			attr_dev(i9, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i9, file$k, 250, 107, 12927);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "data-toggle", "dropdown");
    			attr_dev(a1, "aria-haspopup", "true");
    			attr_dev(a1, "aria-expanded", "false");
    			add_location(a1, file$k, 250, 28, 12848);
    			attr_dev(i10, "class", "mdi mdi-plus");
    			add_location(i10, file$k, 252, 89, 13141);
    			attr_dev(button3, "class", "dropdown-item text-success");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file$k, 252, 32, 13084);
    			attr_dev(div70, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div70, file$k, 251, 28, 13004);
    			attr_dev(div71, "class", "dropdown");
    			add_location(div71, file$k, 249, 24, 12797);
    			attr_dev(div72, "class", "card-controls");
    			add_location(div72, file$k, 248, 20, 12745);
    			attr_dev(input10, "type", "text");
    			attr_dev(input10, "class", "form-control");
    			attr_dev(input10, "name", "");
    			attr_dev(input10, "data-bind", "textInput: busqueda");
    			attr_dev(input10, "id", "txtBusquedaProblemaMedico");
    			attr_dev(input10, "data-toggle", "dropdown");
    			attr_dev(input10, "aria-haspopup", "true");
    			attr_dev(input10, "aria-expanded", "true");
    			add_location(input10, file$k, 261, 36, 13594);
    			attr_dev(div73, "class", "contenidoLista");
    			attr_dev(div73, "data-bind", "foreach: problemasMedicos");
    			add_location(div73, file$k, 263, 40, 14062);
    			attr_dev(i11, "class", "mdi mdi-plus");
    			add_location(i11, file$k, 265, 95, 14291);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "data-bind", "click: agregarDiagnostico");
    			add_location(a2, file$k, 265, 44, 14240);
    			attr_dev(li0, "class", "defecto");
    			add_location(li0, file$k, 264, 40, 14175);
    			attr_dev(ul0, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul0, "id", "buscador");
    			attr_dev(ul0, "x-placement", "top-start");
    			set_style(ul0, "position", "absolute");
    			set_style(ul0, "will-change", "transform");
    			set_style(ul0, "top", "0px");
    			set_style(ul0, "left", "0px");
    			set_style(ul0, "transform", "translate3d(0px, -128px, 0px)");
    			set_style(ul0, "border-radius", "5px");
    			add_location(ul0, file$k, 262, 36, 13807);
    			attr_dev(div74, "class", "form-group buscardor dropdown dropdown-vnc");
    			add_location(div74, file$k, 260, 32, 13501);
    			attr_dev(div75, "class", "col-12");
    			add_location(div75, file$k, 259, 28, 13448);
    			attr_dev(span2, "class", "badge badge-primary");
    			attr_dev(span2, "data-bind", "text: codigo");
    			add_location(span2, file$k, 275, 40, 14745);
    			attr_dev(span3, "data-bind", "text: nombre");
    			add_location(span3, file$k, 275, 116, 14821);
    			attr_dev(i12, "class", "mdi-18px mdi mdi-comment-plus-outline");
    			add_location(i12, file$k, 277, 138, 15212);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "text-primary");
    			attr_dev(a3, "data-bind", "click: modoEditarOn");
    			attr_dev(a3, "title", "Agregar comentarios");
    			add_location(a3, file$k, 277, 44, 15118);
    			attr_dev(i13, "class", "mdi-18px mdi mdi-trash-can-outline");
    			add_location(i13, file$k, 278, 191, 15461);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "data-bind", "click: eliminar");
    			attr_dev(a4, "class", "text-danger");
    			attr_dev(a4, "data-toggle", "tooltip");
    			attr_dev(a4, "data-placement", "top");
    			attr_dev(a4, "data-original-title", "Eliminar diagnostico");
    			add_location(a4, file$k, 278, 44, 15314);
    			set_style(div76, "position", "absolute");
    			set_style(div76, "top", "0");
    			set_style(div76, "right", "0");
    			set_style(div76, "padding", "10px");
    			set_style(div76, "background-color", "white");
    			set_style(div76, "border-bottom-left-radius", "5px");
    			add_location(div76, file$k, 276, 40, 14951);
    			add_location(li1, file$k, 274, 36, 14700);
    			attr_dev(ul1, "class", "list-info");
    			attr_dev(ul1, "data-bind", "foreach: diagnosticos");
    			add_location(ul1, file$k, 273, 32, 14607);
    			attr_dev(div77, "class", "col-md-12");
    			add_location(div77, file$k, 272, 28, 14551);
    			attr_dev(div78, "class", "row");
    			add_location(div78, file$k, 258, 24, 13402);
    			attr_dev(div79, "class", "card-body");
    			add_location(div79, file$k, 257, 20, 13354);
    			attr_dev(div80, "class", "card m-b-20");
    			add_location(div80, file$k, 244, 16, 12559);
    			attr_dev(div81, "class", "card-title");
    			add_location(div81, file$k, 291, 24, 15947);
    			attr_dev(div82, "class", "card-header");
    			add_location(div82, file$k, 290, 20, 15897);
    			attr_dev(textarea3, "class", "form-control");
    			set_style(textarea3, "width", "100%");
    			set_style(textarea3, "display", "block");
    			set_style(textarea3, "height", "150px");
    			attr_dev(textarea3, "data-bind", "value: notaMedica.observaciones");
    			attr_dev(textarea3, "rows", "3");
    			add_location(textarea3, file$k, 294, 24, 16086);
    			attr_dev(div83, "class", "card-body");
    			add_location(div83, file$k, 293, 20, 16038);
    			attr_dev(div84, "class", "card m-b-20 margen-mobile autosave");
    			add_location(div84, file$k, 289, 16, 15828);
    			attr_dev(div85, "class", "card-title");
    			add_location(div85, file$k, 303, 32, 16499);
    			attr_dev(div86, "class", "card-header");
    			add_location(div86, file$k, 302, 28, 16441);
    			option5.__value = "";
    			option5.value = option5.__value;
    			add_location(option5, file$k, 310, 40, 16995);
    			option6.__value = "Favorable o Bueno";
    			option6.value = option6.__value;
    			add_location(option6, file$k, 311, 40, 17077);
    			option7.__value = "Moderado o Intermedio";
    			option7.value = option7.__value;
    			add_location(option7, file$k, 312, 40, 17178);
    			option8.__value = "Grave";
    			option8.value = option8.__value;
    			add_location(option8, file$k, 313, 40, 17287);
    			option9.__value = "Reservado";
    			option9.value = option9.__value;
    			add_location(option9, file$k, 314, 40, 17364);
    			attr_dev(select2, "name", "");
    			attr_dev(select2, "class", "form-control form-control-lg");
    			attr_dev(select2, "data-bind", "options: pronosticos, \n                                        value: notaMedica.pronostico, \n                                        optionsCaption : '- Seleccionar -'");
    			add_location(select2, file$k, 307, 36, 16720);
    			attr_dev(div87, "class", "form-group");
    			add_location(div87, file$k, 306, 32, 16659);
    			attr_dev(div88, "class", "card-body");
    			add_location(div88, file$k, 305, 28, 16603);
    			attr_dev(div89, "class", "card m-b-20");
    			add_location(div89, file$k, 301, 24, 16387);
    			attr_dev(div90, "class", "col-lg-6");
    			add_location(div90, file$k, 300, 20, 16340);
    			attr_dev(div91, "class", "card-title");
    			add_location(div91, file$k, 324, 32, 17767);
    			attr_dev(div92, "class", "card-header");
    			add_location(div92, file$k, 323, 28, 17709);
    			attr_dev(label9, "for", "");
    			add_location(label9, file$k, 329, 40, 18088);
    			attr_dev(input11, "type", "date");
    			attr_dev(input11, "class", "form-control");
    			attr_dev(input11, "data-bind", "value: notaMedica.fecha");
    			attr_dev(input11, "placeholder", "Fecha");
    			add_location(input11, file$k, 330, 40, 18156);
    			attr_dev(div93, "class", "form-group floating-label col-md-6 show-label");
    			add_location(div93, file$k, 328, 36, 17988);
    			attr_dev(label10, "for", "");
    			add_location(label10, file$k, 333, 40, 18432);
    			attr_dev(input12, "type", "time");
    			attr_dev(input12, "placeholder", "Hora");
    			attr_dev(input12, "class", "form-control");
    			attr_dev(input12, "max", "23:59:59");
    			attr_dev(input12, "data-bind", "value: notaMedica.hora");
    			add_location(input12, file$k, 334, 40, 18499);
    			attr_dev(div94, "class", "form-group floating-label col-md-6 show-label");
    			add_location(div94, file$k, 332, 36, 18332);
    			attr_dev(div95, "class", "form-row");
    			add_location(div95, file$k, 327, 32, 17929);
    			attr_dev(div96, "class", "card-body");
    			add_location(div96, file$k, 326, 28, 17873);
    			attr_dev(div97, "class", "card m-b-20");
    			add_location(div97, file$k, 322, 24, 17655);
    			attr_dev(div98, "class", "col-lg-6");
    			add_location(div98, file$k, 321, 20, 17608);
    			attr_dev(div99, "class", "card-title");
    			add_location(div99, file$k, 344, 32, 19002);
    			attr_dev(div100, "class", "card-header");
    			add_location(div100, file$k, 343, 28, 18944);
    			option10.__value = "2";
    			option10.value = option10.__value;
    			attr_dev(option10, "data-select2-id", "1009");
    			add_location(option10, file$k, 349, 36, 19448);
    			option11.__value = "3";
    			option11.value = option11.__value;
    			attr_dev(option11, "data-select2-id", "1010");
    			add_location(option11, file$k, 350, 36, 19552);
    			option12.__value = "5";
    			option12.value = option12.__value;
    			attr_dev(option12, "data-select2-id", "1011");
    			add_location(option12, file$k, 351, 36, 19653);
    			option13.__value = "8";
    			option13.value = option13.__value;
    			attr_dev(option13, "data-select2-id", "1012");
    			add_location(option13, file$k, 352, 36, 19755);
    			option14.__value = "9";
    			option14.value = option14.__value;
    			attr_dev(option14, "data-select2-id", "1013");
    			add_location(option14, file$k, 353, 36, 19867);
    			option15.__value = "10";
    			option15.value = option15.__value;
    			attr_dev(option15, "data-select2-id", "1014");
    			add_location(option15, file$k, 354, 36, 19968);
    			option16.__value = "11";
    			option16.value = option16.__value;
    			attr_dev(option16, "data-select2-id", "1015");
    			add_location(option16, file$k, 355, 36, 20071);
    			option17.__value = "12";
    			option17.value = option17.__value;
    			attr_dev(option17, "data-select2-id", "1016");
    			add_location(option17, file$k, 356, 36, 20174);
    			option18.__value = "13";
    			option18.value = option18.__value;
    			attr_dev(option18, "data-select2-id", "1017");
    			add_location(option18, file$k, 357, 36, 20276);
    			attr_dev(select3, "class", "form-control form-control-lg");
    			attr_dev(select3, "id", "sltEspecialistas");
    			set_style(select3, "width", "100%");
    			set_style(select3, "padding-top", "5px");
    			attr_dev(select3, "tabindex", "-1");
    			attr_dev(select3, "aria-hidden", "true");
    			select3.required = "";
    			attr_dev(select3, "data-select2-id", "sltEspecialistas");
    			add_location(select3, file$k, 348, 36, 19225);
    			attr_dev(div101, "class", "form-group");
    			add_location(div101, file$k, 347, 32, 19164);
    			attr_dev(div102, "class", "card-body");
    			add_location(div102, file$k, 346, 28, 19108);
    			attr_dev(div103, "class", "card m-b-20");
    			add_location(div103, file$k, 342, 24, 18890);
    			attr_dev(div104, "class", "col-lg-6");
    			attr_dev(div104, "data-bindx", "if: notaMedica.deOrden()");
    			add_location(div104, file$k, 341, 20, 18805);
    			attr_dev(div105, "class", "row");
    			add_location(div105, file$k, 298, 16, 16301);
    			attr_dev(div106, "class", "col-lg-12");
    			set_style(div106, "margin-top", "150px");
    			add_location(div106, file$k, 71, 12, 1948);
    			attr_dev(div107, "class", "container m-b-30");
    			add_location(div107, file$k, 70, 8, 1905);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$k, 69, 4, 1871);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(asideatencion, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(opcionespaciente, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(header, target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div107);
    			append_dev(div107, div106);
    			append_dev(div106, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, textarea0);
    			append_dev(div106, t5);
    			append_dev(div106, div7);
    			append_dev(div7, div5);
    			append_dev(div5, div4);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, textarea1);
    			append_dev(div106, t8);
    			append_dev(div106, div30);
    			append_dev(div30, div9);
    			append_dev(div9, div8);
    			append_dev(div30, t10);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div28, div14);
    			append_dev(div14, div13);
    			append_dev(div13, label0);
    			append_dev(label0, i0);
    			append_dev(label0, t11);
    			append_dev(div13, t12);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div10, input0);
    			append_dev(div12, t13);
    			append_dev(div12, div11);
    			append_dev(div11, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(div28, t17);
    			append_dev(div28, div18);
    			append_dev(div18, div17);
    			append_dev(div17, label1);
    			append_dev(label1, i1);
    			append_dev(label1, t18);
    			append_dev(div17, t19);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, input1);
    			append_dev(div28, t20);
    			append_dev(div28, div22);
    			append_dev(div22, div21);
    			append_dev(div21, label2);
    			append_dev(label2, i2);
    			append_dev(label2, t21);
    			append_dev(div21, t22);
    			append_dev(div21, div20);
    			append_dev(div20, div19);
    			append_dev(div19, input2);
    			append_dev(div28, t23);
    			append_dev(div28, div27);
    			append_dev(div27, div26);
    			append_dev(div26, label3);
    			append_dev(label3, i3);
    			append_dev(label3, t24);
    			append_dev(div26, t25);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			append_dev(div23, input3);
    			append_dev(div25, t26);
    			append_dev(div25, div24);
    			append_dev(div24, input4);
    			append_dev(div106, t27);
    			append_dev(div106, div60);
    			append_dev(div60, div32);
    			append_dev(div32, div31);
    			append_dev(div60, t29);
    			append_dev(div60, div59);
    			append_dev(div59, div58);
    			append_dev(div58, div37);
    			append_dev(div37, div36);
    			append_dev(div36, label4);
    			append_dev(label4, i4);
    			append_dev(label4, t30);
    			append_dev(div36, t31);
    			append_dev(div36, div35);
    			append_dev(div35, div33);
    			append_dev(div33, input5);
    			set_input_value(input5, /*notaMedica*/ ctx[1].peso);
    			append_dev(div35, t32);
    			append_dev(div35, div34);
    			append_dev(div34, select1);
    			append_dev(select1, option3);
    			append_dev(select1, option4);
    			select_option(select1, /*notaMedica*/ ctx[1].unidadPeso);
    			append_dev(div58, t35);
    			append_dev(div58, div43);
    			append_dev(div43, div42);
    			append_dev(div42, label5);
    			append_dev(label5, i5);
    			append_dev(label5, t36);
    			append_dev(div42, t37);
    			append_dev(div42, div41);
    			append_dev(div41, div40);
    			append_dev(div40, div39);
    			append_dev(div39, input6);
    			set_input_value(input6, /*notaMedica*/ ctx[1].escalaGlasgow);
    			append_dev(div39, t38);
    			append_dev(div39, div38);
    			append_dev(div38, span0);
    			append_dev(div58, t40);
    			append_dev(div58, div49);
    			append_dev(div49, div48);
    			append_dev(div48, label6);
    			append_dev(label6, i6);
    			append_dev(label6, t41);
    			append_dev(div48, t42);
    			append_dev(div48, div47);
    			append_dev(div47, div46);
    			append_dev(div46, div45);
    			append_dev(div45, input7);
    			set_input_value(input7, /*notaMedica*/ ctx[1].escalaDolor);
    			append_dev(div45, t43);
    			append_dev(div45, div44);
    			append_dev(div44, span1);
    			append_dev(div58, t45);
    			append_dev(div58, div53);
    			append_dev(div53, div52);
    			append_dev(div52, label7);
    			append_dev(label7, i7);
    			append_dev(label7, t46);
    			append_dev(div52, t47);
    			append_dev(div52, div51);
    			append_dev(div51, div50);
    			append_dev(div50, input8);
    			set_input_value(input8, /*notaMedica*/ ctx[1].saturacionOxigeno);
    			append_dev(div58, t48);
    			append_dev(div58, div57);
    			append_dev(div57, div56);
    			append_dev(div56, label8);
    			append_dev(div56, t50);
    			append_dev(div56, div55);
    			append_dev(div55, div54);
    			append_dev(div54, input9);
    			append_dev(div106, t51);
    			append_dev(div106, div67);
    			append_dev(div67, div62);
    			append_dev(div62, div61);
    			append_dev(div67, t53);
    			append_dev(div67, div65);
    			append_dev(div65, div64);
    			append_dev(div64, a0);
    			append_dev(a0, i8);
    			append_dev(div64, t54);
    			append_dev(div64, div63);
    			append_dev(div63, button0);
    			append_dev(div63, t56);
    			append_dev(div63, button1);
    			append_dev(div63, t58);
    			append_dev(div63, button2);
    			append_dev(div67, t60);
    			append_dev(div67, div66);
    			append_dev(div66, textarea2);
    			append_dev(div106, t61);
    			append_dev(div106, div80);
    			append_dev(div80, div69);
    			append_dev(div69, div68);
    			append_dev(div80, t63);
    			append_dev(div80, div72);
    			append_dev(div72, div71);
    			append_dev(div71, a1);
    			append_dev(a1, i9);
    			append_dev(div71, t64);
    			append_dev(div71, div70);
    			append_dev(div70, button3);
    			append_dev(button3, i10);
    			append_dev(button3, t65);
    			append_dev(div80, t66);
    			append_dev(div80, div79);
    			append_dev(div79, div78);
    			append_dev(div78, div75);
    			append_dev(div75, div74);
    			append_dev(div74, input10);
    			append_dev(div74, t67);
    			append_dev(div74, ul0);
    			append_dev(ul0, div73);
    			append_dev(ul0, t68);
    			append_dev(ul0, li0);
    			append_dev(li0, a2);
    			append_dev(a2, i11);
    			append_dev(a2, t69);
    			append_dev(div78, t70);
    			append_dev(div78, div77);
    			append_dev(div77, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, span2);
    			append_dev(li1, t72);
    			append_dev(li1, span3);
    			append_dev(li1, t74);
    			append_dev(li1, div76);
    			append_dev(div76, a3);
    			append_dev(a3, i12);
    			append_dev(div76, t75);
    			append_dev(div76, a4);
    			append_dev(a4, i13);
    			append_dev(div106, t76);
    			mount_component(ordenesmedicas, div106, null);
    			append_dev(div106, t77);
    			append_dev(div106, div84);
    			append_dev(div84, div82);
    			append_dev(div82, div81);
    			append_dev(div84, t79);
    			append_dev(div84, div83);
    			append_dev(div83, textarea3);
    			append_dev(div106, t80);
    			append_dev(div106, div105);
    			append_dev(div105, div90);
    			append_dev(div90, div89);
    			append_dev(div89, div86);
    			append_dev(div86, div85);
    			append_dev(div89, t82);
    			append_dev(div89, div88);
    			append_dev(div88, div87);
    			append_dev(div87, select2);
    			append_dev(select2, option5);
    			append_dev(select2, option6);
    			append_dev(select2, option7);
    			append_dev(select2, option8);
    			append_dev(select2, option9);
    			append_dev(div105, t88);
    			append_dev(div105, div98);
    			append_dev(div98, div97);
    			append_dev(div97, div92);
    			append_dev(div92, div91);
    			append_dev(div97, t90);
    			append_dev(div97, div96);
    			append_dev(div96, div95);
    			append_dev(div95, div93);
    			append_dev(div93, label9);
    			append_dev(div93, t92);
    			append_dev(div93, input11);
    			append_dev(div95, t93);
    			append_dev(div95, div94);
    			append_dev(div94, label10);
    			append_dev(div94, t95);
    			append_dev(div94, input12);
    			append_dev(div105, t96);
    			append_dev(div105, div104);
    			append_dev(div104, div103);
    			append_dev(div103, div100);
    			append_dev(div100, div99);
    			append_dev(div103, t98);
    			append_dev(div103, div102);
    			append_dev(div102, div101);
    			append_dev(div101, select3);
    			append_dev(select3, option10);
    			append_dev(select3, option11);
    			append_dev(select3, option12);
    			append_dev(select3, option13);
    			append_dev(select3, option14);
    			append_dev(select3, option15);
    			append_dev(select3, option16);
    			append_dev(select3, option17);
    			append_dev(select3, option18);
    			insert_dev(target, t108, anchor);
    			mount_component(modaldatospaciente, target, anchor);
    			insert_dev(target, t109, anchor);
    			mount_component(modaltratamientos, target, anchor);
    			insert_dev(target, t110, anchor);
    			mount_component(modalinterconsulta, target, anchor);
    			insert_dev(target, t111, anchor);
    			mount_component(modalantecedentes, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[3]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[4]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[5]),
    					listen_dev(input7, "input", /*input7_input_handler*/ ctx[6]),
    					listen_dev(input8, "input", /*input8_input_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const opcionespaciente_changes = {};
    			if (dirty & /*paciente*/ 1) opcionespaciente_changes.paciente = /*paciente*/ ctx[0];
    			opcionespaciente.$set(opcionespaciente_changes);

    			if (!current || dirty & /*notaMedica*/ 2 && textarea0_value_value !== (textarea0_value_value = /*notaMedica*/ ctx[1].motivoConsulta)) {
    				prop_dev(textarea0, "value", textarea0_value_value);
    			}

    			if (!current || dirty & /*notaMedica*/ 2 && textarea1_value_value !== (textarea1_value_value = /*notaMedica*/ ctx[1].historiaEnfermedad)) {
    				prop_dev(textarea1, "value", textarea1_value_value);
    			}

    			if (dirty & /*notaMedica*/ 2 && to_number(input5.value) !== /*notaMedica*/ ctx[1].peso) {
    				set_input_value(input5, /*notaMedica*/ ctx[1].peso);
    			}

    			if (dirty & /*notaMedica*/ 2) {
    				select_option(select1, /*notaMedica*/ ctx[1].unidadPeso);
    			}

    			if (dirty & /*notaMedica*/ 2 && to_number(input6.value) !== /*notaMedica*/ ctx[1].escalaGlasgow) {
    				set_input_value(input6, /*notaMedica*/ ctx[1].escalaGlasgow);
    			}

    			if (dirty & /*notaMedica*/ 2 && to_number(input7.value) !== /*notaMedica*/ ctx[1].escalaDolor) {
    				set_input_value(input7, /*notaMedica*/ ctx[1].escalaDolor);
    			}

    			if (dirty & /*notaMedica*/ 2 && to_number(input8.value) !== /*notaMedica*/ ctx[1].saturacionOxigeno) {
    				set_input_value(input8, /*notaMedica*/ ctx[1].saturacionOxigeno);
    			}

    			if (!current || dirty & /*notaMedica*/ 2 && textarea2_value_value !== (textarea2_value_value = /*notaMedica*/ ctx[1].examenFisico)) {
    				prop_dev(textarea2, "value", textarea2_value_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(asideatencion.$$.fragment, local);
    			transition_in(opcionespaciente.$$.fragment, local);
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
    			transition_out(opcionespaciente.$$.fragment, local);
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
    			destroy_component(opcionespaciente, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(main);
    			destroy_component(ordenesmedicas);
    			if (detaching) detach_dev(t108);
    			destroy_component(modaldatospaciente, detaching);
    			if (detaching) detach_dev(t109);
    			destroy_component(modaltratamientos, detaching);
    			if (detaching) detach_dev(t110);
    			destroy_component(modalinterconsulta, detaching);
    			if (detaching) detach_dev(t111);
    			destroy_component(modalantecedentes, detaching);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots("HistoriaClinica", slots, []);
    	let { params } = $$props;
    	let paciente = {};
    	let notaMedica = {};

    	const cargarNota = () => {
    		const config = {
    			method: "get",
    			url: `${url}/notasmedicas/${params.idNota}`,
    			header: {}
    		};

    		axios$1(config).then(res => {
    			$$invalidate(1, notaMedica = res.data);
    			console.log(res.data);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	const cargarPaciente = () => {
    		const config = {
    			method: "get",
    			url: `${url}/pacientes/${params.idPaciente}`,
    			header: {}
    		};

    		axios$1(config).then(res => {
    			$$invalidate(0, paciente = res.data);
    			console.log(paciente);
    		}).catch(err => {
    			console.error(err);
    		});
    	};

    	onMount(() => {
    		cargarPaciente();
    		cargarNota();
    	});

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$4.warn(`<HistoriaClinica> was created with unknown prop '${key}'`);
    	});

    	function input5_input_handler() {
    		notaMedica.peso = to_number(this.value);
    		$$invalidate(1, notaMedica);
    	}

    	function select1_change_handler() {
    		notaMedica.unidadPeso = select_value(this);
    		$$invalidate(1, notaMedica);
    	}

    	function input6_input_handler() {
    		notaMedica.escalaGlasgow = to_number(this.value);
    		$$invalidate(1, notaMedica);
    	}

    	function input7_input_handler() {
    		notaMedica.escalaDolor = to_number(this.value);
    		$$invalidate(1, notaMedica);
    	}

    	function input8_input_handler() {
    		notaMedica.saturacionOxigeno = to_number(this.value);
    		$$invalidate(1, notaMedica);
    	}

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(2, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		link,
    		onMount,
    		url,
    		axios: axios$1,
    		Header,
    		AsideAtencion,
    		ModalDatosPaciente,
    		ModalTratamientos,
    		ModalInterconsulta,
    		ModalAntecedentes,
    		OrdenesMedicas,
    		OpcionesPaciente,
    		params,
    		paciente,
    		notaMedica,
    		cargarNota,
    		cargarPaciente
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(2, params = $$props.params);
    		if ("paciente" in $$props) $$invalidate(0, paciente = $$props.paciente);
    		if ("notaMedica" in $$props) $$invalidate(1, notaMedica = $$props.notaMedica);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		paciente,
    		notaMedica,
    		params,
    		input5_input_handler,
    		select1_change_handler,
    		input6_input_handler,
    		input7_input_handler,
    		input8_input_handler
    	];
    }

    class HistoriaClinica extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, { params: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HistoriaClinica",
    			options,
    			id: create_fragment$l.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*params*/ ctx[2] === undefined && !("params" in props)) {
    			console_1$4.warn("<HistoriaClinica> was created without expected prop 'params'");
    		}
    	}

    	get params() {
    		throw new Error("<HistoriaClinica>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<HistoriaClinica>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/componentes/ModalCrearNota.svelte generated by Svelte v3.29.0 */

    const file$l = "src/componentes/ModalCrearNota.svelte";

    function create_fragment$m(ctx) {
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
    			add_location(h5, file$l, 4, 16, 347);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$l, 6, 20, 530);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$l, 5, 16, 433);
    			attr_dev(div0, "class", "modal-header");
    			set_style(div0, "border-bottom", "none");
    			add_location(div0, file$l, 3, 12, 275);
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "name", "TipoNota");
    			input0.value = "NE";
    			input0.checked = "";
    			attr_dev(input0, "data-bind", "checked: tipoNotaSeleccionado");
    			attr_dev(input0, "class", "cstm-switch-input");
    			add_location(input0, file$l, 12, 24, 811);
    			attr_dev(span1, "class", "cstm-switch-indicator ");
    			add_location(span1, file$l, 13, 24, 962);
    			attr_dev(span2, "class", "cstm-switch-description");
    			add_location(span2, file$l, 14, 24, 1031);
    			attr_dev(label0, "class", "cstm-switch mr-3");
    			add_location(label0, file$l, 11, 20, 754);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "name", "TipoNota");
    			input1.value = "EG";
    			attr_dev(input1, "data-bind", "checked: tipoNotaSeleccionado");
    			attr_dev(input1, "class", "cstm-switch-input");
    			add_location(input1, file$l, 17, 24, 1196);
    			attr_dev(span3, "class", "cstm-switch-indicator ");
    			add_location(span3, file$l, 18, 24, 1336);
    			attr_dev(span4, "class", "cstm-switch-description");
    			add_location(span4, file$l, 19, 24, 1405);
    			attr_dev(label1, "class", "cstm-switch");
    			add_location(label1, file$l, 16, 20, 1144);
    			attr_dev(div1, "class", "m-b-10 mt-2");
    			set_style(div1, "text-align", "center");
    			add_location(div1, file$l, 10, 16, 680);
    			attr_dev(div2, "class", "modal-body");
    			attr_dev(div2, "id", "divNuevaNota");
    			add_location(div2, file$l, 9, 12, 621);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$l, 24, 16, 1618);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "data-bind", "click: crearNota");
    			attr_dev(button2, "class", "btn btn-primary");
    			add_location(button2, file$l, 27, 16, 1759);
    			attr_dev(div3, "class", "modal-footer");
    			set_style(div3, "border-top", "none");
    			add_location(div3, file$l, 23, 12, 1549);
    			attr_dev(div4, "class", "modal-content");
    			add_location(div4, file$l, 2, 8, 235);
    			attr_dev(div5, "class", "modal-dialog  modal-dialog-align-top-left");
    			attr_dev(div5, "role", "document");
    			add_location(div5, file$l, 1, 4, 155);
    			attr_dev(div6, "class", "modal fade");
    			attr_dev(div6, "id", "modalNuevaNota");
    			attr_dev(div6, "tabindex", "-1");
    			attr_dev(div6, "role", "dialog");
    			attr_dev(div6, "aria-labelledby", "exampleModalLabel");
    			set_style(div6, "display", "none");
    			attr_dev(div6, "aria-hidden", "true");
    			add_location(div6, file$l, 0, 0, 0);
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
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props) {
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
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalCrearNota",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src/Pages/AtencionMedica/NotasMedicas.svelte generated by Svelte v3.29.0 */
    const file$m = "src/Pages/AtencionMedica/NotasMedicas.svelte";

    function create_fragment$n(ctx) {
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
    			span1.textContent = "Fiordaliza\n                        De Jesus Herrera";
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
    			add_location(span0, file$m, 13, 20, 515);
    			attr_dev(span1, "data-bind", "text: paciente().nombreParaMostrar");
    			add_location(span1, file$m, 16, 20, 665);
    			add_location(h5, file$m, 12, 16, 490);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$m, 11, 12, 451);
    			attr_dev(div1, "class", "col-md-6");
    			set_style(div1, "text-align", "right");
    			add_location(div1, file$m, 20, 12, 830);
    			attr_dev(i0, "data-bind", "class: icon");
    			attr_dev(i0, "class", "mdi mdi-comment-eye");
    			add_location(i0, file$m, 26, 24, 1150);
    			attr_dev(sapn, "data-bind", "text: text");
    			add_location(sapn, file$m, 27, 28, 1236);
    			attr_dev(button, "data-toggle", "modal");
    			attr_dev(button, "data-target", "#modalDatosPersonales");
    			set_style(button, "box-shadow", "none");
    			attr_dev(button, "class", "btn btn-outline-secondary btn-sm");
    			add_location(button, file$m, 25, 20, 995);
    			attr_dev(div2, "class", "dropdown");
    			add_location(div2, file$m, 24, 16, 952);
    			attr_dev(div3, "class", "col-lg-12");
    			add_location(div3, file$m, 23, 12, 912);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$m, 10, 8, 421);
    			attr_dev(div5, "class", "contenedor-datos");
    			attr_dev(div5, "id", "divHeaderBar");
    			add_location(div5, file$m, 9, 4, 364);
    			attr_dev(input0, "data-bind", "textInput: busqueda");
    			attr_dev(input0, "type", "search");
    			attr_dev(input0, "class", "form-control form-control-appended");
    			attr_dev(input0, "placeholder", "Buscar por medico");
    			add_location(input0, file$m, 44, 32, 1794);
    			attr_dev(span2, "class", "mdi mdi-magnify");
    			add_location(span2, file$m, 47, 40, 2095);
    			attr_dev(div6, "class", "input-group-text");
    			add_location(div6, file$m, 46, 36, 2024);
    			attr_dev(div7, "class", "input-group-append");
    			add_location(div7, file$m, 45, 32, 1955);
    			attr_dev(div8, "class", "input-group input-group-flush mb-3");
    			add_location(div8, file$m, 43, 28, 1713);
    			attr_dev(div9, "class", "col-lg-5 col-md-4");
    			add_location(div9, file$m, 42, 24, 1653);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "name", "option");
    			attr_dev(input1, "data-bind", "checked: filtrar");
    			attr_dev(input1, "class", "cstm-switch-input");
    			add_location(input1, file$m, 54, 32, 2433);
    			attr_dev(span3, "class", "cstm-switch-indicator");
    			add_location(span3, file$m, 55, 32, 2558);
    			attr_dev(span4, "class", "cstm-switch-description");
    			add_location(span4, file$m, 56, 32, 2634);
    			attr_dev(label, "class", "cstm-switch");
    			add_location(label, file$m, 53, 28, 2373);
    			attr_dev(div10, "class", "mt-md-2 col-lg-2 col-md-4");
    			add_location(div10, file$m, 52, 24, 2305);
    			attr_dev(i1, "class", "mdi mdi-plus");
    			add_location(i1, file$m, 60, 162, 2972);
    			attr_dev(a, "href", "#!");
    			attr_dev(a, "type", "button");
    			set_style(a, "height", "35px", 1);
    			attr_dev(a, "data-toggle", "modal");
    			attr_dev(a, "data-target", "#modalNuevaNota");
    			attr_dev(a, "class", "btn btn-primary");
    			add_location(a, file$m, 60, 28, 2838);
    			attr_dev(div11, "class", "col-lg-4");
    			add_location(div11, file$m, 59, 24, 2787);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$m, 41, 20, 1611);
    			attr_dev(div13, "class", "m-3 col-md-12");
    			add_location(div13, file$m, 40, 16, 1563);
    			attr_dev(div14, "class", "row");
    			add_location(div14, file$m, 39, 12, 1529);
    			add_location(th0, file$m, 72, 32, 3406);
    			add_location(th1, file$m, 73, 32, 3460);
    			add_location(th2, file$m, 74, 32, 3514);
    			add_location(th3, file$m, 75, 32, 3561);
    			add_location(tr, file$m, 71, 28, 3369);
    			add_location(thead, file$m, 70, 24, 3333);
    			attr_dev(tbody, "data-bind", "foreach: notasFiltradas");
    			add_location(tbody, file$m, 78, 24, 3662);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$m, 69, 20, 3260);
    			attr_dev(div15, "class", "table-responsive");
    			add_location(div15, file$m, 68, 16, 3209);
    			attr_dev(div16, "class", "col-md-12 m-b-30");
    			add_location(div16, file$m, 67, 12, 3162);
    			set_style(div17, "margin-top", "100px");
    			add_location(div17, file$m, 38, 8, 1485);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$m, 37, 4, 1451);
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
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotasMedicas",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* src/Pages/AtencionMedica/Atenciones.svelte generated by Svelte v3.29.0 */
    const file$n = "src/Pages/AtencionMedica/Atenciones.svelte";

    function create_fragment$o(ctx) {
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
    			add_location(h4, file$n, 10, 12, 284);
    			option0.__value = "A";
    			option0.value = option0.__value;
    			add_location(option0, file$n, 17, 28, 704);
    			option1.__value = "E";
    			option1.value = option1.__value;
    			add_location(option1, file$n, 18, 28, 771);
    			option2.__value = "H";
    			option2.value = option2.__value;
    			add_location(option2, file$n, 19, 28, 838);
    			attr_dev(select, "class", "custom-select");
    			attr_dev(select, "title", "Tipo de Atención");
    			attr_dev(select, "data-bind", "options: $parent.tiposAtencion, \n                            optionsValue: 'id', \n                            optionsText: 'nombre', \n                            value: tipoAtencion");
    			add_location(select, file$n, 13, 24, 426);
    			attr_dev(div0, "class", "input-group col-md-3");
    			add_location(div0, file$n, 12, 20, 367);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "name", "option");
    			attr_dev(input0, "data-bind", "checked: filtrar");
    			attr_dev(input0, "class", "cstm-switch-input");
    			add_location(input0, file$n, 24, 28, 1085);
    			attr_dev(span0, "class", "cstm-switch-indicator");
    			add_location(span0, file$n, 25, 28, 1206);
    			attr_dev(span1, "class", "cstm-switch-description");
    			add_location(span1, file$n, 26, 28, 1278);
    			attr_dev(label0, "class", "cstm-switch");
    			add_location(label0, file$n, 23, 24, 1029);
    			attr_dev(div1, "class", "mt-md-2 col-lg-2 col-md-4");
    			add_location(div1, file$n, 22, 20, 965);
    			attr_dev(input1, "data-bind", "textInput: busqueda");
    			attr_dev(input1, "type", "search");
    			attr_dev(input1, "class", "form-control form-control-appended");
    			attr_dev(input1, "placeholder", "Buscar");
    			add_location(input1, file$n, 31, 28, 1543);
    			attr_dev(span2, "class", "mdi mdi-magnify");
    			add_location(span2, file$n, 34, 36, 1885);
    			attr_dev(div2, "class", "input-group-text");
    			attr_dev(div2, "data-bind", "class: ($root.estado() == 'loading') ? 'd-none': ''");
    			add_location(div2, file$n, 33, 32, 1754);
    			attr_dev(span3, "class", "mdi mdi-spin mdi-loading");
    			add_location(span3, file$n, 37, 36, 2132);
    			attr_dev(div3, "class", "input-group-text d-none");
    			attr_dev(div3, "data-bind", "class: ($root.estado() != 'loading') ? 'd-none': ''");
    			add_location(div3, file$n, 36, 32, 1994);
    			attr_dev(div4, "class", "input-group-append");
    			add_location(div4, file$n, 32, 28, 1689);
    			attr_dev(div5, "class", "input-group input-group-flush mb-3");
    			add_location(div5, file$n, 30, 24, 1466);
    			attr_dev(div6, "class", "col-md-5");
    			add_location(div6, file$n, 29, 20, 1419);
    			attr_dev(i0, "class", "mdi mdi-filter");
    			add_location(i0, file$n, 44, 24, 2540);
    			attr_dev(a0, "class", "btn ml-2 mr-2 ml-3 btn-primary");
    			set_style(a0, "height", "35px");
    			attr_dev(a0, "data-toggle", "collapse");
    			attr_dev(a0, "href", "#collapseExample");
    			attr_dev(a0, "role", "button");
    			attr_dev(a0, "aria-expanded", "false");
    			attr_dev(a0, "aria-controls", "collapseExample");
    			add_location(a0, file$n, 43, 20, 2336);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$n, 51, 40, 2995);
    			attr_dev(input2, "type", "date");
    			attr_dev(input2, "data-bind", "textInput: desde");
    			attr_dev(input2, "class", "form-control");
    			add_location(input2, file$n, 52, 40, 3063);
    			attr_dev(div7, "class", "form-group  col-lg-3");
    			add_location(div7, file$n, 50, 36, 2920);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$n, 55, 40, 3287);
    			attr_dev(input3, "type", "date");
    			attr_dev(input3, "data-bind", "textInput: hasta");
    			attr_dev(input3, "class", "form-control");
    			add_location(input3, file$n, 56, 40, 3355);
    			attr_dev(div8, "class", "form-group  col-lg-3");
    			add_location(div8, file$n, 54, 36, 3212);
    			attr_dev(input4, "id", "radio-new1");
    			attr_dev(input4, "name", "bigradios");
    			input4.value = "A";
    			attr_dev(input4, "data-bind", "checked: estado");
    			attr_dev(input4, "type", "radio");
    			add_location(input4, file$n, 60, 44, 3636);
    			attr_dev(span4, "class", "d-block");
    			add_location(span4, file$n, 63, 52, 3926);
    			attr_dev(span5, "class", "radio-content");
    			add_location(span5, file$n, 62, 48, 3845);
    			attr_dev(label3, "for", "radio-new1");
    			add_location(label3, file$n, 61, 44, 3772);
    			attr_dev(div9, "class", "option-box");
    			add_location(div9, file$n, 59, 40, 3567);
    			attr_dev(input5, "id", "radio-new2");
    			attr_dev(input5, "name", "bigradios");
    			input5.value = "E";
    			attr_dev(input5, "data-bind", "checked: estado");
    			attr_dev(input5, "type", "radio");
    			add_location(input5, file$n, 68, 44, 4244);
    			attr_dev(span6, "class", "d-block");
    			add_location(span6, file$n, 71, 52, 4534);
    			attr_dev(span7, "class", "radio-content");
    			add_location(span7, file$n, 70, 48, 4453);
    			attr_dev(label4, "for", "radio-new2");
    			add_location(label4, file$n, 69, 44, 4380);
    			attr_dev(div10, "class", "option-box ml-3");
    			add_location(div10, file$n, 67, 40, 4170);
    			attr_dev(input6, "id", "radio-new3");
    			attr_dev(input6, "name", "bigradios");
    			input6.value = "*";
    			attr_dev(input6, "data-bind", "checked: estado");
    			attr_dev(input6, "type", "radio");
    			add_location(input6, file$n, 76, 44, 4853);
    			attr_dev(span8, "class", "d-block");
    			add_location(span8, file$n, 79, 52, 5143);
    			attr_dev(span9, "class", "radio-content");
    			add_location(span9, file$n, 78, 48, 5062);
    			attr_dev(label5, "for", "radio-new3");
    			add_location(label5, file$n, 77, 44, 4989);
    			attr_dev(div11, "class", "option-box ml-3");
    			add_location(div11, file$n, 75, 40, 4779);
    			attr_dev(div12, "class", "col-lg-6");
    			add_location(div12, file$n, 58, 36, 3504);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$n, 49, 32, 2866);
    			attr_dev(div14, "class", "card card-body");
    			add_location(div14, file$n, 48, 28, 2805);
    			attr_dev(div15, "class", "collapse");
    			attr_dev(div15, "id", "collapseExample");
    			add_location(div15, file$n, 47, 24, 2733);
    			attr_dev(div16, "class", "col-lg-12");
    			set_style(div16, "padding-top", "0", 1);
    			set_style(div16, "margin-top", "0", 1);
    			add_location(div16, file$n, 46, 20, 2624);
    			attr_dev(div17, "class", "row");
    			add_location(div17, file$n, 11, 12, 329);
    			attr_dev(div18, "class", "mt-4 col-md-12");
    			attr_dev(div18, "data-bind", "using: filtro");
    			add_location(div18, file$n, 9, 8, 217);
    			add_location(th0, file$n, 96, 32, 5812);
    			add_location(th1, file$n, 97, 32, 5862);
    			add_location(th2, file$n, 98, 32, 5908);
    			add_location(th3, file$n, 99, 32, 5954);
    			add_location(th4, file$n, 100, 32, 6012);
    			add_location(tr0, file$n, 95, 28, 5775);
    			add_location(thead, file$n, 94, 24, 5739);
    			attr_dev(span10, "class", "avatar-title rounded-circle ");
    			attr_dev(span10, "data-bind", "text: nombres[0] + primerApellido[0]");
    			add_location(span10, file$n, 108, 44, 6421);
    			attr_dev(div19, "class", "avatar avatar-sm");
    			add_location(div19, file$n, 107, 40, 6346);
    			attr_dev(div20, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div20, file$n, 106, 36, 6259);
    			attr_dev(span11, "data-bind", "text: nombres + ' ' + primerApellido");
    			add_location(span11, file$n, 111, 43, 6618);
    			add_location(td0, file$n, 105, 32, 6218);
    			attr_dev(td1, "data-bind", "text: edad");
    			add_location(td1, file$n, 113, 32, 6770);
    			attr_dev(td2, "data-bind", "text: sexo");
    			add_location(td2, file$n, 114, 32, 6842);
    			attr_dev(td3, "data-bind", "text: new Date(fechaIngreso).toLocaleString('es-Do')");
    			add_location(td3, file$n, 115, 32, 6908);
    			attr_dev(i1, "class", " mdi-24px mdi mdi-open-in-new");
    			add_location(i1, file$n, 119, 189, 7348);
    			attr_dev(a1, "data-target", "#modalNuevaAtencion");
    			attr_dev(a1, "data-placement", "top");
    			attr_dev(a1, "title", "Iniciar consulta");
    			attr_dev(a1, "class", "icon-table");
    			attr_dev(a1, "href", "/AtencionMedica/Trabajar/1#resumen-page");
    			add_location(a1, file$n, 119, 40, 7199);
    			set_style(div21, "width", "150px");
    			attr_dev(div21, "class", "ml-auto");
    			add_location(div21, file$n, 118, 36, 7115);
    			set_style(td4, "text-align", "right");
    			add_location(td4, file$n, 117, 32, 7047);
    			add_location(tr1, file$n, 104, 28, 6181);
    			attr_dev(tbody, "data-bind", "foreach: atenciones");
    			add_location(tbody, file$n, 103, 24, 6113);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$n, 93, 20, 5666);
    			attr_dev(div22, "class", "table-responsive");
    			add_location(div22, file$n, 92, 16, 5615);
    			attr_dev(div23, "class", "col-md-12 m-b-30");
    			add_location(div23, file$n, 91, 12, 5568);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$n, 8, 4, 177);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$n, 6, 0, 134);
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
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Atenciones",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* src/Layout/AsideAdministracion.svelte generated by Svelte v3.29.0 */
    const file$o = "src/Layout/AsideAdministracion.svelte";

    function create_fragment$p(ctx) {
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
    			add_location(a0, file$o, 9, 8, 277);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$o, 8, 6, 234);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$o, 14, 8, 424);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$o, 18, 8, 593);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$o, 12, 6, 366);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$o, 6, 4, 157);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$o, 30, 14, 1011);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$o, 29, 12, 971);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$o, 33, 14, 1125);
    			attr_dev(i0, "class", "icon-placeholder mdi-24px mdi mdi-home");
    			add_location(i0, file$o, 34, 14, 1204);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$o, 32, 12, 1086);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$o, 28, 10, 919);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$o, 27, 8, 840);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$o, 46, 14, 1578);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$o, 45, 12, 1538);
    			attr_dev(i1, "class", "icon-placeholder mdi-24px mdi mdi-clipboard-flow");
    			add_location(i1, file$o, 49, 14, 1689);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$o, 48, 12, 1650);
    			attr_dev(a4, "href", "/Usuario/Index");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$o, 44, 10, 1473);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$o, 43, 8, 1381);
    			attr_dev(ul, "class", "menu");
    			add_location(ul, file$o, 25, 6, 782);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$o, 23, 4, 696);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$o, 5, 2, 123);
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
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AsideAdministracion",
    			options,
    			id: create_fragment$p.name
    		});
    	}
    }

    /* src/componentes/ModalCrearUsuarios.svelte generated by Svelte v3.29.0 */

    const file$p = "src/componentes/ModalCrearUsuarios.svelte";

    function create_fragment$q(ctx) {
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
    			add_location(h5, file$p, 5, 16, 329);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$p, 8, 20, 554);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-bind", "click: nuevoUsuario");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$p, 6, 16, 405);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$p, 4, 12, 286);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "IdUser");
    			add_location(input0, file$p, 14, 20, 730);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$p, 17, 28, 896);
    			attr_dev(input1, "type", "name");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Ing. John Doe");
    			attr_dev(input1, "name", "Name");
    			attr_dev(input1, "maxlength", "200");
    			input1.required = "";
    			add_location(input1, file$p, 18, 28, 962);
    			attr_dev(div1, "class", "form-group col-md-12");
    			add_location(div1, file$p, 16, 24, 833);
    			attr_dev(div2, "class", "form-row");
    			add_location(div2, file$p, 15, 20, 786);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$p, 24, 28, 1291);
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "autocomplete", "off");
    			attr_dev(input2, "name", "UserName");
    			attr_dev(input2, "id", "");
    			attr_dev(input2, "maxlength", "100");
    			add_location(input2, file$p, 25, 28, 1349);
    			attr_dev(div3, "class", "form-group col-md-12");
    			add_location(div3, file$p, 23, 24, 1228);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$p, 29, 28, 1598);
    			attr_dev(input3, "type", "email");
    			input3.required = true;
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "placeholder", "usuario@correo.com");
    			attr_dev(input3, "autocomplete", "off");
    			attr_dev(input3, "name", "Email");
    			attr_dev(input3, "id", "txtCorreo");
    			attr_dev(input3, "maxlength", "100");
    			add_location(input3, file$p, 30, 28, 1654);
    			attr_dev(div4, "class", "form-group col-md-12");
    			add_location(div4, file$p, 28, 24, 1535);
    			attr_dev(div5, "class", "form-row");
    			add_location(div5, file$p, 22, 20, 1181);
    			attr_dev(label3, "for", "");
    			add_location(label3, file$p, 37, 28, 2053);
    			attr_dev(input4, "type", "password");
    			attr_dev(input4, "class", "form-control");
    			input4.required = true;
    			attr_dev(input4, "name", "PasswordHash");
    			attr_dev(input4, "maxlength", "50");
    			add_location(input4, file$p, 38, 28, 2121);
    			attr_dev(div6, "class", "form-group col-md-12");
    			add_location(div6, file$p, 36, 24, 1990);
    			attr_dev(div7, "class", "form-row");
    			add_location(div7, file$p, 35, 20, 1943);
    			attr_dev(label4, "for", "");
    			add_location(label4, file$p, 47, 28, 2465);
    			attr_dev(input5, "type", "text");
    			attr_dev(input5, "class", "form-control");
    			attr_dev(input5, "data-mask", "(000) 000-0000");
    			attr_dev(input5, "data-mask-clearifnotmatch", "true");
    			attr_dev(input5, "autocomplete", "off");
    			attr_dev(input5, "maxlength", "14");
    			attr_dev(input5, "placeholder", "(809) 000-0000");
    			attr_dev(input5, "name", "PhoneNumber");
    			attr_dev(input5, "id", "txtTelefono");
    			add_location(input5, file$p, 48, 28, 2524);
    			attr_dev(div8, "class", "form-group col-md-12");
    			add_location(div8, file$p, 46, 24, 2402);
    			attr_dev(input6, "type", "checkbox");
    			input6.value = "true";
    			attr_dev(input6, "name", "EsMedico");
    			attr_dev(input6, "class", "cstm-switch-input");
    			add_location(input6, file$p, 54, 32, 2966);
    			attr_dev(span1, "class", "cstm-switch-indicator ");
    			add_location(span1, file$p, 56, 32, 3113);
    			attr_dev(span2, "class", "cstm-switch-description");
    			add_location(span2, file$p, 57, 32, 3190);
    			attr_dev(label5, "class", "cstm-switch");
    			add_location(label5, file$p, 53, 28, 2906);
    			attr_dev(div9, "class", "form-group col-md-12");
    			add_location(div9, file$p, 52, 24, 2843);
    			attr_dev(label6, "for", "");
    			add_location(label6, file$p, 61, 28, 3401);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "pattern", "^[0-9]+$");
    			attr_dev(input7, "class", "form-control");
    			attr_dev(input7, "utocomplete", "off");
    			attr_dev(input7, "name", "Exequatur");
    			attr_dev(input7, "id", "txtTelefono");
    			add_location(input7, file$p, 62, 28, 3461);
    			attr_dev(div10, "class", "form-group col-md-12");
    			add_location(div10, file$p, 60, 24, 3338);
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file$p, 69, 32, 3967);
    			attr_dev(select, "name", "IdDepartamento");
    			attr_dev(select, "class", " js-select2 select2-hidden-accessible");
    			attr_dev(select, "id", "sltDepartamentos");
    			set_style(select, "width", "100%");
    			attr_dev(select, "aria-hidden", "true");
    			select.required = true;
    			add_location(select, file$p, 66, 28, 3723);
    			attr_dev(div11, "class", "form-group col-md-12");
    			add_location(div11, file$p, 65, 24, 3660);
    			attr_dev(div12, "class", "form-row");
    			add_location(div12, file$p, 45, 20, 2355);
    			attr_dev(label7, "for", "");
    			add_location(label7, file$p, 75, 28, 4220);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "Observaciones");
    			add_location(textarea, file$p, 76, 28, 4284);
    			attr_dev(div13, "class", "form-group col-md-12");
    			add_location(div13, file$p, 74, 24, 4157);
    			attr_dev(div14, "class", "form-row");
    			add_location(div14, file$p, 73, 20, 4110);
    			add_location(br, file$p, 81, 20, 4468);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$p, 83, 24, 4544);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "btn btn-success");
    			add_location(button2, file$p, 86, 24, 4707);
    			attr_dev(div15, "class", "modal-footer");
    			add_location(div15, file$p, 82, 20, 4493);
    			attr_dev(form, "id", "frmUsuario");
    			add_location(form, file$p, 13, 16, 687);
    			attr_dev(div16, "class", "modal-body");
    			add_location(div16, file$p, 11, 12, 645);
    			attr_dev(div17, "class", "modal-content");
    			add_location(div17, file$p, 3, 8, 246);
    			attr_dev(div18, "class", "modal-dialog");
    			attr_dev(div18, "role", "document");
    			add_location(div18, file$p, 2, 4, 195);
    			attr_dev(div19, "class", "modal fade modal-slide-right");
    			attr_dev(div19, "id", "modalUsuario");
    			attr_dev(div19, "tabindex", "-1");
    			attr_dev(div19, "role", "dialog");
    			attr_dev(div19, "aria-labelledby", "modalUsuarioLabel");
    			set_style(div19, "display", "none");
    			set_style(div19, "padding-right", "16px");
    			attr_dev(div19, "aria-modal", "true");
    			add_location(div19, file$p, 0, 0, 0);
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
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props) {
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
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalCrearUsuarios",
    			options,
    			id: create_fragment$q.name
    		});
    	}
    }

    /* src/componentes/ModalRolesUsuario.svelte generated by Svelte v3.29.0 */

    const file$q = "src/componentes/ModalRolesUsuario.svelte";

    function create_fragment$r(ctx) {
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
    			add_location(h5, file$q, 5, 20, 345);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$q, 7, 24, 522);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$q, 6, 20, 421);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$q, 4, 16, 298);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "idPaciente");
    			input0.value = "";
    			add_location(input0, file$q, 13, 24, 708);
    			attr_dev(span1, "class", "badge badge-soft-primary");
    			set_style(span1, "font-size", "17px");
    			add_location(span1, file$q, 14, 27, 784);
    			add_location(p, file$q, 14, 24, 781);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$q, 17, 28, 988);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Buscar roles");
    			add_location(input1, file$q, 18, 28, 1045);
    			attr_dev(div1, "class", "form-group floating-label");
    			add_location(div1, file$q, 16, 24, 920);
    			attr_dev(i, "class", "mdi-18px mdi mdi-information-outline");
    			add_location(i, file$q, 29, 61, 1860);
    			attr_dev(a, "href", "#!");
    			attr_dev(a, "data-toggle", "popover");
    			attr_dev(a, "title", "Informacion Administrador");
    			attr_dev(a, "data-trigger", "focus");
    			attr_dev(a, "data-placement", "bottom");
    			attr_dev(a, "data-content", "And here's some amazing content. It's very engaging. Right?");
    			attr_dev(a, "class", "icon-rol");
    			add_location(a, file$q, 25, 55, 1478);
    			attr_dev(span2, "class", "cstm-switch-description mr-auto bd-highlight");
    			add_location(span2, file$q, 24, 36, 1364);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "name", "option");
    			input2.value = "1";
    			attr_dev(input2, "class", "cstm-switch-input");
    			add_location(input2, file$q, 31, 36, 2008);
    			attr_dev(span3, "class", "cstm-switch-indicator bg-success bd-highlight");
    			add_location(span3, file$q, 34, 36, 2198);
    			attr_dev(label1, "class", "cstm-switch d-flex bd-highlight");
    			add_location(label1, file$q, 23, 32, 1280);
    			attr_dev(div2, "class", "lista-rol m-b-10");
    			add_location(div2, file$q, 22, 28, 1217);
    			attr_dev(div3, "class", "roles");
    			add_location(div3, file$q, 20, 24, 1168);
    			attr_dev(form, "id", "");
    			add_location(form, file$q, 12, 20, 671);
    			attr_dev(div4, "class", "modal-body");
    			add_location(div4, file$q, 10, 16, 625);
    			attr_dev(div5, "class", "modal-content");
    			add_location(div5, file$q, 3, 12, 254);
    			attr_dev(div6, "class", "modal-dialog");
    			attr_dev(div6, "role", "document");
    			add_location(div6, file$q, 2, 8, 199);
    			attr_dev(div7, "class", "modal fade modal-slide-right");
    			attr_dev(div7, "id", "modalRoles");
    			attr_dev(div7, "tabindex", "-1");
    			attr_dev(div7, "role", "dialog");
    			attr_dev(div7, "aria-labelledby", "modalRolesLabel");
    			set_style(div7, "display", "none");
    			set_style(div7, "padding-right", "16px");
    			attr_dev(div7, "aria-modal", "true");
    			add_location(div7, file$q, 0, 0, 0);
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
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props) {
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
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalRolesUsuario",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* src/Pages/Usuario/Index.svelte generated by Svelte v3.29.0 */
    const file$r = "src/Pages/Usuario/Index.svelte";

    function create_fragment$s(ctx) {
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
    			add_location(div0, file$r, 13, 6, 442);
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$r, 14, 6, 468);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "class", "form-control form-control-appended");
    			attr_dev(input, "placeholder", "Buscar");
    			add_location(input, file$r, 20, 28, 739);
    			attr_dev(span0, "class", "mdi mdi-magnify");
    			add_location(span0, file$r, 23, 36, 985);
    			attr_dev(div1, "class", "input-group-text");
    			add_location(div1, file$r, 22, 32, 918);
    			attr_dev(div2, "class", "input-group-append");
    			add_location(div2, file$r, 21, 28, 853);
    			attr_dev(div3, "class", "input-group input-group-flush mb-3");
    			add_location(div3, file$r, 19, 24, 662);
    			attr_dev(div4, "class", "col-md-5");
    			add_location(div4, file$r, 18, 20, 615);
    			attr_dev(i0, "class", "mdi mdi-account-plus");
    			add_location(i0, file$r, 28, 137, 1292);
    			attr_dev(button, "data-target", "#modalUsuario");
    			attr_dev(button, "data-toggle", "modal");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn  m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			add_location(button, file$r, 28, 20, 1175);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$r, 17, 16, 577);
    			attr_dev(div6, "class", "col-md-12");
    			add_location(div6, file$r, 16, 12, 537);
    			add_location(th0, file$r, 37, 32, 1671);
    			add_location(th1, file$r, 39, 32, 1778);
    			add_location(th2, file$r, 40, 32, 1826);
    			add_location(tr0, file$r, 36, 28, 1634);
    			add_location(thead, file$r, 35, 24, 1598);
    			attr_dev(span1, "class", "avatar-title rounded-circle ");
    			add_location(span1, file$r, 48, 44, 2204);
    			attr_dev(div7, "class", "avatar avatar-sm");
    			add_location(div7, file$r, 47, 40, 2129);
    			attr_dev(div8, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div8, file$r, 46, 36, 2042);
    			add_location(span2, file$r, 51, 43, 2352);
    			add_location(td0, file$r, 45, 32, 2001);
    			add_location(td1, file$r, 54, 32, 2532);
    			attr_dev(i1, "class", " mdi-24px mdi mdi-circle-edit-outline");
    			add_location(i1, file$r, 61, 218, 3219);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "data-toggle", "modal");
    			set_style(a0, "cursor", "pointer");
    			attr_dev(a0, "data-target", "#modalUsuario");
    			attr_dev(a0, "data-placement", "top");
    			attr_dev(a0, "data-original-title", "Modificar usuario");
    			attr_dev(a0, "class", "icon-table hover-cursor");
    			add_location(a0, file$r, 61, 40, 3041);
    			attr_dev(i2, "class", " mdi-24px mdi mdi-security");
    			add_location(i2, file$r, 62, 161, 3438);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "data-toggle", "modal");
    			attr_dev(a1, "data-target", "#modalRoles");
    			attr_dev(a1, "data-placement", "bottom");
    			attr_dev(a1, "title", "Asignar Roles");
    			attr_dev(a1, "class", "icon-rol");
    			add_location(a1, file$r, 62, 40, 3317);
    			set_style(div9, "width", "150px");
    			set_style(div9, "text-align", "right");
    			attr_dev(div9, "class", "ml-auto");
    			add_location(div9, file$r, 57, 36, 2642);
    			add_location(td2, file$r, 56, 32, 2601);
    			add_location(tr1, file$r, 44, 28, 1964);
    			add_location(tbody, file$r, 43, 24, 1927);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$r, 34, 20, 1525);
    			attr_dev(div10, "class", "table-responsive");
    			add_location(div10, file$r, 33, 16, 1474);
    			attr_dev(div11, "class", "col-md-12 m-b-30");
    			add_location(div11, file$r, 32, 12, 1427);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$r, 15, 8, 507);
    			attr_dev(div13, "class", "p-2");
    			add_location(div13, file$r, 12, 4, 418);
    			attr_dev(section, "class", "admin-content p-2");
    			add_location(section, file$r, 11, 2, 378);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$r, 9, 0, 337);
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
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* src/Pages/Home/Error404.svelte generated by Svelte v3.29.0 */

    const file$s = "src/Pages/Home/Error404.svelte";

    function create_fragment$t(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "404";
    			add_location(h1, file$s, 0, 0, 0);
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
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props) {
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
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Error404",
    			options,
    			id: create_fragment$t.name
    		});
    	}
    }

    const routes = {
        "/": Index,
        "/Paciente/Index": Index$1,
        "/Paciente/Perfil/:id": Perfil,
        "/Paciente/Editar": Editar,
        "/AtencionMedica/Interconsultas": Interconsultas,
        "/AtencionMedica/Atenciones": Atenciones,
        "/Usuario/Index": Index$2,
        "/pacientes/:idPaciente/AtencionMedica/Resumen": Resumen,
        "/pacientes/:idPaciente/AtencionMedica/EditarDatosAtencion/:id": EditarDatosAtencion,
        "/pacientes/:idPaciente/AtencionMedica/HistoriaClinica/:idNota": HistoriaClinica,
        "/pacientes/:idPaciente/AtencionMedica/NotasMedicas": NotasMedicas,
        "*": Error404
    };

    /* src/App.svelte generated by Svelte v3.29.0 */

    function create_fragment$u(ctx) {
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
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$u.name
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
