import { SvelteComponentTyped } from 'svelte';

export interface TimerCoreProps {
    power_on: boolean;
    remaining_time: number;
}

export default class TimerCore extends SvelteComponentTyped<TimerCoreProps> {}