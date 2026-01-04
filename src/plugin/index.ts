import type {App} from "vue";

import {setup as pinia} from "./pinia"

const modules = [pinia]

export default function (app: App) {
    modules.map((setup) => setup(app))
}
