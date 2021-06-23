<script lang="ts">
    export let handleClick: () => void;
</script>

<button on:click={handleClick}>
    <slot></slot>
</button>

<style>
    button {
        margin: 3px;
        padding: 12px;
        border: none;
        outline: none;
        color: white;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1rem;
        border-radius: 4px;
        background-color: dodgerblue;
        box-shadow: 1px 1px 1px 1px #dddddd;
    }
    button:active {
        box-shadow: none;
    }
</style>