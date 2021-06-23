<script lang="ts">
    import ClockCore from "./ClockCore.svelte";
    import Button from "./Button.svelte";

    let time: number;
    let power_on: boolean;

    $: display = format(time);

    function start(): void {
        power_on = true;
    }

    function stop(): void {
        power_on = false;
    }

    function format(time: number): string {
        const now: Date = new Date(time);
        const hours: number = now.getHours();
        const minutes: number = now.getMinutes();
        const seconds: number = now.getSeconds();
        const display_hours: string = `00${hours}`.slice(-2);
        const display_minutes: string = `00${minutes}`.slice(-2);
        const display_seconds: string = `00${seconds}`.slice(-2);
        return `${display_hours}:${display_minutes}:${display_seconds}`;
    }
</script>

<ClockCore bind:current_time={time} bind:power_on={power_on}>
    <div class="container" class:power_on>
        <p class="title" class:power_on>Clock</p>
        <p class="number">{display}</p>
        <div class="buttonContainer">
            <Button handleClick={start}>Start</Button>
            <Button handleClick={stop}>Stop</Button>
        </div>
    </div>
</ClockCore>

<style>
    .container {
        display: flex;
        align-items: center;
        flex-direction: column;
        position: relative;
        margin: 1rem;
        padding: 1rem;
        border-radius: 1rem;
        border: 4px solid #ff4400;
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
        background-color: #ff4400;
        text-shadow: 1px 1px rgb(0 0 0 / 40%);
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