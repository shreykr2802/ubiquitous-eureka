
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
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
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/molecules/Header.svelte generated by Svelte v3.59.2 */

    const file$2 = "src/components/molecules/Header.svelte";

    function create_fragment$2(ctx) {
    	let header;
    	let div0;
    	let a0;
    	let t1;
    	let nav;
    	let ul;
    	let li0;
    	let a1;
    	let span0;
    	let t3;
    	let t4;
    	let li1;
    	let a2;
    	let span1;
    	let t6;
    	let t7;
    	let li2;
    	let a3;
    	let span2;
    	let t9;
    	let t10;
    	let li3;
    	let a4;
    	let span3;
    	let t12;
    	let t13;
    	let li4;
    	let a5;
    	let span4;
    	let t15;
    	let t16;
    	let li5;
    	let a6;
    	let span5;
    	let t18;
    	let t19;
    	let div1;
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div0 = element("div");
    			a0 = element("a");
    			a0.textContent = "shrey kumar";
    			t1 = space();
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			span0 = element("span");
    			span0.textContent = "01. ";
    			t3 = text("about");
    			t4 = space();
    			li1 = element("li");
    			a2 = element("a");
    			span1 = element("span");
    			span1.textContent = "02. ";
    			t6 = text("experience");
    			t7 = space();
    			li2 = element("li");
    			a3 = element("a");
    			span2 = element("span");
    			span2.textContent = "03. ";
    			t9 = text("work");
    			t10 = space();
    			li3 = element("li");
    			a4 = element("a");
    			span3 = element("span");
    			span3.textContent = "04. ";
    			t12 = text("blog");
    			t13 = space();
    			li4 = element("li");
    			a5 = element("a");
    			span4 = element("span");
    			span4.textContent = "05. ";
    			t15 = text("resume");
    			t16 = space();
    			li5 = element("li");
    			a6 = element("a");
    			span5 = element("span");
    			span5.textContent = "06. ";
    			t18 = text("contact");
    			t19 = space();
    			div1 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "svelte-141kfkr");
    			add_location(a0, file$2, 6, 8, 68);
    			add_location(div0, file$2, 5, 4, 54);
    			attr_dev(span0, "class", "pink");
    			add_location(span0, file$2, 10, 33, 163);
    			attr_dev(a1, "href", "#about");
    			attr_dev(a1, "class", "svelte-141kfkr");
    			add_location(a1, file$2, 10, 16, 146);
    			attr_dev(li0, "class", "svelte-141kfkr");
    			add_location(li0, file$2, 10, 12, 142);
    			attr_dev(span1, "class", "yellow");
    			add_location(span1, file$2, 11, 38, 246);
    			attr_dev(a2, "href", "#experience");
    			attr_dev(a2, "class", "svelte-141kfkr");
    			add_location(a2, file$2, 11, 16, 224);
    			attr_dev(li1, "class", "svelte-141kfkr");
    			add_location(li1, file$2, 11, 12, 220);
    			attr_dev(span2, "class", "blue");
    			add_location(span2, file$2, 12, 32, 330);
    			attr_dev(a3, "href", "#work");
    			attr_dev(a3, "class", "svelte-141kfkr");
    			add_location(a3, file$2, 12, 16, 314);
    			attr_dev(li2, "class", "svelte-141kfkr");
    			add_location(li2, file$2, 12, 12, 310);
    			attr_dev(span3, "class", "green");
    			add_location(span3, file$2, 13, 32, 406);
    			attr_dev(a4, "href", "#blog");
    			attr_dev(a4, "class", "svelte-141kfkr");
    			add_location(a4, file$2, 13, 16, 390);
    			attr_dev(li3, "class", "svelte-141kfkr");
    			add_location(li3, file$2, 13, 12, 386);
    			attr_dev(span4, "class", "pink");
    			add_location(span4, file$2, 14, 34, 485);
    			attr_dev(a5, "href", "#resume");
    			attr_dev(a5, "class", "svelte-141kfkr");
    			add_location(a5, file$2, 14, 16, 467);
    			attr_dev(li4, "class", "svelte-141kfkr");
    			add_location(li4, file$2, 14, 12, 463);
    			attr_dev(span5, "class", "yellow");
    			add_location(span5, file$2, 15, 35, 566);
    			attr_dev(a6, "href", "#contact");
    			attr_dev(a6, "class", "svelte-141kfkr");
    			add_location(a6, file$2, 15, 16, 547);
    			attr_dev(li5, "class", "svelte-141kfkr");
    			add_location(li5, file$2, 15, 12, 543);
    			attr_dev(ul, "class", "svelte-141kfkr");
    			add_location(ul, file$2, 9, 8, 125);
    			attr_dev(nav, "class", "svelte-141kfkr");
    			add_location(nav, file$2, 8, 4, 111);
    			attr_dev(path, "d", "M12 15.5C11.0718 15.5 10.1815 15.1313 9.52515 14.4749C8.86877 13.8185 8.50002 12.9283 8.50002 12C8.50002 11.0717 8.86877 10.1815 9.52515 9.52513C10.1815 8.86875 11.0718 8.5 12 8.5C12.9283 8.5 13.8185 8.86875 14.4749 9.52513C15.1313 10.1815 15.5 11.0717 15.5 12C15.5 12.9283 15.1313 13.8185 14.4749 14.4749C13.8185 15.1313 12.9283 15.5 12 15.5ZM19.43 12.97C19.47 12.65 19.5 12.33 19.5 12C19.5 11.67 19.47 11.34 19.43 11L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.96 19.05 5.05L16.56 6.05C16.04 5.66 15.5 5.32 14.87 5.07L14.5 2.42C14.4797 2.30222 14.4184 2.19543 14.3268 2.11855C14.2353 2.04168 14.1195 1.99968 14 2H10C9.75002 2 9.54002 2.18 9.50002 2.42L9.13002 5.07C8.50002 5.32 7.96002 5.66 7.44002 6.05L4.95002 5.05C4.73002 4.96 4.46002 5.05 4.34002 5.27L2.34002 8.73C2.21002 8.95 2.27002 9.22 2.46002 9.37L4.57002 11C4.53002 11.34 4.50002 11.67 4.50002 12C4.50002 12.33 4.53002 12.65 4.57002 12.97L2.46002 14.63C2.27002 14.78 2.21002 15.05 2.34002 15.27L4.34002 18.73C4.46002 18.95 4.73002 19.03 4.95002 18.95L7.44002 17.94C7.96002 18.34 8.50002 18.68 9.13002 18.93L9.50002 21.58C9.54002 21.82 9.75002 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.5 18.67 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.03 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.97Z");
    			attr_dev(path, "fill", "#C1C9CE");
    			add_location(path, file$2, 26, 12, 835);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "fill", "none");
    			add_location(svg, file$2, 19, 8, 658);
    			add_location(div1, file$2, 18, 4, 644);
    			attr_dev(header, "class", "svelte-141kfkr");
    			add_location(header, file$2, 4, 0, 41);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div0);
    			append_dev(div0, a0);
    			append_dev(header, t1);
    			append_dev(header, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a1);
    			append_dev(a1, span0);
    			append_dev(a1, t3);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a2);
    			append_dev(a2, span1);
    			append_dev(a2, t6);
    			append_dev(ul, t7);
    			append_dev(ul, li2);
    			append_dev(li2, a3);
    			append_dev(a3, span2);
    			append_dev(a3, t9);
    			append_dev(ul, t10);
    			append_dev(ul, li3);
    			append_dev(li3, a4);
    			append_dev(a4, span3);
    			append_dev(a4, t12);
    			append_dev(ul, t13);
    			append_dev(ul, li4);
    			append_dev(li4, a5);
    			append_dev(a5, span4);
    			append_dev(a5, t15);
    			append_dev(ul, t16);
    			append_dev(ul, li5);
    			append_dev(li5, a6);
    			append_dev(a6, span5);
    			append_dev(a6, t18);
    			append_dev(header, t19);
    			append_dev(header, div1);
    			append_dev(div1, svg);
    			append_dev(svg, path);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	let number = 10;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ number });

    	$$self.$inject_state = $$props => {
    		if ('number' in $$props) number = $$props.number;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/molecules/Home.svelte generated by Svelte v3.59.2 */

    const file$1 = "src/components/molecules/Home.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div3;
    	let h1;
    	let t0;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let span2;
    	let t6;
    	let div0;
    	let span3;
    	let t8;
    	let span4;
    	let t10;
    	let span5;
    	let t12;
    	let div1;
    	let t14;
    	let div2;
    	let span6;
    	let t16;
    	let span7;
    	let t18;
    	let span8;
    	let t20;
    	let span9;
    	let t22;
    	let span10;
    	let t24;
    	let div24;
    	let div23;
    	let div7;
    	let div4;
    	let t25;
    	let div5;
    	let t26;
    	let div6;
    	let t27;
    	let div22;
    	let div14;
    	let div8;
    	let t29;
    	let div9;
    	let t31;
    	let div10;
    	let t33;
    	let div11;
    	let t35;
    	let div12;
    	let t37;
    	let div13;
    	let t39;
    	let div21;
    	let div15;
    	let t41;
    	let div16;
    	let t44;
    	let div17;
    	let t47;
    	let div18;
    	let t50;
    	let div19;
    	let t53;
    	let div20;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div3 = element("div");
    			h1 = element("h1");
    			t0 = text("I");
    			span0 = element("span");
    			span0.textContent = "'";
    			t2 = text("m Sh");
    			span1 = element("span");
    			span1.textContent = "r";
    			t4 = text("ey Kuma");
    			span2 = element("span");
    			span2.textContent = "r";
    			t6 = space();
    			div0 = element("div");
    			span3 = element("span");
    			span3.textContent = "Full Stack Developer";
    			t8 = text(" |\n            ");
    			span4 = element("span");
    			span4.textContent = "MERN Stack";
    			t10 = text("\n            | ");
    			span5 = element("span");
    			span5.textContent = "Reactjs";
    			t12 = space();
    			div1 = element("div");
    			div1.textContent = "Seasoned Software Engineer with over 7 years of experience in the\n            information technology and services sector. My primary expertise\n            lies in React.js and JavaScript, where I've consistently delivered\n            top-tier solutions to drive user engagement and satisfaction.";
    			t14 = space();
    			div2 = element("div");
    			span6 = element("span");
    			span6.textContent = "adaptable";
    			t16 = text(" |\n            ");
    			span7 = element("span");
    			span7.textContent = "friendly";
    			t18 = text("\n            | ");
    			span8 = element("span");
    			span8.textContent = "dynamic";
    			t20 = text(" |\n            ");
    			span9 = element("span");
    			span9.textContent = "upbeat";
    			t22 = text("\n            | ");
    			span10 = element("span");
    			span10.textContent = "problem solver";
    			t24 = space();
    			div24 = element("div");
    			div23 = element("div");
    			div7 = element("div");
    			div4 = element("div");
    			t25 = space();
    			div5 = element("div");
    			t26 = space();
    			div6 = element("div");
    			t27 = space();
    			div22 = element("div");
    			div14 = element("div");
    			div8 = element("div");
    			div8.textContent = "1";
    			t29 = space();
    			div9 = element("div");
    			div9.textContent = "2";
    			t31 = space();
    			div10 = element("div");
    			div10.textContent = "3";
    			t33 = space();
    			div11 = element("div");
    			div11.textContent = "4";
    			t35 = space();
    			div12 = element("div");
    			div12.textContent = "5";
    			t37 = space();
    			div13 = element("div");
    			div13.textContent = "6";
    			t39 = space();
    			div21 = element("div");
    			div15 = element("div");
    			div15.textContent = "<stack>";
    			t41 = space();
    			div16 = element("div");
    			div16.textContent = `        ${`<javascript>`}`;
    			t44 = space();
    			div17 = element("div");
    			div17.textContent = `        ${`<react.js>`}`;
    			t47 = space();
    			div18 = element("div");
    			div18.textContent = `        ${`<node.js>`}`;
    			t50 = space();
    			div19 = element("div");
    			div19.textContent = `        ${`<typescript>`}`;
    			t53 = space();
    			div20 = element("div");
    			div20.textContent = "<and more . . . >";
    			attr_dev(span0, "class", "pink");
    			add_location(span0, file$1, 6, 13, 106);
    			attr_dev(span1, "class", "green");
    			add_location(span1, file$1, 6, 44, 137);
    			attr_dev(span2, "class", "green");
    			add_location(span2, file$1, 6, 79, 172);
    			attr_dev(h1, "class", "svelte-dlrg45");
    			add_location(h1, file$1, 5, 8, 88);
    			attr_dev(span3, "class", "yellow");
    			add_location(span3, file$1, 11, 12, 270);
    			attr_dev(span4, "class", "pink");
    			add_location(span4, file$1, 12, 12, 333);
    			attr_dev(span5, "class", "green");
    			add_location(span5, file$1, 13, 14, 384);
    			add_location(div0, file$1, 10, 8, 252);
    			attr_dev(div1, "class", "intro svelte-dlrg45");
    			add_location(div1, file$1, 15, 8, 442);
    			attr_dev(span6, "class", "blue");
    			add_location(span6, file$1, 22, 12, 811);
    			attr_dev(span7, "class", "pink");
    			add_location(span7, file$1, 23, 12, 861);
    			attr_dev(span8, "class", "green");
    			add_location(span8, file$1, 24, 14, 910);
    			attr_dev(span9, "class", "yellow");
    			add_location(span9, file$1, 25, 12, 959);
    			attr_dev(span10, "class", "blue");
    			add_location(span10, file$1, 26, 14, 1008);
    			add_location(div2, file$1, 21, 8, 793);
    			attr_dev(div3, "class", "column details svelte-dlrg45");
    			add_location(div3, file$1, 4, 4, 51);
    			attr_dev(div4, "class", "video-box-circle green-bg svelte-dlrg45");
    			add_location(div4, file$1, 32, 16, 1187);
    			attr_dev(div5, "class", "video-box-circle yellow-bg svelte-dlrg45");
    			add_location(div5, file$1, 33, 16, 1249);
    			attr_dev(div6, "class", "video-box-circle pink-bg svelte-dlrg45");
    			add_location(div6, file$1, 34, 16, 1312);
    			attr_dev(div7, "class", "video-box-header row svelte-dlrg45");
    			add_location(div7, file$1, 31, 12, 1136);
    			add_location(div8, file$1, 38, 20, 1501);
    			add_location(div9, file$1, 39, 20, 1534);
    			add_location(div10, file$1, 40, 20, 1567);
    			add_location(div11, file$1, 41, 20, 1600);
    			add_location(div12, file$1, 42, 20, 1633);
    			add_location(div13, file$1, 43, 20, 1666);
    			attr_dev(div14, "class", "video-box-code-numbers column svelte-dlrg45");
    			add_location(div14, file$1, 37, 16, 1437);
    			add_location(div15, file$1, 46, 20, 1779);
    			attr_dev(div16, "class", "yellow");
    			add_location(div16, file$1, 47, 20, 1822);
    			attr_dev(div17, "class", "green");
    			add_location(div17, file$1, 48, 20, 1933);
    			attr_dev(div18, "class", "pink");
    			add_location(div18, file$1, 49, 20, 2041);
    			attr_dev(div19, "class", "blue");
    			add_location(div19, file$1, 50, 20, 2147);
    			add_location(div20, file$1, 51, 20, 2256);
    			attr_dev(div21, "class", "video-box-code-tech column svelte-dlrg45");
    			add_location(div21, file$1, 45, 16, 1718);
    			attr_dev(div22, "class", "video-box-code row svelte-dlrg45");
    			add_location(div22, file$1, 36, 12, 1388);
    			attr_dev(div23, "class", "column video-box svelte-dlrg45");
    			add_location(div23, file$1, 30, 8, 1093);
    			add_location(div24, file$1, 29, 4, 1079);
    			attr_dev(section, "class", "row home svelte-dlrg45");
    			add_location(section, file$1, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div3);
    			append_dev(div3, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span0);
    			append_dev(h1, t2);
    			append_dev(h1, span1);
    			append_dev(h1, t4);
    			append_dev(h1, span2);
    			append_dev(div3, t6);
    			append_dev(div3, div0);
    			append_dev(div0, span3);
    			append_dev(div0, t8);
    			append_dev(div0, span4);
    			append_dev(div0, t10);
    			append_dev(div0, span5);
    			append_dev(div3, t12);
    			append_dev(div3, div1);
    			append_dev(div3, t14);
    			append_dev(div3, div2);
    			append_dev(div2, span6);
    			append_dev(div2, t16);
    			append_dev(div2, span7);
    			append_dev(div2, t18);
    			append_dev(div2, span8);
    			append_dev(div2, t20);
    			append_dev(div2, span9);
    			append_dev(div2, t22);
    			append_dev(div2, span10);
    			append_dev(section, t24);
    			append_dev(section, div24);
    			append_dev(div24, div23);
    			append_dev(div23, div7);
    			append_dev(div7, div4);
    			append_dev(div7, t25);
    			append_dev(div7, div5);
    			append_dev(div7, t26);
    			append_dev(div7, div6);
    			append_dev(div23, t27);
    			append_dev(div23, div22);
    			append_dev(div22, div14);
    			append_dev(div14, div8);
    			append_dev(div14, t29);
    			append_dev(div14, div9);
    			append_dev(div14, t31);
    			append_dev(div14, div10);
    			append_dev(div14, t33);
    			append_dev(div14, div11);
    			append_dev(div14, t35);
    			append_dev(div14, div12);
    			append_dev(div14, t37);
    			append_dev(div14, div13);
    			append_dev(div22, t39);
    			append_dev(div22, div21);
    			append_dev(div21, div15);
    			append_dev(div21, t41);
    			append_dev(div21, div16);
    			append_dev(div21, t44);
    			append_dev(div21, div17);
    			append_dev(div21, t47);
    			append_dev(div21, div18);
    			append_dev(div21, t50);
    			append_dev(div21, div19);
    			append_dev(div21, t53);
    			append_dev(div21, div20);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
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
    	validate_slots('Home', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t;
    	let home;
    	let current;
    	header = new Header({ $$inline: true });
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t = space();
    			create_component(home.$$.fragment);
    			add_location(main, file, 5, 0, 136);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t);
    			mount_component(home, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(home);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Home });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
