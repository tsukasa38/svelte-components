<script lang="ts">
	import Clock from './components/Clock.svelte';
	import Timer from './components/Timer.svelte';
	import Stopwatch from './components/Stopwatch.svelte';
</script>

<main>
	<Stopwatch />
	<Clock />
	<Timer />
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow-x: hidden;
		background-color: #f3f3f3;
	}
	main {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
	}
</style>