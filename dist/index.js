(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['svelte-components'] = {}));
}(this, (function (exports) { 'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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

    /* src/components/ClockCore.svelte generated by Svelte v3.38.2 */

    function create_fragment$6(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let frame;
    	let active;
    	let { current_time } = $$props;
    	let { power_on = true } = $$props;
    	const start_time = window.performance.timeOrigin;

    	function runClock() {
    		frame = requestAnimationFrame(runClock);
    		$$invalidate(0, current_time = start_time + window.performance.now());
    	}

    	function startClock() {
    		runClock();
    		return true;
    	}

    	function stopClock() {
    		cancelAnimationFrame(frame);
    		return false;
    	}

    	onDestroy(() => {
    		if (active) {
    			cancelAnimationFrame(frame);
    		}
    	});

    	$$self.$$set = $$props => {
    		if ("current_time" in $$props) $$invalidate(0, current_time = $$props.current_time);
    		if ("power_on" in $$props) $$invalidate(1, power_on = $$props.power_on);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*power_on*/ 2) {
    			active = power_on ? startClock() : stopClock();
    		}
    	};

    	return [current_time, power_on, $$scope, slots];
    }

    class ClockCore extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { current_time: 0, power_on: 1 });
    	}
    }

    /* src/components/TimerCore.svelte generated by Svelte v3.38.2 */

    function create_fragment$5(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let frame;
    	let active;
    	let last_time;
    	let { power_on = false } = $$props;
    	let { remaining_time = null } = $$props;

    	function runTimer() {
    		frame = requestAnimationFrame(runTimer);
    		const time = window.performance.now();
    		$$invalidate(1, remaining_time -= time - last_time);

    		if (remaining_time >= 0) {
    			last_time = time;
    		} else {
    			$$invalidate(0, power_on = false);
    			$$invalidate(1, remaining_time = 0);
    			cancelAnimationFrame(frame);
    		}
    	}

    	function startTimer() {
    		last_time = window.performance.now();
    		runTimer();
    		return true;
    	}

    	function stopTimer() {
    		cancelAnimationFrame(frame);
    		return false;
    	}

    	onDestroy(() => {
    		if (active) {
    			cancelAnimationFrame(frame);
    		}
    	});

    	$$self.$$set = $$props => {
    		if ("power_on" in $$props) $$invalidate(0, power_on = $$props.power_on);
    		if ("remaining_time" in $$props) $$invalidate(1, remaining_time = $$props.remaining_time);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*power_on*/ 1) {
    			active = power_on ? startTimer() : stopTimer();
    		}
    	};

    	return [power_on, remaining_time, $$scope, slots];
    }

    class TimerCore extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { power_on: 0, remaining_time: 1 });
    	}
    }

    /* src/components/StopwatchCore.svelte generated by Svelte v3.38.2 */

    function create_fragment$4(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let frame;
    	let active;
    	let last_time;
    	let { elapsed_time = 0 } = $$props;
    	let { power_on = false } = $$props;

    	function runStopwatch() {
    		frame = requestAnimationFrame(runStopwatch);
    		const time = window.performance.now();
    		$$invalidate(0, elapsed_time += time - last_time);
    		last_time = time;
    	}

    	function startStopwatch() {
    		last_time = window.performance.now();
    		runStopwatch();
    		return true;
    	}

    	function stopStopwatch() {
    		cancelAnimationFrame(frame);
    		return false;
    	}

    	onDestroy(() => {
    		if (active) {
    			cancelAnimationFrame(frame);
    		}
    	});

    	$$self.$$set = $$props => {
    		if ("elapsed_time" in $$props) $$invalidate(0, elapsed_time = $$props.elapsed_time);
    		if ("power_on" in $$props) $$invalidate(1, power_on = $$props.power_on);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*power_on*/ 2) {
    			active = power_on ? startStopwatch() : stopStopwatch();
    		}
    	};

    	return [elapsed_time, power_on, $$scope, slots];
    }

    class StopwatchCore extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { elapsed_time: 0, power_on: 1 });
    	}
    }

    /* src/components/Button.svelte generated by Svelte v3.38.2 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-1twd4vp-style";
    	style.textContent = "button.svelte-1twd4vp{margin:3px;padding:12px;border:none;outline:none;color:white;cursor:pointer;font-size:1rem;line-height:1rem;border-radius:4px;background-color:dodgerblue;box-shadow:1px 1px 1px 1px #dddddd}button.svelte-1twd4vp:active{box-shadow:none}";
    	append(document.head, style);
    }

    function create_fragment$3(ctx) {
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr(button, "class", "svelte-1twd4vp");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*handleClick*/ ctx[0])) /*handleClick*/ ctx[0].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { handleClick } = $$props;

    	$$self.$$set = $$props => {
    		if ("handleClick" in $$props) $$invalidate(0, handleClick = $$props.handleClick);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [handleClick, $$scope, slots];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1twd4vp-style")) add_css$3();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { handleClick: 0 });
    	}
    }

    /* src/components/Clock.svelte generated by Svelte v3.38.2 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-g1qua3-style";
    	style.textContent = ".container.svelte-g1qua3{display:flex;align-items:center;flex-direction:column;position:relative;margin:1rem;padding:1rem;border-radius:1rem;border:4px solid #ff4400;background-color:#ffffff}.title.svelte-g1qua3{top:0;left:0;margin:0;font-size:1.2rem;padding-right:5px;border-top-left-radius:5px;border-bottom-right-radius:5px;font-weight:bold;position:absolute;color:#ffffff;background-color:#ff4400;text-shadow:1px 1px rgb(0 0 0 / 40%)}.power_on.container.svelte-g1qua3{border-color:#44ff00}.power_on.title.svelte-g1qua3{background-color:#44ff00}.buttonContainer.svelte-g1qua3{display:flex;justify-content:center}.number.svelte-g1qua3{font-size:3rem;font-weight:bold}";
    	append(document.head, style);
    }

    // (29:12) <Button handleClick={start}>
    function create_default_slot_2$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Start");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (30:12) <Button handleClick={stop}>
    function create_default_slot_1$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Stop");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (24:0) <ClockCore bind:current_time={time} bind:power_on={power_on}>
    function create_default_slot$2(ctx) {
    	let div1;
    	let p0;
    	let t1;
    	let p1;
    	let t2;
    	let t3;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				handleClick: /*start*/ ctx[3],
    				$$slots: { default: [create_default_slot_2$2] },
    				$$scope: { ctx }
    			}
    		});

    	button1 = new Button({
    			props: {
    				handleClick: /*stop*/ ctx[4],
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Clock";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(/*display*/ ctx[2]);
    			t3 = space();
    			div0 = element("div");
    			create_component(button0.$$.fragment);
    			t4 = space();
    			create_component(button1.$$.fragment);
    			attr(p0, "class", "title svelte-g1qua3");
    			toggle_class(p0, "power_on", /*power_on*/ ctx[1]);
    			attr(p1, "class", "number svelte-g1qua3");
    			attr(div0, "class", "buttonContainer svelte-g1qua3");
    			attr(div1, "class", "container svelte-g1qua3");
    			toggle_class(div1, "power_on", /*power_on*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, p0);
    			append(div1, t1);
    			append(div1, p1);
    			append(p1, t2);
    			append(div1, t3);
    			append(div1, div0);
    			mount_component(button0, div0, null);
    			append(div0, t4);
    			mount_component(button1, div0, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*power_on*/ 2) {
    				toggle_class(p0, "power_on", /*power_on*/ ctx[1]);
    			}

    			if (!current || dirty & /*display*/ 4) set_data(t2, /*display*/ ctx[2]);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 128) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 128) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);

    			if (dirty & /*power_on*/ 2) {
    				toggle_class(div1, "power_on", /*power_on*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let clockcore;
    	let updating_current_time;
    	let updating_power_on;
    	let current;

    	function clockcore_current_time_binding(value) {
    		/*clockcore_current_time_binding*/ ctx[5](value);
    	}

    	function clockcore_power_on_binding(value) {
    		/*clockcore_power_on_binding*/ ctx[6](value);
    	}

    	let clockcore_props = {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	};

    	if (/*time*/ ctx[0] !== void 0) {
    		clockcore_props.current_time = /*time*/ ctx[0];
    	}

    	if (/*power_on*/ ctx[1] !== void 0) {
    		clockcore_props.power_on = /*power_on*/ ctx[1];
    	}

    	clockcore = new ClockCore({ props: clockcore_props });
    	binding_callbacks.push(() => bind(clockcore, "current_time", clockcore_current_time_binding));
    	binding_callbacks.push(() => bind(clockcore, "power_on", clockcore_power_on_binding));

    	return {
    		c() {
    			create_component(clockcore.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(clockcore, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const clockcore_changes = {};

    			if (dirty & /*$$scope, power_on, display*/ 134) {
    				clockcore_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_current_time && dirty & /*time*/ 1) {
    				updating_current_time = true;
    				clockcore_changes.current_time = /*time*/ ctx[0];
    				add_flush_callback(() => updating_current_time = false);
    			}

    			if (!updating_power_on && dirty & /*power_on*/ 2) {
    				updating_power_on = true;
    				clockcore_changes.power_on = /*power_on*/ ctx[1];
    				add_flush_callback(() => updating_power_on = false);
    			}

    			clockcore.$set(clockcore_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(clockcore.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(clockcore.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(clockcore, detaching);
    		}
    	};
    }

    function format(time) {
    	const now = new Date(time);
    	const hours = now.getHours();
    	const minutes = now.getMinutes();
    	const seconds = now.getSeconds();
    	const display_hours = `00${hours}`.slice(-2);
    	const display_minutes = `00${minutes}`.slice(-2);
    	const display_seconds = `00${seconds}`.slice(-2);
    	return `${display_hours}:${display_minutes}:${display_seconds}`;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let display;
    	let time;
    	let power_on;

    	function start() {
    		$$invalidate(1, power_on = true);
    	}

    	function stop() {
    		$$invalidate(1, power_on = false);
    	}

    	function clockcore_current_time_binding(value) {
    		time = value;
    		$$invalidate(0, time);
    	}

    	function clockcore_power_on_binding(value) {
    		power_on = value;
    		$$invalidate(1, power_on);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 1) {
    			$$invalidate(2, display = format(time));
    		}
    	};

    	return [
    		time,
    		power_on,
    		display,
    		start,
    		stop,
    		clockcore_current_time_binding,
    		clockcore_power_on_binding
    	];
    }

    class Clock extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-g1qua3-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/components/Timer.svelte generated by Svelte v3.38.2 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-il4pte-style";
    	style.textContent = ".container.svelte-il4pte{display:flex;align-items:center;flex-direction:column;position:relative;margin:1rem;padding:1rem;border-radius:1rem;border:4px solid #ff4400;background-color:#ffffff}.title.svelte-il4pte{top:0;left:0;margin:0;font-size:1.2rem;padding-right:5px;border-top-left-radius:5px;border-bottom-right-radius:5px;font-weight:bold;position:absolute;color:#ffffff;background-color:#ff4400;text-shadow:1px 1px rgb(0 0 0 / 40%)}.time.container.svelte-il4pte{border-color:#0044ff}.time.title.svelte-il4pte{background-color:#0044ff}.power_on.container.svelte-il4pte{border-color:#44ff00}.power_on.title.svelte-il4pte{background-color:#44ff00}.buttonContainer.svelte-il4pte{display:flex;justify-content:center}.number.svelte-il4pte{font-size:3rem;font-weight:bold}";
    	append(document.head, style);
    }

    // (23:12) <Button handleClick={start}>
    function create_default_slot_3$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Start");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (24:12) <Button handleClick={stop}>
    function create_default_slot_2$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Stop");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (25:12) <Button handleClick={reset}>
    function create_default_slot_1$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Reset");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (18:0) <TimerCore bind:remaining_time={time} bind:power_on={power_on}>
    function create_default_slot$1(ctx) {
    	let div1;
    	let p0;
    	let t1;
    	let p1;
    	let t2;
    	let t3;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let t5;
    	let button2;
    	let current;

    	button0 = new Button({
    			props: {
    				handleClick: /*start*/ ctx[3],
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	button1 = new Button({
    			props: {
    				handleClick: /*stop*/ ctx[4],
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	button2 = new Button({
    			props: {
    				handleClick: /*reset*/ ctx[5],
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Timer";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(/*display*/ ctx[2]);
    			t3 = space();
    			div0 = element("div");
    			create_component(button0.$$.fragment);
    			t4 = space();
    			create_component(button1.$$.fragment);
    			t5 = space();
    			create_component(button2.$$.fragment);
    			attr(p0, "class", "title svelte-il4pte");
    			toggle_class(p0, "time", /*time*/ ctx[0]);
    			toggle_class(p0, "power_on", /*power_on*/ ctx[1]);
    			attr(p1, "class", "number svelte-il4pte");
    			attr(div0, "class", "buttonContainer svelte-il4pte");
    			attr(div1, "class", "container svelte-il4pte");
    			toggle_class(div1, "time", /*time*/ ctx[0]);
    			toggle_class(div1, "power_on", /*power_on*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, p0);
    			append(div1, t1);
    			append(div1, p1);
    			append(p1, t2);
    			append(div1, t3);
    			append(div1, div0);
    			mount_component(button0, div0, null);
    			append(div0, t4);
    			mount_component(button1, div0, null);
    			append(div0, t5);
    			mount_component(button2, div0, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*time*/ 1) {
    				toggle_class(p0, "time", /*time*/ ctx[0]);
    			}

    			if (dirty & /*power_on*/ 2) {
    				toggle_class(p0, "power_on", /*power_on*/ ctx[1]);
    			}

    			if (!current || dirty & /*display*/ 4) set_data(t2, /*display*/ ctx[2]);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);

    			if (dirty & /*time*/ 1) {
    				toggle_class(div1, "time", /*time*/ ctx[0]);
    			}

    			if (dirty & /*power_on*/ 2) {
    				toggle_class(div1, "power_on", /*power_on*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(button0);
    			destroy_component(button1);
    			destroy_component(button2);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let timercore;
    	let updating_remaining_time;
    	let updating_power_on;
    	let current;

    	function timercore_remaining_time_binding(value) {
    		/*timercore_remaining_time_binding*/ ctx[6](value);
    	}

    	function timercore_power_on_binding(value) {
    		/*timercore_power_on_binding*/ ctx[7](value);
    	}

    	let timercore_props = {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	if (/*time*/ ctx[0] !== void 0) {
    		timercore_props.remaining_time = /*time*/ ctx[0];
    	}

    	if (/*power_on*/ ctx[1] !== void 0) {
    		timercore_props.power_on = /*power_on*/ ctx[1];
    	}

    	timercore = new TimerCore({ props: timercore_props });
    	binding_callbacks.push(() => bind(timercore, "remaining_time", timercore_remaining_time_binding));
    	binding_callbacks.push(() => bind(timercore, "power_on", timercore_power_on_binding));

    	return {
    		c() {
    			create_component(timercore.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(timercore, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const timercore_changes = {};

    			if (dirty & /*$$scope, time, power_on, display*/ 263) {
    				timercore_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_remaining_time && dirty & /*time*/ 1) {
    				updating_remaining_time = true;
    				timercore_changes.remaining_time = /*time*/ ctx[0];
    				add_flush_callback(() => updating_remaining_time = false);
    			}

    			if (!updating_power_on && dirty & /*power_on*/ 2) {
    				updating_power_on = true;
    				timercore_changes.power_on = /*power_on*/ ctx[1];
    				add_flush_callback(() => updating_power_on = false);
    			}

    			timercore.$set(timercore_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(timercore.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(timercore.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(timercore, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let display;
    	let time = 10000;
    	let power_on = false;

    	function start() {
    		$$invalidate(1, power_on = true);
    	}

    	function stop() {
    		$$invalidate(1, power_on = false);
    	}

    	function reset() {
    		$$invalidate(0, time = (Math.floor(Math.random() * 30) + 1) * 1000);
    	}

    	function timercore_remaining_time_binding(value) {
    		time = value;
    		$$invalidate(0, time);
    	}

    	function timercore_power_on_binding(value) {
    		power_on = value;
    		$$invalidate(1, power_on);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 1) {
    			//$: display = Math.ceil(time/1000);
    			$$invalidate(2, display = (time / 1000).toFixed(2));
    		}
    	};

    	return [
    		time,
    		power_on,
    		display,
    		start,
    		stop,
    		reset,
    		timercore_remaining_time_binding,
    		timercore_power_on_binding
    	];
    }

    class Timer extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-il4pte-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/components/Stopwatch.svelte generated by Svelte v3.38.2 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1gx3cfm-style";
    	style.textContent = ".container.svelte-1gx3cfm{display:flex;align-items:center;flex-direction:column;position:relative;margin:1rem;padding:1rem;border-radius:1rem;border:4px solid #0044ff;background-color:#ffffff}.title.svelte-1gx3cfm{top:0;left:0;margin:0;font-size:1.2rem;padding-right:5px;border-top-left-radius:5px;border-bottom-right-radius:5px;font-weight:bold;position:absolute;color:#ffffff;background-color:#0044ff;text-shadow:1px 1px rgb(0 0 0 / 40%)}.time.container.svelte-1gx3cfm{border-color:#ff4400}.time.title.svelte-1gx3cfm{background-color:#ff4400}.power_on.container.svelte-1gx3cfm{border-color:#44ff00}.power_on.title.svelte-1gx3cfm{background-color:#44ff00}.buttonContainer.svelte-1gx3cfm{display:flex;justify-content:center}.number.svelte-1gx3cfm{font-size:3rem;font-weight:bold}";
    	append(document.head, style);
    }

    // (23:12) <Button handleClick={start}>
    function create_default_slot_3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Start");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (24:12) <Button handleClick={stop}>
    function create_default_slot_2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Stop");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (25:12) <Button handleClick={reset}>
    function create_default_slot_1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Reset");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (18:0) <StopwatchCore bind:elapsed_time={time} bind:power_on={power_on}>
    function create_default_slot(ctx) {
    	let div1;
    	let p0;
    	let t1;
    	let p1;
    	let t2;
    	let t3;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let t5;
    	let button2;
    	let current;

    	button0 = new Button({
    			props: {
    				handleClick: /*start*/ ctx[3],
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	button1 = new Button({
    			props: {
    				handleClick: /*stop*/ ctx[4],
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	button2 = new Button({
    			props: {
    				handleClick: /*reset*/ ctx[5],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Stopwatch";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(/*display*/ ctx[2]);
    			t3 = space();
    			div0 = element("div");
    			create_component(button0.$$.fragment);
    			t4 = space();
    			create_component(button1.$$.fragment);
    			t5 = space();
    			create_component(button2.$$.fragment);
    			attr(p0, "class", "title svelte-1gx3cfm");
    			toggle_class(p0, "time", /*time*/ ctx[0]);
    			toggle_class(p0, "power_on", /*power_on*/ ctx[1]);
    			attr(p1, "class", "number svelte-1gx3cfm");
    			attr(div0, "class", "buttonContainer svelte-1gx3cfm");
    			attr(div1, "class", "container svelte-1gx3cfm");
    			toggle_class(div1, "time", /*time*/ ctx[0]);
    			toggle_class(div1, "power_on", /*power_on*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, p0);
    			append(div1, t1);
    			append(div1, p1);
    			append(p1, t2);
    			append(div1, t3);
    			append(div1, div0);
    			mount_component(button0, div0, null);
    			append(div0, t4);
    			mount_component(button1, div0, null);
    			append(div0, t5);
    			mount_component(button2, div0, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*time*/ 1) {
    				toggle_class(p0, "time", /*time*/ ctx[0]);
    			}

    			if (dirty & /*power_on*/ 2) {
    				toggle_class(p0, "power_on", /*power_on*/ ctx[1]);
    			}

    			if (!current || dirty & /*display*/ 4) set_data(t2, /*display*/ ctx[2]);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);

    			if (dirty & /*time*/ 1) {
    				toggle_class(div1, "time", /*time*/ ctx[0]);
    			}

    			if (dirty & /*power_on*/ 2) {
    				toggle_class(div1, "power_on", /*power_on*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(button0);
    			destroy_component(button1);
    			destroy_component(button2);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let stopwatchcore;
    	let updating_elapsed_time;
    	let updating_power_on;
    	let current;

    	function stopwatchcore_elapsed_time_binding(value) {
    		/*stopwatchcore_elapsed_time_binding*/ ctx[6](value);
    	}

    	function stopwatchcore_power_on_binding(value) {
    		/*stopwatchcore_power_on_binding*/ ctx[7](value);
    	}

    	let stopwatchcore_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*time*/ ctx[0] !== void 0) {
    		stopwatchcore_props.elapsed_time = /*time*/ ctx[0];
    	}

    	if (/*power_on*/ ctx[1] !== void 0) {
    		stopwatchcore_props.power_on = /*power_on*/ ctx[1];
    	}

    	stopwatchcore = new StopwatchCore({ props: stopwatchcore_props });
    	binding_callbacks.push(() => bind(stopwatchcore, "elapsed_time", stopwatchcore_elapsed_time_binding));
    	binding_callbacks.push(() => bind(stopwatchcore, "power_on", stopwatchcore_power_on_binding));

    	return {
    		c() {
    			create_component(stopwatchcore.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(stopwatchcore, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const stopwatchcore_changes = {};

    			if (dirty & /*$$scope, time, power_on, display*/ 263) {
    				stopwatchcore_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_elapsed_time && dirty & /*time*/ 1) {
    				updating_elapsed_time = true;
    				stopwatchcore_changes.elapsed_time = /*time*/ ctx[0];
    				add_flush_callback(() => updating_elapsed_time = false);
    			}

    			if (!updating_power_on && dirty & /*power_on*/ 2) {
    				updating_power_on = true;
    				stopwatchcore_changes.power_on = /*power_on*/ ctx[1];
    				add_flush_callback(() => updating_power_on = false);
    			}

    			stopwatchcore.$set(stopwatchcore_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(stopwatchcore.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(stopwatchcore.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(stopwatchcore, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let display;
    	let time = 0;
    	let power_on = false;

    	function start() {
    		$$invalidate(1, power_on = true);
    	}

    	function stop() {
    		$$invalidate(1, power_on = false);
    	}

    	function reset() {
    		$$invalidate(0, time = 0);
    	}

    	function stopwatchcore_elapsed_time_binding(value) {
    		time = value;
    		$$invalidate(0, time);
    	}

    	function stopwatchcore_power_on_binding(value) {
    		power_on = value;
    		$$invalidate(1, power_on);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 1) {
    			//$: display = Math.floor(time/1000);
    			$$invalidate(2, display = (time / 1000).toFixed(2));
    		}
    	};

    	return [
    		time,
    		power_on,
    		display,
    		start,
    		stop,
    		reset,
    		stopwatchcore_elapsed_time_binding,
    		stopwatchcore_power_on_binding
    	];
    }

    class Stopwatch extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1gx3cfm-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    exports.Clock = Clock;
    exports.ClockCore = ClockCore;
    exports.Stopwatch = Stopwatch;
    exports.StopwatchCore = StopwatchCore;
    exports.Timer = Timer;
    exports.TimerCore = TimerCore;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
