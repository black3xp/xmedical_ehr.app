
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

    /* src\Layout\Header.svelte generated by Svelte v3.29.0 */

    const file = "src\\Layout\\Header.svelte";

    function create_fragment$1(ctx) {
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
    			add_location(a0, file, 1, 4, 35);
    			attr_dev(i0, "class", "mdi mdi-24px mdi-bell-outline");
    			add_location(i0, file, 34, 14, 914);
    			attr_dev(span0, "class", "notification-counter");
    			add_location(span0, file, 35, 14, 973);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "data-toggle", "dropdown");
    			attr_dev(a1, "aria-haspopup", "true");
    			attr_dev(a1, "aria-expanded", "false");
    			add_location(a1, file, 28, 12, 727);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "mdi mdi-18px mdi-settings text-muted");
    			add_location(a2, file, 42, 16, 1261);
    			attr_dev(span1, "class", "h5 m-0");
    			add_location(span1, file, 45, 16, 1387);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "mdi mdi-18px mdi-notification-clear-all text-muted");
    			add_location(a3, file, 46, 16, 1446);
    			attr_dev(div0, "class", "d-flex p-all-15 bg-white justify-content-between\r\n                border-bottom ");
    			add_location(div0, file, 39, 14, 1132);
    			attr_dev(div1, "class", "text-overline m-b-5");
    			add_location(div1, file, 53, 16, 1710);
    			attr_dev(i1, "class", "mdi mdi-circle text-success");
    			add_location(i1, file, 57, 22, 1915);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file, 56, 20, 1868);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file, 55, 18, 1828);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "class", "d-block m-b-10");
    			add_location(a4, file, 54, 16, 1772);
    			attr_dev(i2, "class", "mdi mdi-upload-multiple ");
    			add_location(i2, file, 65, 22, 2241);
    			attr_dev(div4, "class", "card-body");
    			add_location(div4, file, 64, 20, 2194);
    			attr_dev(div5, "class", "card");
    			add_location(div5, file, 63, 18, 2154);
    			attr_dev(a5, "href", "#!");
    			attr_dev(a5, "class", "d-block m-b-10");
    			add_location(a5, file, 62, 16, 2098);
    			attr_dev(i3, "class", "mdi mdi-cancel text-danger");
    			add_location(i3, file, 73, 22, 2563);
    			attr_dev(div6, "class", "card-body");
    			add_location(div6, file, 72, 20, 2516);
    			attr_dev(div7, "class", "card");
    			add_location(div7, file, 71, 18, 2476);
    			attr_dev(a6, "href", "#!");
    			attr_dev(a6, "class", "d-block m-b-10");
    			add_location(a6, file, 70, 16, 2420);
    			attr_dev(div8, "class", "notification-events bg-gray-300");
    			add_location(div8, file, 52, 14, 1647);
    			attr_dev(div9, "class", "dropdown-menu notification-container dropdown-menu-right");
    			add_location(div9, file, 38, 12, 1046);
    			attr_dev(div10, "class", "dropdown");
    			add_location(div10, file, 27, 10, 691);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file, 26, 8, 658);
    			attr_dev(span2, "class", "avatar-title rounded-circle bg-dark");
    			add_location(span2, file, 93, 14, 3145);
    			attr_dev(div11, "class", "avatar avatar-sm avatar-online");
    			add_location(div11, file, 92, 12, 3085);
    			attr_dev(a7, "class", "nav-link dropdown-toggle");
    			attr_dev(a7, "href", "#!");
    			attr_dev(a7, "role", "button");
    			attr_dev(a7, "data-toggle", "dropdown");
    			attr_dev(a7, "aria-haspopup", "true");
    			attr_dev(a7, "aria-expanded", "false");
    			add_location(a7, file, 85, 10, 2867);
    			attr_dev(a8, "class", "dropdown-item");
    			attr_dev(a8, "href", "#!");
    			add_location(a8, file, 98, 12, 3316);
    			attr_dev(a9, "class", "dropdown-item");
    			attr_dev(a9, "href", "#!");
    			add_location(a9, file, 99, 12, 3380);
    			attr_dev(a10, "class", "dropdown-item");
    			attr_dev(a10, "href", "#!");
    			add_location(a10, file, 100, 12, 3447);
    			attr_dev(div12, "class", "dropdown-divider");
    			add_location(div12, file, 101, 12, 3504);
    			attr_dev(a11, "class", "dropdown-item");
    			attr_dev(a11, "href", "#!");
    			add_location(a11, file, 102, 12, 3550);
    			attr_dev(div13, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div13, file, 97, 10, 3255);
    			attr_dev(li1, "class", "nav-item dropdown ");
    			add_location(li1, file, 84, 8, 2824);
    			attr_dev(ul, "class", "nav align-items-center");
    			add_location(ul, file, 24, 6, 609);
    			attr_dev(nav, "class", " ml-auto");
    			add_location(nav, file, 23, 4, 579);
    			attr_dev(header, "class", "admin-header");
    			add_location(header, file, 0, 0, 0);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$1.name
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

    /* src\Layout\Aside.svelte generated by Svelte v3.29.0 */
    const file$1 = "src\\Layout\\Aside.svelte";

    function create_fragment$2(ctx) {
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
    	let ul1;
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
    	let li4;
    	let a5;
    	let span11;
    	let span9;
    	let t12;
    	let span8;
    	let t13;
    	let span10;
    	let t15;
    	let span12;
    	let i2;
    	let t16;
    	let ul0;
    	let li2;
    	let a6;
    	let span14;
    	let span13;
    	let t18;
    	let span15;
    	let i3;
    	let link_action_3;
    	let t20;
    	let li3;
    	let a7;
    	let span17;
    	let span16;
    	let t22;
    	let span18;
    	let i4;
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
    			ul1 = element("ul");
    			li0 = element("li");
    			a3 = element("a");
    			span2 = element("span");
    			span1 = element("span");
    			span1.textContent = "Escritorio";
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
    			span5.textContent = "Paciente";
    			t10 = space();
    			span7 = element("span");
    			i1 = element("i");
    			t11 = space();
    			li4 = element("li");
    			a5 = element("a");
    			span11 = element("span");
    			span9 = element("span");
    			t12 = text("Mantenimiento\r\n                ");
    			span8 = element("span");
    			t13 = space();
    			span10 = element("span");
    			span10.textContent = "Contains submenu";
    			t15 = space();
    			span12 = element("span");
    			i2 = element("i");
    			t16 = space();
    			ul0 = element("ul");
    			li2 = element("li");
    			a6 = element("a");
    			span14 = element("span");
    			span13 = element("span");
    			span13.textContent = "Usuarios";
    			t18 = space();
    			span15 = element("span");
    			i3 = element("i");
    			i3.textContent = "U";
    			t20 = space();
    			li3 = element("li");
    			a7 = element("a");
    			span17 = element("span");
    			span16 = element("span");
    			span16.textContent = "Empresa";
    			t22 = space();
    			span18 = element("span");
    			i4 = element("i");
    			i4.textContent = "E";
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$1, 9, 8, 286);
    			attr_dev(span0, "class", "admin-brand-content");
    			add_location(span0, file$1, 8, 6, 242);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "class", "admin-pin-sidebar btn-ghost btn btn-rounded-circle pinned");
    			add_location(a1, file$1, 14, 8, 438);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "admin-close-sidebar");
    			add_location(a2, file$1, 18, 8, 611);
    			attr_dev(div0, "class", "ml-auto");
    			add_location(div0, file$1, 12, 6, 378);
    			attr_dev(div1, "class", "admin-sidebar-brand");
    			add_location(div1, file$1, 6, 4, 163);
    			attr_dev(span1, "class", "menu-name");
    			add_location(span1, file$1, 30, 14, 1041);
    			attr_dev(span2, "class", "menu-label");
    			add_location(span2, file$1, 29, 12, 1000);
    			attr_dev(span3, "class", "icon-badge badge-success badge badge-pill");
    			add_location(span3, file$1, 33, 14, 1157);
    			attr_dev(i0, "class", "icon-placeholder mdi mdi-view-dashboard");
    			add_location(i0, file$1, 34, 14, 1237);
    			attr_dev(span4, "class", "menu-icon");
    			add_location(span4, file$1, 32, 12, 1117);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "menu-link");
    			add_location(a3, file$1, 28, 10, 947);
    			attr_dev(li0, "class", "menu-item");
    			add_location(li0, file$1, 27, 8, 867);
    			attr_dev(span5, "class", "menu-name");
    			add_location(span5, file$1, 44, 14, 1622);
    			attr_dev(span6, "class", "menu-label");
    			add_location(span6, file$1, 43, 12, 1581);
    			attr_dev(i1, "class", "icon-placeholder mdi mdi-account-circle-outline");
    			add_location(i1, file$1, 47, 14, 1736);
    			attr_dev(span7, "class", "menu-icon");
    			add_location(span7, file$1, 46, 12, 1696);
    			attr_dev(a4, "href", "/Paciente/Index");
    			attr_dev(a4, "class", "menu-link");
    			add_location(a4, file$1, 42, 10, 1514);
    			attr_dev(li1, "class", "menu-item");
    			add_location(li1, file$1, 41, 8, 1420);
    			attr_dev(span8, "class", "menu-arrow");
    			add_location(span8, file$1, 59, 16, 2137);
    			attr_dev(span9, "class", "menu-name");
    			add_location(span9, file$1, 57, 14, 2064);
    			attr_dev(span10, "class", "menu-info");
    			add_location(span10, file$1, 61, 14, 2203);
    			attr_dev(span11, "class", "menu-label");
    			add_location(span11, file$1, 56, 12, 2023);
    			attr_dev(i2, "class", "icon-placeholder mdi mdi-link-variant ");
    			add_location(i2, file$1, 64, 14, 2325);
    			attr_dev(span12, "class", "menu-icon");
    			add_location(span12, file$1, 63, 12, 2285);
    			attr_dev(a5, "href", "#!");
    			attr_dev(a5, "class", "open-dropdown menu-link");
    			add_location(a5, file$1, 55, 10, 1964);
    			attr_dev(span13, "class", "menu-name");
    			add_location(span13, file$1, 72, 18, 2641);
    			attr_dev(span14, "class", "menu-label");
    			add_location(span14, file$1, 71, 16, 2596);
    			attr_dev(i3, "class", "icon-placeholder ");
    			add_location(i3, file$1, 75, 18, 2767);
    			attr_dev(span15, "class", "menu-icon");
    			add_location(span15, file$1, 74, 16, 2723);
    			attr_dev(a6, "href", "/Usuario/Index");
    			attr_dev(a6, "class", " menu-link");
    			add_location(a6, file$1, 70, 14, 2525);
    			attr_dev(li2, "class", "menu-item");
    			add_location(li2, file$1, 69, 12, 2487);
    			attr_dev(span16, "class", "menu-name");
    			add_location(span16, file$1, 83, 18, 3016);
    			attr_dev(span17, "class", "menu-label");
    			add_location(span17, file$1, 82, 16, 2971);
    			attr_dev(i4, "class", "icon-placeholder ");
    			add_location(i4, file$1, 86, 18, 3141);
    			attr_dev(span18, "class", "menu-icon");
    			add_location(span18, file$1, 85, 16, 3097);
    			attr_dev(a7, "href", "#!");
    			attr_dev(a7, "class", " menu-link");
    			add_location(a7, file$1, 81, 14, 2921);
    			attr_dev(li3, "class", "menu-item");
    			add_location(li3, file$1, 80, 12, 2883);
    			attr_dev(ul0, "class", "sub-menu");
    			add_location(ul0, file$1, 68, 10, 2452);
    			attr_dev(li4, "class", "menu-item ");
    			add_location(li4, file$1, 54, 8, 1929);
    			attr_dev(ul1, "class", "menu");
    			add_location(ul1, file$1, 25, 6, 807);
    			attr_dev(div2, "class", "admin-sidebar-wrapper js-scrollbar");
    			add_location(div2, file$1, 23, 4, 719);
    			attr_dev(aside, "class", "admin-sidebar");
    			add_location(aside, file$1, 5, 2, 128);
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
    			append_dev(div2, ul1);
    			append_dev(ul1, li0);
    			append_dev(li0, a3);
    			append_dev(a3, span2);
    			append_dev(span2, span1);
    			append_dev(a3, t5);
    			append_dev(a3, span4);
    			append_dev(span4, span3);
    			append_dev(span4, t7);
    			append_dev(span4, i0);
    			append_dev(ul1, t8);
    			append_dev(ul1, li1);
    			append_dev(li1, a4);
    			append_dev(a4, span6);
    			append_dev(span6, span5);
    			append_dev(a4, t10);
    			append_dev(a4, span7);
    			append_dev(span7, i1);
    			append_dev(ul1, t11);
    			append_dev(ul1, li4);
    			append_dev(li4, a5);
    			append_dev(a5, span11);
    			append_dev(span11, span9);
    			append_dev(span9, t12);
    			append_dev(span9, span8);
    			append_dev(span11, t13);
    			append_dev(span11, span10);
    			append_dev(a5, t15);
    			append_dev(a5, span12);
    			append_dev(span12, i2);
    			append_dev(li4, t16);
    			append_dev(li4, ul0);
    			append_dev(ul0, li2);
    			append_dev(li2, a6);
    			append_dev(a6, span14);
    			append_dev(span14, span13);
    			append_dev(a6, t18);
    			append_dev(a6, span15);
    			append_dev(span15, i3);
    			append_dev(ul0, t20);
    			append_dev(ul0, li3);
    			append_dev(li3, a7);
    			append_dev(a7, span17);
    			append_dev(span17, span16);
    			append_dev(a7, t22);
    			append_dev(a7, span18);
    			append_dev(span18, i4);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a3)),
    					action_destroyer(active_action = active.call(null, li0, { path: "/", className: "active" })),
    					action_destroyer(link_action_2 = link.call(null, a4)),
    					action_destroyer(active_action_1 = active.call(null, li1, {
    						path: "/Paciente/Index",
    						className: "active"
    					})),
    					action_destroyer(link_action_3 = link.call(null, a6))
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Aside",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Pages\Home\Index.svelte generated by Svelte v3.29.0 */
    const file$2 = "src\\Pages\\Home\\Index.svelte";

    function create_fragment$3(ctx) {
    	let aside;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let section;
    	let div1;
    	let div0;
    	let t2;
    	let h1;
    	let t4;
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
    			div1 = element("div");
    			div0 = element("div");
    			t2 = space();
    			h1 = element("h1");
    			h1.textContent = "Página principal";
    			t4 = text("\r\n      Lorem ipsum dolor sit amet consectetur adipisicing elit. Quis, ipsa. Ab\r\n      recusandae consectetur vel eum unde voluptate quis consequuntur\r\n      reprehenderit omnis, facilis accusamus? Numquam quaerat nihil id amet\r\n      labore dolor laboriosam quidem distinctio architecto natus ipsam quod vel\r\n      illum, iusto libero facere magni at laudantium? Aliquid molestiae\r\n      exercitationem eveniet eos!");
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$2, 11, 6, 247);
    			add_location(h1, file$2, 12, 6, 274);
    			attr_dev(div1, "class", "p-2");
    			add_location(div1, file$2, 10, 4, 222);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$2, 9, 2, 185);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$2, 7, 0, 142);
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
    			append_dev(section, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t2);
    			append_dev(div1, h1);
    			append_dev(div1, t4);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Index", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Aside });
    	return [];
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Pages\Paciente\Index.svelte generated by Svelte v3.29.0 */
    const file$3 = "src\\Pages\\Paciente\\Index.svelte";

    function create_fragment$4(ctx) {
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
    			add_location(div0, file$3, 12, 6, 298);
    			attr_dev(h4, "class", "mt-2");
    			add_location(h4, file$3, 13, 6, 325);
    			attr_dev(input, "type", "search");
    			attr_dev(input, "class", "form-control form-control-appended");
    			attr_dev(input, "placeholder", "Buscar");
    			add_location(input, file$3, 19, 28, 603);
    			attr_dev(span0, "class", "mdi mdi-magnify");
    			add_location(span0, file$3, 22, 36, 852);
    			attr_dev(div1, "class", "input-group-text");
    			add_location(div1, file$3, 21, 32, 784);
    			attr_dev(div2, "class", "input-group-append");
    			add_location(div2, file$3, 20, 28, 718);
    			attr_dev(div3, "class", "input-group input-group-flush mb-3");
    			add_location(div3, file$3, 18, 24, 525);
    			attr_dev(div4, "class", "col-md-5");
    			add_location(div4, file$3, 17, 20, 477);
    			attr_dev(i0, "class", "mdi mdi-account-plus");
    			add_location(i0, file$3, 27, 116, 1143);
    			attr_dev(a0, "href", "/Paciente/Nuevo");
    			attr_dev(a0, "type", "button");
    			attr_dev(a0, "class", "btn  m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			add_location(a0, file$3, 27, 20, 1047);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$3, 16, 16, 438);
    			attr_dev(div6, "class", "col-md-12");
    			add_location(div6, file$3, 15, 12, 397);
    			add_location(th0, file$3, 36, 32, 1527);
    			add_location(th1, file$3, 37, 32, 1577);
    			add_location(th2, file$3, 38, 32, 1624);
    			add_location(th3, file$3, 39, 32, 1671);
    			add_location(tr0, file$3, 35, 28, 1489);
    			add_location(thead, file$3, 34, 24, 1452);
    			attr_dev(span1, "class", "avatar-title rounded-circle ");
    			add_location(span1, file$3, 47, 44, 2087);
    			attr_dev(div7, "class", "avatar avatar-sm");
    			add_location(div7, file$3, 46, 40, 2011);
    			attr_dev(div8, "class", "avatar avatar-sm mr-2 d-block-sm");
    			add_location(div8, file$3, 45, 36, 1923);
    			add_location(span2, file$3, 50, 43, 2238);
    			add_location(td0, file$3, 44, 32, 1881);
    			add_location(td1, file$3, 52, 32, 2343);
    			add_location(td2, file$3, 53, 32, 2393);
    			attr_dev(i1, "class", "mdi-24px mdi mdi-circle-edit-outline");
    			add_location(i1, file$3, 57, 179, 2743);
    			attr_dev(a1, "href", "/Paciente/Editar");
    			attr_dev(a1, "data-toggle", "tooltip");
    			attr_dev(a1, "data-placement", "top");
    			attr_dev(a1, "data-original-title", "Modificar paciente");
    			attr_dev(a1, "class", "icon-table");
    			add_location(a1, file$3, 57, 40, 2604);
    			attr_dev(i2, "class", "mdi-24px mdi mdi-account-card-details");
    			add_location(i2, file$3, 60, 44, 3024);
    			attr_dev(a2, "href", "/Paciente/Perfil");
    			attr_dev(a2, "data-toggle", "tooltip");
    			attr_dev(a2, "data-placement", "top");
    			attr_dev(a2, "data-original-title", "Ver perfil");
    			attr_dev(a2, "class", "icon-table");
    			add_location(a2, file$3, 59, 40, 2847);
    			set_style(div9, "width", "200px");
    			attr_dev(div9, "class", "ml-auto");
    			add_location(div9, file$3, 56, 36, 2519);
    			set_style(td3, "text-align", "right");
    			add_location(td3, file$3, 55, 32, 2450);
    			add_location(tr1, file$3, 43, 28, 1843);
    			attr_dev(tbody, "data-bind", "foreach: pacientes");
    			add_location(tbody, file$3, 42, 24, 1775);
    			attr_dev(table, "class", "table align-td-middle table-card");
    			add_location(table, file$3, 33, 20, 1378);
    			attr_dev(div10, "class", "table-responsive");
    			add_location(div10, file$3, 32, 16, 1326);
    			attr_dev(div11, "class", "col-md-12 m-b-30");
    			add_location(div11, file$3, 31, 12, 1278);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$3, 14, 8, 366);
    			attr_dev(div13, "class", "p-2");
    			add_location(div13, file$3, 11, 4, 273);
    			attr_dev(section, "class", "admin-content p-2");
    			add_location(section, file$3, 10, 2, 232);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$3, 8, 0, 189);
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
    	validate_slots("Index", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Aside, link });
    	return [];
    }

    class Index$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Pages\Paciente\Perfil.svelte generated by Svelte v3.29.0 */
    const file$4 = "src\\Pages\\Paciente\\Perfil.svelte";

    function create_fragment$5(ctx) {
    	let aside;
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
    			attr_dev(span0, "class", "avatar-title rounded-circle");
    			add_location(span0, file$4, 17, 32, 567);
    			attr_dev(div0, "class", "avatar mr-3  avatar-xl");
    			add_location(div0, file$4, 16, 28, 497);
    			add_location(span1, file$4, 20, 50, 767);
    			attr_dev(i0, "class", "mdi mdi-comment-eye");
    			add_location(i0, file$4, 20, 196, 913);
    			attr_dev(a0, "href", "#!");
    			attr_dev(a0, "class", "btn ml-2 btn-primary btn-sm");
    			attr_dev(a0, "data-toggle", "modal");
    			attr_dev(a0, "data-target", "#modalDatosPersonales");
    			add_location(a0, file$4, 20, 91, 808);
    			attr_dev(h50, "class", "mt-0");
    			add_location(h50, file$4, 20, 32, 749);
    			add_location(span2, file$4, 22, 56, 1077);
    			add_location(span3, file$4, 22, 79, 1100);
    			attr_dev(div1, "class", "opacity-75");
    			add_location(div1, file$4, 22, 32, 1053);
    			attr_dev(div2, "class", "media-body m-auto");
    			add_location(div2, file$4, 19, 28, 684);
    			attr_dev(div3, "class", "media");
    			add_location(div3, file$4, 15, 24, 448);
    			attr_dev(div4, "class", "col-md-6 text-white p-b-30");
    			add_location(div4, file$4, 14, 20, 382);
    			attr_dev(i1, "class", "mdi mdi-progress-check");
    			add_location(i1, file$4, 30, 166, 1517);
    			attr_dev(a1, "href", "#!");
    			attr_dev(a1, "type", "button");
    			attr_dev(a1, "class", "btn text-white m-b-30 ml-2 mr-2 ml-3 btn-primary");
    			attr_dev(a1, "data-toggle", "modal");
    			attr_dev(a1, "data-target", "#modalNuevaAtencion");
    			add_location(a1, file$4, 30, 28, 1379);
    			attr_dev(div5, "class", "dropdown");
    			add_location(div5, file$4, 29, 24, 1327);
    			attr_dev(div6, "class", "col-md-6");
    			set_style(div6, "text-align", "right");
    			add_location(div6, file$4, 28, 20, 1253);
    			attr_dev(div7, "class", "row p-b-60 p-t-60");
    			add_location(div7, file$4, 13, 16, 329);
    			attr_dev(div8, "class", "col-md-12");
    			add_location(div8, file$4, 12, 12, 288);
    			attr_dev(div9, "class", "");
    			add_location(div9, file$4, 11, 8, 260);
    			attr_dev(div10, "class", "bg-dark m-b-30");
    			add_location(div10, file$4, 10, 4, 222);
    			attr_dev(i2, "class", "mdi mdi-comment-account-outline mdi-18px");
    			add_location(i2, file$4, 51, 36, 2200);
    			attr_dev(div11, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div11, file$4, 50, 32, 2113);
    			attr_dev(div12, "class", "avatar mr-2 avatar-xs");
    			add_location(div12, file$4, 49, 28, 2044);
    			attr_dev(div13, "class", "card-header");
    			add_location(div13, file$4, 48, 24, 1989);
    			attr_dev(textarea, "class", "form-control mt-2");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "display", "block");
    			attr_dev(textarea, "id", "exampleFormControlTextarea1");
    			textarea.readOnly = "";
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "name", "Comentario");
    			add_location(textarea, file$4, 57, 28, 2494);
    			attr_dev(div14, "class", "form-group col-lg-12");
    			add_location(div14, file$4, 56, 24, 2430);
    			attr_dev(div15, "class", "card m-b-30");
    			add_location(div15, file$4, 47, 20, 1938);
    			attr_dev(i3, "class", "mdi mdi-account-heart mdi-18px");
    			add_location(i3, file$4, 65, 36, 2996);
    			attr_dev(div16, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div16, file$4, 64, 32, 2909);
    			attr_dev(div17, "class", "avatar mr-2 avatar-xs");
    			add_location(div17, file$4, 63, 28, 2840);
    			attr_dev(div18, "class", "card-header");
    			add_location(div18, file$4, 62, 24, 2785);
    			attr_dev(i4, "class", "icon mdi  mdi-dots-vertical");
    			add_location(i4, file$4, 72, 112, 3420);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "data-toggle", "dropdown");
    			attr_dev(a2, "aria-haspopup", "true");
    			attr_dev(a2, "aria-expanded", "false");
    			add_location(a2, file$4, 72, 32, 3340);
    			attr_dev(button0, "class", "dropdown-item");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$4, 75, 36, 3589);
    			attr_dev(button1, "class", "dropdown-item");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$4, 76, 36, 3686);
    			attr_dev(button2, "class", "dropdown-item");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file$4, 77, 36, 3791);
    			attr_dev(div19, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div19, file$4, 74, 32, 3504);
    			attr_dev(div20, "class", "dropdown");
    			add_location(div20, file$4, 71, 28, 3284);
    			attr_dev(div21, "class", "card-controls");
    			add_location(div21, file$4, 70, 24, 3227);
    			attr_dev(i5, "class", "mdi mdi-speedometer mdi-18px");
    			add_location(i5, file$4, 87, 40, 4271);
    			attr_dev(div22, "class", "col-lg-9 col-sm-10");
    			add_location(div22, file$4, 86, 36, 4197);
    			add_location(p0, file$4, 90, 40, 4475);
    			attr_dev(div23, "class", "col-lg-3 col-sm-2");
    			add_location(div23, file$4, 89, 36, 4402);
    			attr_dev(div24, "class", "row");
    			add_location(div24, file$4, 85, 32, 4142);
    			attr_dev(i6, "class", "mdi mdi-thermometer mdi-18px");
    			add_location(i6, file$4, 96, 40, 4734);
    			attr_dev(div25, "class", "col-lg-9 col-sm-10");
    			add_location(div25, file$4, 95, 36, 4660);
    			add_location(p1, file$4, 99, 40, 4945);
    			attr_dev(div26, "class", "col-lg-3 col-sm-2");
    			add_location(div26, file$4, 98, 36, 4872);
    			attr_dev(div27, "class", "row");
    			add_location(div27, file$4, 94, 32, 4605);
    			attr_dev(i7, "class", "mdi mdi-chart-line mdi-18px");
    			add_location(i7, file$4, 104, 40, 5202);
    			attr_dev(div28, "class", "col-lg-9 col-sm-10");
    			add_location(div28, file$4, 103, 36, 5128);
    			add_location(p2, file$4, 107, 40, 5424);
    			attr_dev(div29, "class", "col-lg-3 col-sm-2");
    			add_location(div29, file$4, 106, 36, 5351);
    			attr_dev(div30, "class", "row");
    			add_location(div30, file$4, 102, 32, 5073);
    			attr_dev(i8, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i8, file$4, 112, 40, 5679);
    			attr_dev(div31, "class", "col-lg-9 col-sm-10");
    			add_location(div31, file$4, 111, 36, 5605);
    			add_location(p3, file$4, 115, 40, 5898);
    			attr_dev(div32, "class", "col-lg-3 col-sm-2");
    			add_location(div32, file$4, 114, 36, 5825);
    			attr_dev(div33, "class", "row");
    			add_location(div33, file$4, 110, 32, 5550);
    			attr_dev(i9, "class", "mdi mdi-heart-pulse mdi-18px");
    			add_location(i9, file$4, 120, 40, 6153);
    			attr_dev(div34, "class", "col-lg-9 col-sm-10");
    			add_location(div34, file$4, 119, 36, 6079);
    			add_location(p4, file$4, 123, 40, 6378);
    			attr_dev(div35, "class", "col-lg-3 col-sm-2");
    			add_location(div35, file$4, 122, 36, 6305);
    			attr_dev(div36, "class", "row");
    			add_location(div36, file$4, 118, 32, 6024);
    			attr_dev(div37, "class", "list-group-item ");
    			add_location(div37, file$4, 83, 28, 4076);
    			attr_dev(div38, "class", "list-group list  list-group-flush");
    			add_location(div38, file$4, 81, 24, 3997);
    			attr_dev(div39, "class", "card m-b-30");
    			add_location(div39, file$4, 61, 20, 2734);
    			attr_dev(h51, "class", "m-b-0");
    			add_location(h51, file$4, 134, 28, 6751);
    			attr_dev(p5, "class", "m-b-0 mt-2 text-muted");
    			add_location(p5, file$4, 137, 28, 6889);
    			attr_dev(div40, "class", "card-header");
    			add_location(div40, file$4, 133, 24, 6696);
    			attr_dev(i10, "class", " mdi mdi-progress-upload");
    			add_location(i10, file$4, 147, 40, 7397);
    			attr_dev(h1, "class", "display-4");
    			add_location(h1, file$4, 146, 36, 7333);
    			add_location(br0, file$4, 149, 77, 7559);
    			attr_dev(span4, "class", "note needsclick");
    			add_location(span4, file$4, 150, 36, 7601);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "btn btn-lg btn-primary");
    			add_location(a3, file$4, 153, 40, 7860);
    			attr_dev(div41, "class", "p-t-5");
    			add_location(div41, file$4, 152, 36, 7799);
    			attr_dev(div42, "class", "dz-message");
    			add_location(div42, file$4, 145, 32, 7271);
    			attr_dev(form, "class", "dropzone dz-clickable");
    			attr_dev(form, "action", "/");
    			add_location(form, file$4, 144, 28, 7190);
    			add_location(br1, file$4, 157, 35, 8044);
    			attr_dev(i11, "class", "mdi mdi-24px mdi-file-pdf");
    			add_location(i11, file$4, 164, 86, 8433);
    			attr_dev(div43, "class", "avatar-title bg-dark rounded");
    			add_location(div43, file$4, 164, 44, 8391);
    			attr_dev(div44, "class", "avatar avatar-sm ");
    			add_location(div44, file$4, 163, 40, 8314);
    			attr_dev(div45, "class", "m-r-20");
    			add_location(div45, file$4, 162, 36, 8252);
    			add_location(div46, file$4, 168, 40, 8666);
    			attr_dev(div47, "class", "text-muted");
    			add_location(div47, file$4, 169, 40, 8731);
    			attr_dev(div48, "class", "");
    			add_location(div48, file$4, 167, 36, 8610);
    			attr_dev(i12, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i12, file$4, 174, 124, 9063);
    			attr_dev(a4, "href", "#!");
    			attr_dev(a4, "data-toggle", "dropdown");
    			attr_dev(a4, "aria-haspopup", "true");
    			attr_dev(a4, "aria-expanded", "false");
    			add_location(a4, file$4, 174, 44, 8983);
    			attr_dev(button3, "class", "dropdown-item");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file$4, 178, 48, 9305);
    			attr_dev(button4, "class", "dropdown-item");
    			attr_dev(button4, "type", "button");
    			add_location(button4, file$4, 179, 48, 9414);
    			attr_dev(button5, "class", "dropdown-item");
    			attr_dev(button5, "type", "button");
    			add_location(button5, file$4, 180, 48, 9531);
    			attr_dev(div49, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div49, file$4, 177, 44, 9208);
    			attr_dev(div50, "class", "dropdown");
    			add_location(div50, file$4, 173, 40, 8915);
    			attr_dev(div51, "class", "ml-auto");
    			add_location(div51, file$4, 172, 36, 8852);
    			attr_dev(div52, "class", "list-group-item d-flex  align-items-center");
    			add_location(div52, file$4, 161, 32, 8158);
    			attr_dev(i13, "class", "mdi mdi-24px mdi-file-document-box");
    			add_location(i13, file$4, 189, 86, 10098);
    			attr_dev(div53, "class", "avatar-title bg-dark rounded");
    			add_location(div53, file$4, 189, 44, 10056);
    			attr_dev(div54, "class", "avatar avatar-sm ");
    			add_location(div54, file$4, 188, 40, 9979);
    			attr_dev(div55, "class", "m-r-20");
    			add_location(div55, file$4, 187, 36, 9917);
    			add_location(div56, file$4, 193, 40, 10340);
    			attr_dev(div57, "class", "text-muted");
    			add_location(div57, file$4, 194, 40, 10409);
    			attr_dev(div58, "class", "");
    			add_location(div58, file$4, 192, 36, 10284);
    			attr_dev(i14, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i14, file$4, 199, 124, 10738);
    			attr_dev(a5, "href", "#!");
    			attr_dev(a5, "data-toggle", "dropdown");
    			attr_dev(a5, "aria-haspopup", "true");
    			attr_dev(a5, "aria-expanded", "false");
    			add_location(a5, file$4, 199, 44, 10658);
    			attr_dev(button6, "class", "dropdown-item");
    			attr_dev(button6, "type", "button");
    			add_location(button6, file$4, 203, 48, 10980);
    			attr_dev(button7, "class", "dropdown-item");
    			attr_dev(button7, "type", "button");
    			add_location(button7, file$4, 204, 48, 11089);
    			attr_dev(button8, "class", "dropdown-item");
    			attr_dev(button8, "type", "button");
    			add_location(button8, file$4, 205, 48, 11206);
    			attr_dev(div59, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div59, file$4, 202, 44, 10883);
    			attr_dev(div60, "class", "dropdown");
    			add_location(div60, file$4, 198, 40, 10590);
    			attr_dev(div61, "class", "ml-auto");
    			add_location(div61, file$4, 197, 36, 10527);
    			attr_dev(div62, "class", "list-group-item d-flex  align-items-center");
    			add_location(div62, file$4, 186, 32, 9823);
    			attr_dev(i15, "class", "mdi mdi-24px mdi-code-braces");
    			add_location(i15, file$4, 215, 83, 11847);
    			attr_dev(div63, "class", "avatar-title  rounded");
    			add_location(div63, file$4, 215, 48, 11812);
    			attr_dev(div64, "class", "avatar avatar-sm ");
    			add_location(div64, file$4, 214, 44, 11731);
    			attr_dev(div65, "class", "avatar avatar-sm ");
    			add_location(div65, file$4, 213, 40, 11654);
    			attr_dev(div66, "class", "m-r-20");
    			add_location(div66, file$4, 212, 36, 11592);
    			add_location(div67, file$4, 220, 40, 12135);
    			attr_dev(div68, "class", "text-muted");
    			add_location(div68, file$4, 221, 40, 12201);
    			attr_dev(div69, "class", "");
    			add_location(div69, file$4, 219, 36, 12079);
    			attr_dev(i16, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i16, file$4, 226, 124, 12531);
    			attr_dev(a6, "href", "#!");
    			attr_dev(a6, "data-toggle", "dropdown");
    			attr_dev(a6, "aria-haspopup", "true");
    			attr_dev(a6, "aria-expanded", "false");
    			add_location(a6, file$4, 226, 44, 12451);
    			attr_dev(button9, "class", "dropdown-item");
    			attr_dev(button9, "type", "button");
    			add_location(button9, file$4, 230, 48, 12773);
    			attr_dev(button10, "class", "dropdown-item");
    			attr_dev(button10, "type", "button");
    			add_location(button10, file$4, 231, 48, 12882);
    			attr_dev(button11, "class", "dropdown-item");
    			attr_dev(button11, "type", "button");
    			add_location(button11, file$4, 232, 48, 12999);
    			attr_dev(div70, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div70, file$4, 229, 44, 12676);
    			attr_dev(div71, "class", "dropdown");
    			add_location(div71, file$4, 225, 40, 12383);
    			attr_dev(div72, "class", "ml-auto");
    			add_location(div72, file$4, 224, 36, 12320);
    			attr_dev(div73, "class", "list-group-item d-flex  align-items-center");
    			add_location(div73, file$4, 211, 32, 11498);
    			attr_dev(i17, "class", "mdi mdi-24px mdi-file-excel");
    			add_location(i17, file$4, 242, 91, 13648);
    			attr_dev(div74, "class", "avatar-title bg-green rounded");
    			add_location(div74, file$4, 242, 48, 13605);
    			attr_dev(div75, "class", "avatar avatar-sm ");
    			add_location(div75, file$4, 241, 44, 13524);
    			attr_dev(div76, "class", "avatar avatar-sm ");
    			add_location(div76, file$4, 240, 40, 13447);
    			attr_dev(div77, "class", "m-r-20");
    			add_location(div77, file$4, 239, 36, 13385);
    			add_location(div78, file$4, 247, 40, 13935);
    			attr_dev(div79, "class", "text-muted");
    			add_location(div79, file$4, 248, 40, 14005);
    			attr_dev(div80, "class", "");
    			add_location(div80, file$4, 246, 36, 13879);
    			attr_dev(i18, "class", "mdi  mdi-dots-vertical mdi-18px");
    			add_location(i18, file$4, 253, 124, 14334);
    			attr_dev(a7, "href", "#!");
    			attr_dev(a7, "data-toggle", "dropdown");
    			attr_dev(a7, "aria-haspopup", "true");
    			attr_dev(a7, "aria-expanded", "false");
    			add_location(a7, file$4, 253, 44, 14254);
    			attr_dev(button12, "class", "dropdown-item");
    			attr_dev(button12, "type", "button");
    			add_location(button12, file$4, 257, 48, 14576);
    			attr_dev(button13, "class", "dropdown-item");
    			attr_dev(button13, "type", "button");
    			add_location(button13, file$4, 258, 48, 14685);
    			attr_dev(button14, "class", "dropdown-item");
    			attr_dev(button14, "type", "button");
    			add_location(button14, file$4, 259, 48, 14802);
    			attr_dev(div81, "class", "dropdown-menu dropdown-menu-right");
    			add_location(div81, file$4, 256, 44, 14479);
    			attr_dev(div82, "class", "dropdown");
    			add_location(div82, file$4, 252, 40, 14186);
    			attr_dev(div83, "class", "ml-auto");
    			add_location(div83, file$4, 251, 36, 14123);
    			attr_dev(div84, "class", "list-group-item d-flex  align-items-center");
    			add_location(div84, file$4, 238, 32, 13291);
    			attr_dev(div85, "class", "list-group list-group-flush ");
    			add_location(div85, file$4, 159, 28, 8080);
    			attr_dev(div86, "class", "card-body");
    			add_location(div86, file$4, 141, 24, 7133);
    			attr_dev(div87, "class", "card m-b-30 d-none");
    			add_location(div87, file$4, 132, 20, 6638);
    			attr_dev(div88, "class", "col-lg-3");
    			add_location(div88, file$4, 45, 16, 1892);
    			attr_dev(i19, "class", "mdi mdi-history mdi-18px");
    			add_location(i19, file$4, 276, 36, 15509);
    			attr_dev(div89, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div89, file$4, 275, 32, 15422);
    			attr_dev(div90, "class", "avatar mr-2 avatar-xs");
    			add_location(div90, file$4, 274, 28, 15353);
    			attr_dev(div91, "class", "card-header");
    			add_location(div91, file$4, 273, 24, 15298);
    			add_location(h60, file$4, 284, 36, 15927);
    			add_location(hr0, file$4, 285, 36, 15982);
    			attr_dev(div92, "class", "alert alert-danger d-none");
    			attr_dev(div92, "role", "alert");
    			add_location(div92, file$4, 286, 36, 16024);
    			add_location(strong0, file$4, 288, 40, 16201);
    			attr_dev(div93, "class", "alert alert-light d-block");
    			add_location(div93, file$4, 287, 36, 16120);
    			attr_dev(div94, "class", "prueba col-md-12");
    			add_location(div94, file$4, 283, 32, 15859);
    			add_location(h61, file$4, 294, 40, 16488);
    			add_location(hr1, file$4, 295, 40, 16564);
    			attr_dev(strong1, "class", "text-muted");
    			add_location(strong1, file$4, 298, 48, 16757);
    			add_location(div95, file$4, 297, 44, 16702);
    			attr_dev(div96, "class", "alert alert-success");
    			attr_dev(div96, "role", "alert");
    			add_location(div96, file$4, 296, 40, 16610);
    			add_location(h62, file$4, 303, 40, 17117);
    			add_location(hr2, file$4, 304, 40, 17195);
    			attr_dev(strong2, "class", "text-muted");
    			add_location(strong2, file$4, 307, 48, 17388);
    			add_location(div97, file$4, 306, 44, 17333);
    			attr_dev(div98, "class", "alert alert-success");
    			attr_dev(div98, "role", "alert");
    			add_location(div98, file$4, 305, 40, 17241);
    			add_location(h63, file$4, 312, 40, 17748);
    			add_location(hr3, file$4, 313, 40, 17825);
    			attr_dev(strong3, "class", "text-muted");
    			add_location(strong3, file$4, 316, 48, 18018);
    			add_location(div99, file$4, 315, 44, 17963);
    			attr_dev(div100, "class", "alert alert-success");
    			attr_dev(div100, "role", "alert");
    			add_location(div100, file$4, 314, 40, 17871);
    			attr_dev(div101, "class", "prueba col-md-12");
    			add_location(div101, file$4, 293, 36, 16416);
    			add_location(div102, file$4, 292, 32, 16373);
    			attr_dev(div103, "class", "accordion ");
    			attr_dev(div103, "id", "accordionExample3");
    			add_location(div103, file$4, 282, 28, 15778);
    			attr_dev(div104, "class", "card-body");
    			add_location(div104, file$4, 281, 24, 15725);
    			attr_dev(div105, "class", "card m-b-30");
    			add_location(div105, file$4, 272, 20, 15247);
    			attr_dev(i20, "class", "mdi mdi-comment-account-outline mdi-18px");
    			add_location(i20, file$4, 331, 36, 18774);
    			attr_dev(div106, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div106, file$4, 330, 32, 18687);
    			attr_dev(div107, "class", "avatar mr-2 avatar-xs");
    			add_location(div107, file$4, 329, 28, 18618);
    			attr_dev(div108, "class", " card-header");
    			add_location(div108, file$4, 328, 24, 18562);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "name", "");
    			attr_dev(input, "id", "");
    			attr_dev(input, "data-toggle", "dropdown");
    			attr_dev(input, "aria-haspopup", "true");
    			attr_dev(input, "aria-expanded", "false");
    			add_location(input, file$4, 339, 32, 19142);
    			attr_dev(a8, "href", "#!");
    			add_location(a8, file$4, 343, 44, 19509);
    			add_location(li0, file$4, 342, 40, 19459);
    			attr_dev(a9, "href", "#!");
    			add_location(a9, file$4, 346, 44, 19674);
    			add_location(li1, file$4, 345, 40, 19624);
    			attr_dev(div109, "class", "contenidoLista");
    			add_location(div109, file$4, 341, 36, 19389);
    			attr_dev(i21, "class", "mdi mdi-plus");
    			add_location(i21, file$4, 350, 53, 19905);
    			attr_dev(a10, "href", "#!");
    			add_location(a10, file$4, 350, 40, 19892);
    			attr_dev(li2, "class", "defecto");
    			add_location(li2, file$4, 349, 36, 19830);
    			attr_dev(ul, "class", "lista-buscador dropdown-menu");
    			attr_dev(ul, "id", "buscador");
    			add_location(ul, file$4, 340, 32, 19296);
    			attr_dev(div110, "class", "form-group buscardor dropdown");
    			add_location(div110, file$4, 338, 28, 19065);
    			attr_dev(span5, "aria-hidden", "true");
    			add_location(span5, file$4, 357, 36, 20370);
    			attr_dev(button15, "type", "button");
    			attr_dev(button15, "class", "close");
    			attr_dev(button15, "data-dismiss", "alert");
    			attr_dev(button15, "aria-label", "Close");
    			add_location(button15, file$4, 356, 32, 20256);
    			attr_dev(div111, "class", "alert alert-secondary alert-dismissible fade show");
    			attr_dev(div111, "role", "alert");
    			add_location(div111, file$4, 354, 28, 20105);
    			attr_dev(div112, "class", "col-12");
    			add_location(div112, file$4, 337, 24, 19015);
    			attr_dev(div113, "class", "card m-b-30 d-none");
    			add_location(div113, file$4, 327, 20, 18504);
    			attr_dev(div114, "class", "col-md-6 ");
    			add_location(div114, file$4, 271, 16, 15202);
    			attr_dev(i22, "class", "mdi mdi-progress-check mdi-18px");
    			add_location(i22, file$4, 428, 36, 24054);
    			attr_dev(div115, "class", "avatar-title bg-dark rounded-circle");
    			add_location(div115, file$4, 427, 32, 23967);
    			attr_dev(div116, "class", "avatar mr-2 avatar-xs");
    			add_location(div116, file$4, 426, 28, 23898);
    			attr_dev(div117, "class", "card-header");
    			add_location(div117, file$4, 425, 24, 23843);
    			attr_dev(div118, "class", "card m-b-30");
    			add_location(div118, file$4, 424, 20, 23792);
    			add_location(strong4, file$4, 440, 40, 24637);
    			attr_dev(i23, "class", "mdi mdi-checkbox-blank-circle text-secondary");
    			add_location(i23, file$4, 441, 40, 24704);
    			add_location(div119, file$4, 442, 40, 24806);
    			add_location(div120, file$4, 443, 40, 24873);
    			attr_dev(div121, "class", "content");
    			add_location(div121, file$4, 439, 36, 24574);
    			attr_dev(div122, "class", "d-flex");
    			add_location(div122, file$4, 438, 32, 24516);
    			attr_dev(i24, "class", "mdi mdi-open-in-new");
    			add_location(i24, file$4, 447, 36, 25192);
    			attr_dev(a11, "class", "close");
    			attr_dev(a11, "data-toggle", "tooltip");
    			attr_dev(a11, "data-placement", "top");
    			attr_dev(a11, "data-original-title", "Ir");
    			attr_dev(a11, "href", "/AtencionMedica/Trabajar/1#resumen-page");
    			add_location(a11, file$4, 446, 32, 25022);
    			attr_dev(div123, "class", "alert alert-border-success  alert-dismissible fade show");
    			attr_dev(div123, "role", "alert");
    			add_location(div123, file$4, 437, 28, 24400);
    			add_location(div124, file$4, 436, 24, 24365);
    			attr_dev(div125, "class", "atenciones-vnc");
    			add_location(div125, file$4, 435, 20, 24311);
    			attr_dev(div126, "class", "col-md-3");
    			add_location(div126, file$4, 366, 16, 20634);
    			attr_dev(div127, "class", "row");
    			add_location(div127, file$4, 42, 12, 1853);
    			attr_dev(div128, "class", "col-md-12");
    			add_location(div128, file$4, 41, 8, 1816);
    			attr_dev(div129, "class", "pull-up");
    			add_location(div129, file$4, 40, 4, 1785);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$4, 9, 2, 185);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$4, 7, 0, 142);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Perfil", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Perfil> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Aside });
    	return [];
    }

    class Perfil extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Perfil",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Pages\Paciente\Editar.svelte generated by Svelte v3.29.0 */
    const file$5 = "src\\Pages\\Paciente\\Editar.svelte";

    function create_fragment$6(ctx) {
    	let aside;
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
    			add_location(h50, file$5, 13, 4, 354);
    			attr_dev(div0, "class", "card-header");
    			add_location(div0, file$5, 12, 0, 323);
    			attr_dev(input0, "type", "hidden");
    			attr_dev(input0, "name", "idPaciente");
    			input0.value = "";
    			add_location(input0, file$5, 23, 16, 579);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$5, 26, 24, 748);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "name", "Cedula");
    			attr_dev(input1, "id", "txtCedula");
    			attr_dev(input1, "pattern", "^[0-9]+$");
    			attr_dev(input1, "maxlength", "11");
    			add_location(input1, file$5, 27, 24, 814);
    			attr_dev(div1, "class", "form-group col-md-6");
    			add_location(div1, file$5, 25, 20, 689);
    			attr_dev(div2, "class", "form-row");
    			add_location(div2, file$5, 24, 16, 645);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$5, 32, 24, 1091);
    			attr_dev(input2, "type", "name");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "name", "Nombres");
    			attr_dev(input2, "max", "100");
    			input2.required = "";
    			add_location(input2, file$5, 33, 24, 1148);
    			attr_dev(div3, "class", "form-group col-md-12");
    			add_location(div3, file$5, 31, 20, 1031);
    			attr_dev(div4, "class", "form-row");
    			add_location(div4, file$5, 30, 16, 987);
    			attr_dev(label2, "for", "");
    			add_location(label2, file$5, 38, 24, 1398);
    			attr_dev(input3, "type", "last-name");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "name", "PrimerApellido");
    			attr_dev(input3, "max", "100");
    			input3.required = "";
    			add_location(input3, file$5, 39, 24, 1461);
    			attr_dev(div5, "class", "form-group col-md-6");
    			add_location(div5, file$5, 37, 20, 1339);
    			attr_dev(label3, "for", "");
    			add_location(label3, file$5, 42, 24, 1659);
    			attr_dev(input4, "type", "last-name");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "name", "SegundoApellido");
    			attr_dev(input4, "id", "txtApellido");
    			attr_dev(input4, "max", "100");
    			add_location(input4, file$5, 43, 24, 1723);
    			attr_dev(div6, "class", "form-group col-md-6");
    			add_location(div6, file$5, 41, 20, 1600);
    			attr_dev(div7, "class", "form-row");
    			add_location(div7, file$5, 36, 16, 1295);
    			attr_dev(label4, "for", "");
    			add_location(label4, file$5, 49, 24, 1993);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$5, 50, 89, 2110);
    			option1.__value = "M";
    			option1.value = option1.__value;
    			add_location(option1, file$5, 50, 130, 2151);
    			option2.__value = "F";
    			option2.value = option2.__value;
    			add_location(option2, file$5, 50, 166, 2187);
    			attr_dev(select0, "class", "form-control");
    			attr_dev(select0, "name", "Sexo");
    			attr_dev(select0, "id", "slSexo");
    			select0.required = "";
    			add_location(select0, file$5, 50, 24, 2045);
    			attr_dev(div8, "class", "form-group col-md-6");
    			add_location(div8, file$5, 48, 20, 1934);
    			add_location(label5, file$5, 55, 24, 2368);
    			attr_dev(input5, "type", "date");
    			attr_dev(input5, "name", "FechaNacimiento");
    			attr_dev(input5, "class", "form-control");
    			attr_dev(input5, "id", "txtFechaNacimiento");
    			attr_dev(input5, "placeholder", "00/00/0000");
    			attr_dev(input5, "autocomplete", "off");
    			input5.required = "";
    			add_location(input5, file$5, 56, 24, 2428);
    			attr_dev(div9, "class", "col-md-6 form-group");
    			add_location(div9, file$5, 54, 20, 2309);
    			attr_dev(div10, "class", "form-row");
    			add_location(div10, file$5, 47, 16, 1890);
    			attr_dev(label6, "for", "");
    			add_location(label6, file$5, 63, 24, 2748);
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
    			add_location(input6, file$5, 64, 24, 2804);
    			attr_dev(div11, "class", "form-group col-md-6");
    			add_location(div11, file$5, 62, 20, 2689);
    			attr_dev(label7, "for", "");
    			add_location(label7, file$5, 67, 24, 3118);
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
    			add_location(input7, file$5, 68, 24, 3173);
    			attr_dev(div12, "class", "form-group col-md-6");
    			add_location(div12, file$5, 66, 20, 3059);
    			attr_dev(div13, "class", "form-row");
    			add_location(div13, file$5, 61, 16, 2645);
    			attr_dev(label8, "for", "");
    			add_location(label8, file$5, 74, 24, 3551);
    			attr_dev(input8, "type", "email");
    			attr_dev(input8, "class", "form-control");
    			attr_dev(input8, "placeholder", "prueba@correo.com");
    			attr_dev(input8, "name", "Correo");
    			attr_dev(input8, "id", "txtCorreo");
    			add_location(input8, file$5, 75, 24, 3604);
    			attr_dev(div14, "class", "form-group col-md-6");
    			add_location(div14, file$5, 73, 20, 3492);
    			attr_dev(label9, "for", "");
    			add_location(label9, file$5, 78, 24, 3815);
    			option3.__value = "";
    			option3.value = option3.__value;
    			add_location(option3, file$5, 80, 28, 3984);
    			option4.__value = "S";
    			option4.value = option4.__value;
    			add_location(option4, file$5, 81, 28, 4056);
    			option5.__value = "C";
    			option5.value = option5.__value;
    			add_location(option5, file$5, 82, 28, 4120);
    			option6.__value = "D";
    			option6.value = option6.__value;
    			add_location(option6, file$5, 83, 28, 4183);
    			option7.__value = "UL";
    			option7.value = option7.__value;
    			add_location(option7, file$5, 84, 28, 4250);
    			attr_dev(select1, "class", "form-control");
    			attr_dev(select1, "name", "EstadoCivil");
    			attr_dev(select1, "id", "slEstadoCivil");
    			select1.required = "";
    			add_location(select1, file$5, 79, 24, 3875);
    			attr_dev(div15, "class", "form-group col-md-6");
    			add_location(div15, file$5, 77, 20, 3756);
    			attr_dev(div16, "class", "form-row");
    			add_location(div16, file$5, 72, 16, 3448);
    			add_location(br0, file$5, 88, 16, 4394);
    			set_style(h51, "margin-bottom", "0");
    			add_location(h51, file$5, 89, 16, 4416);
    			add_location(br1, file$5, 89, 71, 4471);
    			set_style(hr0, "margin-top", "0");
    			add_location(hr0, file$5, 90, 16, 4493);
    			attr_dev(label10, "class", "font-secondary");
    			add_location(label10, file$5, 93, 24, 4641);
    			option8.__value = "";
    			option8.value = option8.__value;
    			add_location(option8, file$5, 95, 28, 4873);
    			option9.__value = "3";
    			option9.value = option9.__value;
    			attr_dev(option9, "data-select2-id", "39");
    			add_location(option9, file$5, 96, 28, 4951);
    			option10.__value = "4";
    			option10.value = option10.__value;
    			attr_dev(option10, "data-select2-id", "40");
    			add_location(option10, file$5, 97, 28, 5038);
    			option11.__value = "5";
    			option11.value = option11.__value;
    			attr_dev(option11, "data-select2-id", "41");
    			add_location(option11, file$5, 98, 28, 5129);
    			option12.__value = "6";
    			option12.value = option12.__value;
    			attr_dev(option12, "data-select2-id", "42");
    			add_location(option12, file$5, 99, 28, 5219);
    			option13.__value = "7";
    			option13.value = option13.__value;
    			attr_dev(option13, "data-select2-id", "43");
    			add_location(option13, file$5, 100, 28, 5311);
    			option14.__value = "8";
    			option14.value = option14.__value;
    			attr_dev(option14, "data-select2-id", "44");
    			add_location(option14, file$5, 101, 28, 5405);
    			option15.__value = "9";
    			option15.value = option15.__value;
    			attr_dev(option15, "data-select2-id", "45");
    			add_location(option15, file$5, 102, 28, 5496);
    			option16.__value = "10";
    			option16.value = option16.__value;
    			attr_dev(option16, "data-select2-id", "46");
    			add_location(option16, file$5, 103, 28, 5585);
    			option17.__value = "11";
    			option17.value = option17.__value;
    			attr_dev(option17, "data-select2-id", "47");
    			add_location(option17, file$5, 104, 28, 5681);
    			option18.__value = "12";
    			option18.value = option18.__value;
    			attr_dev(option18, "data-select2-id", "48");
    			add_location(option18, file$5, 105, 28, 5774);
    			option19.__value = "13";
    			option19.value = option19.__value;
    			attr_dev(option19, "data-select2-id", "49");
    			add_location(option19, file$5, 106, 28, 5860);
    			option20.__value = "14";
    			option20.value = option20.__value;
    			attr_dev(option20, "data-select2-id", "50");
    			add_location(option20, file$5, 107, 28, 5952);
    			option21.__value = "15";
    			option21.value = option21.__value;
    			attr_dev(option21, "data-select2-id", "51");
    			add_location(option21, file$5, 108, 28, 6059);
    			option22.__value = "16";
    			option22.value = option22.__value;
    			attr_dev(option22, "data-select2-id", "52");
    			add_location(option22, file$5, 109, 28, 6150);
    			option23.__value = "17";
    			option23.value = option23.__value;
    			attr_dev(option23, "data-select2-id", "53");
    			add_location(option23, file$5, 110, 28, 6242);
    			option24.__value = "18";
    			option24.value = option24.__value;
    			attr_dev(option24, "data-select2-id", "54");
    			add_location(option24, file$5, 111, 28, 6341);
    			option25.__value = "19";
    			option25.value = option25.__value;
    			attr_dev(option25, "data-select2-id", "55");
    			add_location(option25, file$5, 112, 28, 6426);
    			option26.__value = "20";
    			option26.value = option26.__value;
    			attr_dev(option26, "data-select2-id", "56");
    			add_location(option26, file$5, 113, 28, 6520);
    			option27.__value = "21";
    			option27.value = option27.__value;
    			attr_dev(option27, "data-select2-id", "57");
    			add_location(option27, file$5, 114, 28, 6607);
    			option28.__value = "22";
    			option28.value = option28.__value;
    			attr_dev(option28, "data-select2-id", "58");
    			add_location(option28, file$5, 115, 28, 6697);
    			option29.__value = "23";
    			option29.value = option29.__value;
    			attr_dev(option29, "data-select2-id", "59");
    			add_location(option29, file$5, 116, 28, 6785);
    			option30.__value = "24";
    			option30.value = option30.__value;
    			attr_dev(option30, "data-select2-id", "60");
    			add_location(option30, file$5, 117, 28, 6869);
    			option31.__value = "25";
    			option31.value = option31.__value;
    			attr_dev(option31, "data-select2-id", "61");
    			add_location(option31, file$5, 118, 28, 6963);
    			option32.__value = "26";
    			option32.value = option32.__value;
    			attr_dev(option32, "data-select2-id", "62");
    			add_location(option32, file$5, 119, 28, 7049);
    			option33.__value = "27";
    			option33.value = option33.__value;
    			attr_dev(option33, "data-select2-id", "63");
    			add_location(option33, file$5, 120, 28, 7144);
    			option34.__value = "28";
    			option34.value = option34.__value;
    			attr_dev(option34, "data-select2-id", "64");
    			add_location(option34, file$5, 121, 28, 7231);
    			option35.__value = "29";
    			option35.value = option35.__value;
    			attr_dev(option35, "data-select2-id", "65");
    			add_location(option35, file$5, 122, 28, 7319);
    			option36.__value = "30";
    			option36.value = option36.__value;
    			attr_dev(option36, "data-select2-id", "66");
    			add_location(option36, file$5, 123, 28, 7417);
    			option37.__value = "31";
    			option37.value = option37.__value;
    			attr_dev(option37, "data-select2-id", "67");
    			add_location(option37, file$5, 124, 28, 7507);
    			option38.__value = "32";
    			option38.value = option38.__value;
    			attr_dev(option38, "data-select2-id", "68");
    			add_location(option38, file$5, 125, 28, 7603);
    			option39.__value = "33";
    			option39.value = option39.__value;
    			attr_dev(option39, "data-select2-id", "69");
    			add_location(option39, file$5, 126, 28, 7692);
    			option40.__value = "34";
    			option40.value = option40.__value;
    			attr_dev(option40, "data-select2-id", "70");
    			add_location(option40, file$5, 127, 28, 7781);
    			option41.__value = "35";
    			option41.value = option41.__value;
    			attr_dev(option41, "data-select2-id", "71");
    			add_location(option41, file$5, 128, 28, 7867);
    			option42.__value = "36";
    			option42.value = option42.__value;
    			attr_dev(option42, "data-select2-id", "72");
    			add_location(option42, file$5, 129, 28, 7950);
    			option43.__value = "37";
    			option43.value = option43.__value;
    			attr_dev(option43, "data-select2-id", "73");
    			add_location(option43, file$5, 130, 28, 8045);
    			option44.__value = "38";
    			option44.value = option44.__value;
    			attr_dev(option44, "data-select2-id", "74");
    			add_location(option44, file$5, 131, 28, 8128);
    			option45.__value = "39";
    			option45.value = option45.__value;
    			attr_dev(option45, "data-select2-id", "75");
    			add_location(option45, file$5, 132, 28, 8228);
    			option46.__value = "40";
    			option46.value = option46.__value;
    			attr_dev(option46, "data-select2-id", "76");
    			add_location(option46, file$5, 133, 28, 8337);
    			option47.__value = "41";
    			option47.value = option47.__value;
    			attr_dev(option47, "data-select2-id", "77");
    			add_location(option47, file$5, 134, 28, 8424);
    			option48.__value = "42";
    			option48.value = option48.__value;
    			attr_dev(option48, "data-select2-id", "78");
    			add_location(option48, file$5, 135, 28, 8512);
    			option49.__value = "43";
    			option49.value = option49.__value;
    			attr_dev(option49, "data-select2-id", "79");
    			add_location(option49, file$5, 136, 28, 8609);
    			option50.__value = "44";
    			option50.value = option50.__value;
    			attr_dev(option50, "data-select2-id", "80");
    			add_location(option50, file$5, 137, 28, 8699);
    			option51.__value = "45";
    			option51.value = option51.__value;
    			attr_dev(option51, "data-select2-id", "81");
    			add_location(option51, file$5, 138, 28, 8800);
    			option52.__value = "46";
    			option52.value = option52.__value;
    			attr_dev(option52, "data-select2-id", "82");
    			add_location(option52, file$5, 139, 28, 8885);
    			option53.__value = "47";
    			option53.value = option53.__value;
    			attr_dev(option53, "data-select2-id", "83");
    			add_location(option53, file$5, 140, 28, 8973);
    			option54.__value = "48";
    			option54.value = option54.__value;
    			attr_dev(option54, "data-select2-id", "84");
    			add_location(option54, file$5, 141, 28, 9068);
    			option55.__value = "49";
    			option55.value = option55.__value;
    			attr_dev(option55, "data-select2-id", "85");
    			add_location(option55, file$5, 142, 28, 9163);
    			option56.__value = "50";
    			option56.value = option56.__value;
    			attr_dev(option56, "data-select2-id", "86");
    			add_location(option56, file$5, 143, 28, 9261);
    			option57.__value = "51";
    			option57.value = option57.__value;
    			attr_dev(option57, "data-select2-id", "87");
    			add_location(option57, file$5, 144, 28, 9350);
    			option58.__value = "52";
    			option58.value = option58.__value;
    			attr_dev(option58, "data-select2-id", "88");
    			add_location(option58, file$5, 145, 28, 9438);
    			option59.__value = "53";
    			option59.value = option59.__value;
    			attr_dev(option59, "data-select2-id", "89");
    			add_location(option59, file$5, 146, 28, 9524);
    			option60.__value = "54";
    			option60.value = option60.__value;
    			attr_dev(option60, "data-select2-id", "90");
    			add_location(option60, file$5, 147, 28, 9618);
    			option61.__value = "55";
    			option61.value = option61.__value;
    			attr_dev(option61, "data-select2-id", "91");
    			add_location(option61, file$5, 148, 28, 9727);
    			option62.__value = "56";
    			option62.value = option62.__value;
    			attr_dev(option62, "data-select2-id", "92");
    			add_location(option62, file$5, 149, 28, 9816);
    			option63.__value = "57";
    			option63.value = option63.__value;
    			attr_dev(option63, "data-select2-id", "93");
    			add_location(option63, file$5, 150, 28, 9925);
    			option64.__value = "58";
    			option64.value = option64.__value;
    			attr_dev(option64, "data-select2-id", "94");
    			add_location(option64, file$5, 151, 28, 10018);
    			option65.__value = "59";
    			option65.value = option65.__value;
    			attr_dev(option65, "data-select2-id", "95");
    			add_location(option65, file$5, 152, 28, 10111);
    			option66.__value = "60";
    			option66.value = option66.__value;
    			attr_dev(option66, "data-select2-id", "96");
    			add_location(option66, file$5, 153, 28, 10207);
    			option67.__value = "61";
    			option67.value = option67.__value;
    			attr_dev(option67, "data-select2-id", "97");
    			add_location(option67, file$5, 154, 28, 10307);
    			option68.__value = "62";
    			option68.value = option68.__value;
    			attr_dev(option68, "data-select2-id", "98");
    			add_location(option68, file$5, 155, 28, 10417);
    			option69.__value = "63";
    			option69.value = option69.__value;
    			attr_dev(option69, "data-select2-id", "99");
    			add_location(option69, file$5, 156, 28, 10517);
    			option70.__value = "64";
    			option70.value = option70.__value;
    			attr_dev(option70, "data-select2-id", "100");
    			add_location(option70, file$5, 157, 28, 10617);
    			option71.__value = "65";
    			option71.value = option71.__value;
    			attr_dev(option71, "data-select2-id", "101");
    			add_location(option71, file$5, 158, 28, 10726);
    			option72.__value = "66";
    			option72.value = option72.__value;
    			attr_dev(option72, "data-select2-id", "102");
    			add_location(option72, file$5, 159, 28, 10815);
    			option73.__value = "67";
    			option73.value = option73.__value;
    			attr_dev(option73, "data-select2-id", "103");
    			add_location(option73, file$5, 160, 28, 10908);
    			option74.__value = "68";
    			option74.value = option74.__value;
    			attr_dev(option74, "data-select2-id", "104");
    			add_location(option74, file$5, 161, 28, 11000);
    			option75.__value = "69";
    			option75.value = option75.__value;
    			attr_dev(option75, "data-select2-id", "105");
    			add_location(option75, file$5, 162, 28, 11094);
    			option76.__value = "70";
    			option76.value = option76.__value;
    			attr_dev(option76, "data-select2-id", "106");
    			add_location(option76, file$5, 163, 28, 11190);
    			option77.__value = "71";
    			option77.value = option77.__value;
    			attr_dev(option77, "data-select2-id", "107");
    			add_location(option77, file$5, 164, 28, 11283);
    			option78.__value = "72";
    			option78.value = option78.__value;
    			attr_dev(option78, "data-select2-id", "108");
    			add_location(option78, file$5, 165, 28, 11374);
    			option79.__value = "73";
    			option79.value = option79.__value;
    			attr_dev(option79, "data-select2-id", "109");
    			add_location(option79, file$5, 166, 28, 11471);
    			option80.__value = "74";
    			option80.value = option80.__value;
    			attr_dev(option80, "data-select2-id", "110");
    			add_location(option80, file$5, 167, 28, 11565);
    			option81.__value = "75";
    			option81.value = option81.__value;
    			attr_dev(option81, "data-select2-id", "111");
    			add_location(option81, file$5, 168, 28, 11652);
    			option82.__value = "76";
    			option82.value = option82.__value;
    			attr_dev(option82, "data-select2-id", "112");
    			add_location(option82, file$5, 169, 28, 11745);
    			option83.__value = "77";
    			option83.value = option83.__value;
    			attr_dev(option83, "data-select2-id", "113");
    			add_location(option83, file$5, 170, 28, 11853);
    			option84.__value = "78";
    			option84.value = option84.__value;
    			attr_dev(option84, "data-select2-id", "114");
    			add_location(option84, file$5, 171, 28, 11945);
    			option85.__value = "79";
    			option85.value = option85.__value;
    			attr_dev(option85, "data-select2-id", "115");
    			add_location(option85, file$5, 172, 28, 12038);
    			option86.__value = "80";
    			option86.value = option86.__value;
    			attr_dev(option86, "data-select2-id", "116");
    			add_location(option86, file$5, 173, 28, 12138);
    			option87.__value = "81";
    			option87.value = option87.__value;
    			attr_dev(option87, "data-select2-id", "117");
    			add_location(option87, file$5, 174, 28, 12224);
    			option88.__value = "82";
    			option88.value = option88.__value;
    			attr_dev(option88, "data-select2-id", "118");
    			add_location(option88, file$5, 175, 28, 12319);
    			option89.__value = "83";
    			option89.value = option89.__value;
    			attr_dev(option89, "data-select2-id", "119");
    			add_location(option89, file$5, 176, 28, 12407);
    			option90.__value = "84";
    			option90.value = option90.__value;
    			attr_dev(option90, "data-select2-id", "120");
    			add_location(option90, file$5, 177, 28, 12498);
    			option91.__value = "85";
    			option91.value = option91.__value;
    			attr_dev(option91, "data-select2-id", "121");
    			add_location(option91, file$5, 178, 28, 12587);
    			option92.__value = "86";
    			option92.value = option92.__value;
    			attr_dev(option92, "data-select2-id", "122");
    			add_location(option92, file$5, 179, 28, 12672);
    			option93.__value = "87";
    			option93.value = option93.__value;
    			attr_dev(option93, "data-select2-id", "123");
    			add_location(option93, file$5, 180, 28, 12767);
    			option94.__value = "88";
    			option94.value = option94.__value;
    			attr_dev(option94, "data-select2-id", "124");
    			add_location(option94, file$5, 181, 28, 12854);
    			option95.__value = "89";
    			option95.value = option95.__value;
    			attr_dev(option95, "data-select2-id", "125");
    			add_location(option95, file$5, 182, 28, 12950);
    			option96.__value = "90";
    			option96.value = option96.__value;
    			attr_dev(option96, "data-select2-id", "126");
    			add_location(option96, file$5, 183, 28, 13038);
    			option97.__value = "91";
    			option97.value = option97.__value;
    			attr_dev(option97, "data-select2-id", "127");
    			add_location(option97, file$5, 184, 28, 13127);
    			option98.__value = "92";
    			option98.value = option98.__value;
    			attr_dev(option98, "data-select2-id", "128");
    			add_location(option98, file$5, 185, 28, 13226);
    			option99.__value = "93";
    			option99.value = option99.__value;
    			attr_dev(option99, "data-select2-id", "129");
    			add_location(option99, file$5, 186, 28, 13317);
    			option100.__value = "94";
    			option100.value = option100.__value;
    			attr_dev(option100, "data-select2-id", "130");
    			add_location(option100, file$5, 187, 28, 13414);
    			attr_dev(select2, "class", "form-control");
    			attr_dev(select2, "id", "sltAseguradora");
    			set_style(select2, "width", "100%");
    			attr_dev(select2, "tabindex", "-1");
    			attr_dev(select2, "aria-hidden", "true");
    			attr_dev(select2, "name", "IdAseguradora");
    			add_location(select2, file$5, 94, 24, 4719);
    			attr_dev(div17, "class", "form-group col-md-6");
    			add_location(div17, file$5, 92, 20, 4582);
    			attr_dev(label11, "for", "");
    			add_location(label11, file$5, 190, 24, 13583);
    			attr_dev(input9, "type", "text");
    			attr_dev(input9, "name", "Poliza");
    			attr_dev(input9, "pattern", "^[0-9]+$");
    			attr_dev(input9, "class", "form-control");
    			add_location(input9, file$5, 191, 24, 13643);
    			attr_dev(div18, "class", "form-group col-md-6");
    			add_location(div18, file$5, 189, 20, 13524);
    			attr_dev(label12, "for", "");
    			add_location(label12, file$5, 194, 24, 13825);
    			attr_dev(input10, "type", "text");
    			attr_dev(input10, "class", "form-control");
    			attr_dev(input10, "pattern", "^[0-9]+$");
    			attr_dev(input10, "name", "NSS");
    			add_location(input10, file$5, 195, 24, 13902);
    			attr_dev(div19, "class", "form-group col-md-6");
    			add_location(div19, file$5, 193, 20, 13766);
    			attr_dev(div20, "class", "form-row");
    			add_location(div20, file$5, 91, 16, 4538);
    			add_location(br2, file$5, 198, 16, 14042);
    			set_style(h52, "margin-bottom", "0");
    			add_location(h52, file$5, 200, 16, 14066);
    			add_location(br3, file$5, 200, 69, 14119);
    			set_style(hr1, "margin-top", "0");
    			add_location(hr1, file$5, 201, 16, 14141);
    			attr_dev(label13, "for", "inputAddress");
    			add_location(label13, file$5, 205, 24, 14292);
    			attr_dev(input11, "type", "text");
    			attr_dev(input11, "class", "form-control");
    			attr_dev(input11, "id", "inputAddress");
    			attr_dev(input11, "placeholder", "1234 Main St");
    			attr_dev(input11, "name", "Direccion");
    			attr_dev(input11, "data-bind", "value: direccion");
    			attr_dev(input11, "max", "100");
    			add_location(input11, file$5, 206, 24, 14361);
    			attr_dev(div21, "class", "form-group col-md-12");
    			add_location(div21, file$5, 204, 20, 14232);
    			attr_dev(label14, "for", "");
    			add_location(label14, file$5, 209, 24, 14611);
    			attr_dev(input12, "type", "text");
    			attr_dev(input12, "class", "form-control");
    			attr_dev(input12, "placeholder", "Nombre de la Ciudad");
    			attr_dev(input12, "name", "Ciudad");
    			add_location(input12, file$5, 210, 24, 14665);
    			attr_dev(div22, "class", "form-group col-md-6");
    			add_location(div22, file$5, 208, 20, 14552);
    			attr_dev(div23, "class", "form-row");
    			add_location(div23, file$5, 203, 16, 14188);
    			attr_dev(label15, "class", "font-secondary");
    			add_location(label15, file$5, 216, 24, 14928);
    			option101.__value = "";
    			option101.value = option101.__value;
    			attr_dev(option101, "data-select2-id", "2");
    			add_location(option101, file$5, 218, 28, 15151);
    			option102.__value = "1";
    			option102.value = option102.__value;
    			attr_dev(option102, "data-select2-id", "163");
    			add_location(option102, file$5, 219, 28, 15247);
    			attr_dev(select3, "class", "form-control");
    			attr_dev(select3, "id", "selPaises");
    			set_style(select3, "width", "100%");
    			attr_dev(select3, "tabindex", "-1");
    			attr_dev(select3, "aria-hidden", "true");
    			attr_dev(select3, "name", "IdPais");
    			select3.required = "";
    			add_location(select3, file$5, 217, 24, 14997);
    			attr_dev(div24, "class", "form-group col-md-6");
    			add_location(div24, file$5, 215, 20, 14869);
    			attr_dev(label16, "class", "font-secondary");
    			add_location(label16, file$5, 223, 24, 15460);
    			option103.__value = "";
    			option103.value = option103.__value;
    			attr_dev(option103, "data-select2-id", "4");
    			add_location(option103, file$5, 225, 28, 15706);
    			option104.__value = "1";
    			option104.value = option104.__value;
    			attr_dev(option104, "data-select2-id", "5");
    			add_location(option104, file$5, 226, 28, 15816);
    			option105.__value = "2";
    			option105.value = option105.__value;
    			attr_dev(option105, "data-select2-id", "6");
    			add_location(option105, file$5, 227, 28, 15899);
    			option106.__value = "3";
    			option106.value = option106.__value;
    			attr_dev(option106, "data-select2-id", "7");
    			add_location(option106, file$5, 228, 28, 15980);
    			option107.__value = "4";
    			option107.value = option107.__value;
    			attr_dev(option107, "data-select2-id", "8");
    			add_location(option107, file$5, 229, 28, 16065);
    			option108.__value = "5";
    			option108.value = option108.__value;
    			attr_dev(option108, "data-select2-id", "9");
    			add_location(option108, file$5, 230, 28, 16150);
    			option109.__value = "6";
    			option109.value = option109.__value;
    			attr_dev(option109, "data-select2-id", "10");
    			add_location(option109, file$5, 231, 28, 16234);
    			option110.__value = "7";
    			option110.value = option110.__value;
    			attr_dev(option110, "data-select2-id", "11");
    			add_location(option110, file$5, 232, 28, 16329);
    			attr_dev(select4, "class", "form-control");
    			attr_dev(select4, "id", "selProvincias");
    			set_style(select4, "width", "100%");
    			attr_dev(select4, "tabindex", "-1");
    			attr_dev(select4, "aria-hidden", "true");
    			attr_dev(select4, "name", "IdProvincia");
    			select4.required = "";
    			add_location(select4, file$5, 224, 24, 15543);
    			attr_dev(div25, "class", "form-group col-md-6");
    			add_location(div25, file$5, 222, 20, 15401);
    			attr_dev(div26, "class", "form-row");
    			add_location(div26, file$5, 214, 16, 14825);
    			attr_dev(button0, "type", "reset");
    			attr_dev(button0, "class", "btn btn-danger mr-2");
    			attr_dev(button0, "data-bind", "click: $root.limpiarFormulario");
    			add_location(button0, file$5, 237, 20, 16548);
    			attr_dev(i, "class", "mdi mdi-content-save-outline");
    			add_location(i, file$5, 238, 66, 16724);
    			attr_dev(button1, "type", "submit");
    			attr_dev(button1, "class", "btn btn-success");
    			add_location(button1, file$5, 238, 20, 16678);
    			attr_dev(div27, "class", "card-body d-flex justify-content-end align-items-center");
    			add_location(div27, file$5, 236, 16, 16457);
    			attr_dev(form, "id", "frmDatosGenerales");
    			add_location(form, file$5, 22, 12, 532);
    			attr_dev(div28, "class", "col-lg-12");
    			add_location(div28, file$5, 20, 8, 493);
    			attr_dev(div29, "class", "row");
    			add_location(div29, file$5, 19, 4, 466);
    			attr_dev(div30, "class", "card-body");
    			attr_dev(div30, "id", "divDocumento");
    			add_location(div30, file$5, 18, 0, 419);
    			attr_dev(div31, "class", "card m-b-30");
    			add_location(div31, file$5, 11, 0, 296);
    			attr_dev(div32, "class", "col-lg-8 m-b-30 m-auto");
    			set_style(div32, "margin-top", "50px", 1);
    			add_location(div32, file$5, 10, 4, 222);
    			attr_dev(section, "class", "admin-content");
    			add_location(section, file$5, 9, 2, 185);
    			attr_dev(main, "class", "admin-main");
    			add_location(main, file$5, 7, 0, 142);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Editar", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Editar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Aside });
    	return [];
    }

    class Editar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editar",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const routes = {
        "/": Index,
        "/Paciente/Index": Index$1,
        "/Paciente/Perfil": Perfil,
        "/Paciente/Editar": Editar
    };

    /* src\App.svelte generated by Svelte v3.29.0 */

    function create_fragment$7(ctx) {
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
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
