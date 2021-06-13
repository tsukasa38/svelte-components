<script lang="ts">
    import { StopwatchCore } from "../../..";
    import Button from "./Button.svelte";

    let time: number = 0;
    let power_on: boolean = false;

    //$: display = Math.floor(time/1000);
    $: display = (time/1000).toFixed(2);

    function start(): void {
        power_on = true;
    }

    function stop(): void {
        power_on = false;
    }

    function reset(): void {
        time = 0;
    }
</script>

<StopwatchCore bind:elapsed_time={time} bind:power_on={power_on}>
    <div class="container" class:time class:power_on>
        <p class="title" class:time class:power_on>Stopwatch</p>
        <p class="number">{display}</p>
        <div class="buttonContainer">
            <Button handleClick={start}>Start</Button>
            <Button handleClick={stop}>Stop</Button>
            <Button handleClick={reset}>Reset</Button>
        </div>
    </div>
</StopwatchCore>

<style>
    .container {
        display: flex;
        align-items: center;
        flex-direction: column;
        position: relative;
        margin: 1rem;
        padding: 1rem;
        border-radius: 1rem;
        border: 4px solid #0044ff;
        background-color: #ffffff;
    }
    .title {
        top: 0;
        left: 0;
        margin: 0;
        font-size: 1.2rem;
        padding-right: 5px;
        border-top-left-radius: 5px;
        border-bottom-right-radius: 5px;
        font-weight: bold;
        position: absolute;
        color: #ffffff;
        background-color: #0044ff;
        text-shadow: 1px 1px rgb(0 0 0 / 40%);
    }
    .time.container {
        border-color: #ff4400;
    }
    .time.title {
        background-color: #ff4400;
    }
    .power_on.container {
        border-color: #44ff00;
    }
    .power_on.title {
        background-color: #44ff00;
    }
    .buttonContainer {
        display: flex;
        justify-content: center;
    }
    .number {
        font-size: 3rem;
        font-weight: bold;
    }
</style>