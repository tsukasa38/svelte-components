import { SvelteComponentTyped } from 'svelte';

export interface TimerProps {
    power_on: boolean;
    remaining_time: number;
}

export default class Timer extends SvelteComponentTyped<TimerProps> {}