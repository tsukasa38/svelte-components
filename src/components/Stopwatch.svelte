<script lang="ts">
	import { onDestroy } from "svelte";

	let frame: number;
	let active: boolean;
	let last_time: number;

	export let elapsed_time: number = 0;
	export let power_on: boolean = false;

	$: active = power_on ? startStopwatch() : stopStopwatch();

	function runStopwatch(): void {
		frame = requestAnimationFrame(runStopwatch);
		const time: number = window.performance.now();
		elapsed_time += time - last_time;
		last_time = time;
	}

	function startStopwatch(): boolean {
		last_time = window.performance.now();
		runStopwatch();
		return true;
	}

	function stopStopwatch(): boolean {
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