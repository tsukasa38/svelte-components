import svelte from 'rollup-plugin-svelte';
import autoPreprocess from 'svelte-preprocess';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

const { name } = pkg;

export default {
    input: 'src/index.js',
    output: [
        {
            file: pkg.module,
            format: 'es',
            sourcemap: true,
            name
        },{
            file: pkg.main,
            format: 'umd',
            sourcemap: true,
            name
        }
    ],
    plugins: [
        svelte({
            preprocess: autoPreprocess()
        }),
        resolve(),
        commonjs(),
        typescript()
    ]
}