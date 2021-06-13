import { SvelteComponentTyped } from 'svelte';

export interface StopwatchCoreProps {
    power_on: boolean;
    current_time: number;
}

export default class StopwatchCore extends SvelteComponentTyped<StopwatchCoreProps> {}