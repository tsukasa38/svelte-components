import { SvelteComponentTyped } from 'svelte';

export interface StopwatchProps {
    power_on: boolean;
    current_time: number;
}

export default class Stopwatch extends SvelteComponentTyped<StopwatchProps> {}