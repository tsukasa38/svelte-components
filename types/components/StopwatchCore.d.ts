import { SvelteComponentTyped } from 'svelte';

export interface StopwatchCoreProps {
    power_on: boolean;
    elapsed_time: number;
}

export default class StopwatchCore extends SvelteComponentTyped<StopwatchCoreProps> {}