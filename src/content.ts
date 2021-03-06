import * as flyd from "flyd"
import produce from "immer"
import * as m from 'mithril'
import TriInput from "~/components/input"

import {KeyseqState, keyseqActions, KeyseqInitial} from '~/keyseq/state';

/*
 * Meiosis demo in typescript with immutable state.
 *
 * Patchinko was considered, but the type definitions aren't as good.
 *
 * Immutable.js was originally used, but the type checking for deep edits isn't
 * as good as for immer.
 *
 * The actions are a bit verbose, but less so than redux and we could write
 * some helpers or adapt something like patchinko to make it less so.
 */

/**** TYPES ****/

type ModeType = 'normal' | 'ignore'
export type ContentAttrs = {
    model: ContentState,
    actions: ContentActions
}

// KeySeq and Mode states could trivially be moved elsewhere if that becomes useful.

// Readonly is not recursive, but that's OK
export type ContentState = Readonly<{
    keyseq: KeyseqState,
    mode: {
        current: ModeType
        previous?: ModeType
    },
    uiframe: {
        visible: boolean,
        commandline: {
            text: string
        }
    },
}>

const initial: ContentState = {
    keyseq: KeyseqInitial,
    mode: {
        current: 'normal',
    },
    uiframe: {
        visible: false,
        commandline: {
            text: '',
        }
    },
}

export type Updater = (model: ContentState) => ContentState

export type Updates = flyd.Stream<Updater>
export type Models = flyd.Stream<ContentState>

export type Action = (...args: any[]) => Updates
export type Actions = {
    [key: string]: Action
}

/**** Actions ****/

// Helper functions to make using produce a bit less frustrating.
export type Mutator = (model: ContentState) => void
export const mutator = (updates: Updates, fn: Mutator) =>
    updates(model => produce(model, fn))

const createActions = (updates: Updates) => ({ // : { [key: string]: Actions } => ({
    mode: modeActions(updates),
    keyseq: keyseqActions(updates),
    uiframe: {
        oninput: (val: string) => mutator(updates, ({uiframe}) => { uiframe.commandline.text = val }),
        setvisible: (b: boolean) => mutator(updates, ({uiframe}) => {uiframe.visible = b}),
    }
})

// Imagine these are bigger and maybe imported from different files.
const modeActions = (updates: Updates): Actions => ({
    change_mode: (newmode: ModeType) =>
        mutator(updates,
                ({mode}) => { mode.current = newmode })
})

// If we ever need state/actions that require a dynamic key in the state object.
// const moveableActions = (updates: Updates, id: keyof State) => ({
//     someaction: () => updates(model =>
//      produce(model, ({[id]}) => void (id.foo = 1)))
// })


/**** Meiosis setup ****/

const updates: Updates = flyd.stream()
const models: Models = flyd.scan((state: ContentState, fn: Updater) => fn(state), initial, updates)

const actions = createActions(updates)

export type ContentActions = typeof actions

// Views

models.map(m => console.log(m.uiframe, m.mode, m.keyseq))
models.map(m => console.log(m.keyseq.keys))
models.map(_ => m.redraw())

// Listeners

addEventListener("keydown", (ke: KeyboardEvent) => actions.keyseq.keydown(ke.key))
addEventListener("keydown", (ke: KeyboardEvent) =>
    ke.key === 't' && (document.location.href = browser.runtime.getURL('test.html')))

// RPC

// TODO:
// Combine RPC funcs from other files (namespaced)

import * as rpc from '~rpc'

export const rpcexports = {
    stat: async () => models().mode.current,
    nada: async () => 42,
    err: () => { throw Error('hi there') },
}

browser.runtime.onMessage.addListener(rpc.onMessage(rpcexports))

addEventListener('keydown', ke =>
    ke.key === 'x' && rpc.rpc('background').nada())

addEventListener('keydown', ke =>
    ke.key === 'c' && rpc.rpc('background').submod.val(1))

Object.assign((window as any), {
    rpc,
})

// Iframe experiments

import Iframe from '~/components/iframe'

const App = {
    view: (vnode) => {
        const { model, actions } = vnode.attrs as ContentAttrs
        return [
            model.uiframe.visible && m(Iframe, [
                m("head", [
                    m("title", "Tridactyl Commandline"),
                    m("link", { href: "static/css/commandline.css", rel: "stylesheet" })
                ]),
                m("body", [
                    m('div', model.keyseq.keys.join(", ")),
                    m(TriInput, vnode.attrs)
                ])
            ])
        ]
    }
}

addEventListener("keydown", (ke: KeyboardEvent) => {
    if (ke.key === 'o') {
        const root = document.createElement('div')
        document.documentElement.appendChild(root)

        m.mount(root, {
            view: () => m(App, { model: models(), actions })
        })

        actions.uiframe.setvisible(true)

        Object.assign((window as any), {
            m,
            root,
        })
    }
})
