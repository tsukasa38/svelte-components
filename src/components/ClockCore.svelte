<script lang="ts">
    import { onDestroy } from "svelte";

	let frame: number;
	let active: boolean;

	export let current_time: number = 0;
	export let power_on: boolean = false;

    const start_time: number = window.performance.timeOrigin;

	$: active = power_on ? startClock() : stopClock();

	function runClock(): void {
		frame = requestAnimationFrame(runClock);
		current_time = start_time + window.performance.now();
	}

	function startClock(): boolean {
		runClock();
		return true;
	}

	function stopClock(): boolean {
		cancelAnimationFrame(frame);
		return false;
	}

	onDestroy(() => {
		if (active) {
			cancelAnimationFrame(frame);
		}
	});
</script>

<slot></slot>